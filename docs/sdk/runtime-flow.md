# Captar SDK runtime flow

This document describes the TypeScript SDK execution path as implemented in the repository and records where the current behavior is a strict guarantee, a best-effort behavior, or a known limitation.

It is intentionally implementation-oriented. For the audit status of each source function, see [`code-audit.md`](./code-audit.md). For executable verification, see [`testing.md`](./testing.md). For invariants and guarantees, see [`runtime-invariants.md`](./runtime-invariants.md).

## Runtime boundary

Captar is an in-process runtime-control layer. The wrapped application still owns and configures its provider client. Captar does not require provider API keys to pass through a Captar gateway.

The current TypeScript runtime controls two execution surfaces:

1. OpenAI-compatible `responses.create(...)` and `chat.completions.create(...)` calls.
2. Application tools wrapped with `captar.trackTool(...)`.

The hosted platform is used for policy synchronization and telemetry ingestion when configured. Local budget accounting remains in the SDK process.

## Top-level object graph

```text
createCaptar(options)
│
├── EventBus
├── Exporter
├── PricingRegistry
│
├── startSession(...)
│   └── RuntimeSession
│       ├── BudgetEngine
│       ├── effective SessionPolicy
│       ├── request/tool counters
│       └── trace/session identity
│
├── wrapOpenAI(client, { session, ... })
│   ├── merged wrapper policy
│   ├── PolicyEngine
│   ├── BudgetPlanner
│   └── OpenAIAdapter per intercepted request
│
└── trackTool(name, options)
    └── tracked tool runner
```

The current implementation creates some stateful `PolicyEngine` instances at wrapper/tool-handle scope. That is a known session-scope defect tracked by #172.

## 1. `createCaptar(options)`

Construction performs three important operations.

### Exporter selection

`createExporter()` resolves telemetry in this order:

1. explicit `options.exporter` custom exporter;
2. explicit HTTP exporter options;
3. `CAPTAR_INGEST_URL` / `CAPTAR_INGEST_API_KEY` environment configuration;
4. no-op exporter.

`CAPTAR_TIMEOUT_MS` is parsed by the config package but is not currently wired into the effective call policy. See #187.

### Pricing registry construction

`PricingRegistry` is initialized from either the built-in OpenAI pricing snapshot or caller-supplied pricing, then pricing overrides are applied.

After #183, pricing entries are validated as finite/non-negative, and a brand-new pricing override must provide both input and output prices. Unknown provider/model pairs fail closed in the request planner.

The built-in OpenAI snapshot is still stale relative to current models. See #181.

### Event bus construction

A single `EventBus` belongs to the Captar instance. `captar.onEvent(listener)` subscribes to runtime events emitted by sessions created from that instance.

Listener/exporter failures are currently awaited on the request path and are therefore not fully isolated from inference. See #176.

## 2. `startSession(options)`

A session establishes the accounting and trace boundary for subsequent LLM/tool execution.

Current flow:

```text
startSession(sessionOptions)
  ↓
fetch remote hook policy when controlPlane.syncPolicy=true
  ↓
merge policy layers
  ↓
merge sessionOptions.budget into runtime budget
  ↓
construct RuntimeSession
  ↓
emit session.started
  ↓
return CaptarSession
```

### Current policy precedence

The current shallow merge order is:

```text
defaultSessionPolicy
→ createCaptar.defaultPolicy
→ control-plane policy
→ startSession.policy
→ wrapOpenAI.policy (for wrapped LLM calls)
```

`startSession.budget` is overlaid onto the session budget after policy merging.

This means local layers can currently loosen remote/admin policy. The intended governance semantics are unresolved and tracked by #180.

### Control-plane synchronization

When `controlPlane.syncPolicy` is enabled, session creation waits for the policy HTTP request. A failed/non-2xx policy fetch currently prevents session creation. There is no last-known-policy cache or explicit required/cached/best-effort mode. See #187.

The hook response also contains `payloadRetention`, but the SDK currently discards that field when synchronizing policy. See #182.

## 3. `RuntimeSession`

`RuntimeSession` owns:

- session ID and trace root;
- effective budget;
- effective session policy;
- `BudgetEngine`;
- request-count/concurrency state;
- cumulative summary counters;
- event/export references.

The session span begins when `session.started` is emitted.

`session.close()` emits `session.closed` and flushes the exporter. At present, closing a session does not prevent later work and does not define behavior for already-active work. See #185.

## 4. Wrapped LLM call — preflight

A call to an intercepted `responses.create` or `chat.completions.create` currently follows this sequence:

```text
wrapped create(request)
  ↓
create request ID + request span
  ↓
emit request.started
  ↓
BudgetPlanner.plan(...)
  ↓
PolicyEngine.evaluateCall(...)
  ↓
RuntimeSession.acquireRequestSlot(...)
  ↓
emit request.allowed
  ↓
BudgetEngine.reserve(estimated cost)
  ↓
emit estimate.reserved
  ↓
OpenAIAdapter.execute(...)
```

### Important ordering consequence

`request.started` is emitted before pricing/policy validation. It currently contains the raw request object. This means even a blocked request can be visible to listeners/export transport before access/budget rejection. Payload-minimization semantics are tracked by #182.

### Budget planner

`BudgetPlanner` currently:

1. resolves provider/model pricing;
2. estimates billable input from `request.input` or `request.messages`;
3. subtracts protected finalization reserve from remaining budget;
4. calculates remaining output USD;
5. converts remaining output USD into a maximum output-token count;
6. takes the minimum of caller limit, policy limit and affordable limit;
7. patches the outgoing request with that limit;
8. returns the planned maximum cost for reservation.

Known limits:

- input estimation currently ignores token-bearing fields such as Responses `instructions`, tool schemas and structured-output schemas (#178);
- Chat Completions currently uses legacy `max_tokens` instead of correctly handling `max_completion_tokens` (#175);
- provider-hosted paid tools/non-token charges are not reserved (#189);
- price structures that depend on context tier, region, service tier or other conditions are not modeled by the simple flat pricing entry (#181/#189).

### Policy evaluation

`PolicyEngine.evaluateCall()` checks:

- model allowlist;
- model blocklist;
- maximum estimated call cost;
- output-token policy check currently tied to specific request fields;
- retry-count helper;
- repeated-call fingerprint threshold.

The repeated-call tracker is currently wrapper-local and its fingerprint is lossy/incomplete. See #172 and #190.

### Request slot

`RuntimeSession.acquireRequestSlot()` enforces:

- `maxCallsPerSession`;
- `maxConcurrentCalls`.

The slot increments logical request count and active request count before provider execution and returns an idempotent release function.

Parallel budget safety relies on synchronous reservation after planning: two calls may plan from similar state, but `BudgetEngine.reserve()` rechecks current remaining budget before admitting spend.

## 5. Provider execution

`OpenAIAdapter.execute()` validates that pricing exists and executes the original provider method under `withTimeout()`.

Current timeout behavior is a local `Promise.race`; it does not abort the underlying network request. The wrapper also drops the OpenAI SDK's second per-request options argument. See #173.

The current wrapper is built with object spread rather than a prototype-preserving proxy, which can remove non-`create` OpenAI resource methods at runtime. See #184.

## 6. Non-streaming reconciliation

On a normal response:

```text
provider response
  ↓
OpenAIAdapter.extractUsage(response)
  ↓
normalize input/output/cached tokens
  ↓
prefer provider usage.cost when present
  ↓
otherwise calculate local token cost
  ↓
BudgetEngine.commit(reserved, actual)
  ↓
emit provider.response
  ↓
emit spend.committed
  ↓
if overrun: emit guardrail.violation(category=spend)
  ↓
release request concurrency slot
  ↓
return original response
```

After #183, official nested cached-token detail fields are understood for non-streaming usage, cached tokens replace normal-priced tokens instead of being double charged, and missing cache-specific pricing falls back to normal input pricing.

Provider-reported `usage.cost` is treated as authoritative when it is a valid non-negative finite number.

If actual spend exceeds the reservation or hard budget, Captar does not clamp away the provider truth. It commits the actual amount, allows remaining budget to go negative, and emits an explicit spend violation.

Internal USD precision is still rounded at micro-dollar granularity before accumulation. Repeated sub-micro charges can be lost. See #188.

## 7. Streaming reconciliation

When `request.stream` is true and the response is async iterable, Captar returns its own async iterable wrapper and keeps the request slot until iteration finishes/cancels.

Current flow:

```text
provider async iterable
  ↓
for each chunk:
  if chunk.usage exists, collect it
  yield chunk to caller
  ↓
stream completes
  ↓
aggregate collected usage
  ↓
commit actual/fallback estimated cost
  ↓
emit provider.response + spend.committed
  ↓
release request slot
```

Known limitations are significant and tracked by #174:

- Chat Completions usage is not guaranteed unless `stream_options.include_usage` is requested;
- Responses raw streams expose terminal usage through completed-response events rather than necessarily `chunk.usage`;
- early cancellation may never receive provider usage;
- cancellation currently commits the reserved estimate as if it were actual spend;
- the emitted `response` for a stream is the stream object itself, which is not a safe telemetry payload.

Until #174 is resolved, streaming postflight cost should be treated as **best effort**, not universally authoritative provider spend.

## 8. Failure/block path

Errors are classified as blocked when they are `PolicyViolationError` or `BudgetExceededError`; everything else is treated as failed.

For a blocked/failed LLM call:

1. any active reservation is reconciled back to zero actual in the outer catch;
2. blocked attempts increment `blockedCount`;
3. `request.blocked` or `request.failed` is emitted;
4. configured callback is invoked for budget/policy blocks;
5. request slot is released unless the stream wrapper owns it;
6. the original error is rethrown.

Timeout currently falls into the generic failure path even though the underlying provider request may still be alive (#173).

The public callback field named `sessionId` currently receives the trace ID rather than `session.id`; tool blocks do not share the same callback behavior. See #186.

## 9. Tracked tool flow

`captar.trackTool(name, options)` returns a handle with `run(work)`.

Current flow:

```text
create tool span
  ↓
merge session tool policy + per-tool policy
  ↓
PolicyEngine.evaluateTool
  ↓
optional approval callback/value
  ↓
mark tool call
  ↓
resolve estimated cost
  ↓
reserve estimated cost
  ↓
emit estimate.reserved + tool.started
  ↓
execute work()
  ↓
resolve actual cost
  ↓
commit/reconcile
  ↓
emit tool.completed + spend.committed
```

On work/actual/reconciliation errors, reservation is released as applicable and `tool.failed` is emitted.

Known issues:

- tool call counters are currently attached to a newly created `PolicyEngine` per handle and therefore are not truly session-wide (#172);
- `maxCallsPerSession` is implemented through a map keyed by tool name, so current behavior is closer to per-tool-name than total-session count (#172);
- approval and estimate callback exceptions occur outside the primary tool try/catch and can miss terminal events (#186);
- budget rejection is reported through the generic tool failure path rather than a uniform blocked guardrail event (#186);
- tool policy merging can loosen remote policy (#180).

## 10. Telemetry path

Every `RuntimeSession.emit()`:

1. builds a stable event envelope;
2. awaits all event-bus listeners;
3. enqueues to the HTTP exporter or calls a custom exporter directly.

HTTP export batches events and serializes them as JSON.

Known issues (#176):

- throwing listeners/exporters can currently change inference behavior;
- an HTTP transport exception can lose a batch after it has been removed from the queue;
- non-retryable HTTP failures can drop data without a first-class error channel;
- arbitrary raw request/response/stream values may not be JSON-safe.

## 11. Hosted ingest path

With the Captar platform exporter:

```text
SDK event batch
  ↓
POST /api/ingest
  ↓
lookup hook + active policy
  ↓
upsert session/trace/span/event/ledger records
  ↓
extract prompt/response content
  ↓
apply server-side payload retention/redaction
  ↓
persist normalized payload records
```

The platform does apply retention/redaction before prompt/response payload storage. The unresolved #182 concern is that raw payloads can already have traversed listeners/network transport before server-side storage retention is applied.

## 12. Guarantee vocabulary

Use these terms consistently in code/docs/UI:

| Guarantee | Meaning |
| --- | --- |
| **Preflight block** | Captar can reject before invoking the provider. |
| **Provider parameter cap** | Captar constrains a provider-supported request parameter such as an output-token limit. |
| **Runtime local limit** | Captar blocks based on in-process session state such as call/concurrency count. |
| **Postflight authoritative** | Provider returned sufficient usage/cost to reconcile actual spend. |
| **Postflight estimated** | Provider did not return authoritative usage; Captar used local estimation. |
| **Unresolved spend** | Execution may have incurred provider cost but final usage is unavailable, e.g. cancellation/timeout. |

The current event schema does not yet carry an explicit cost-confidence/source field. #174 and #189 require that distinction before all displayed spend can be described as authoritative.

## 13. Production boundary

This audit does not open the production deployment gate. Vercel automatic Git deployment remains disabled for platform and marketing. Real provider production validation remains governed by issue #126 and `docs/production-smoke-gate.md`.
