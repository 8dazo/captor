# Captar SDK testing and debugging guide

This document is the executable verification plan for audit tracker #171. It defines what must be tested, how failures are classified, how to reproduce known defects, and what evidence is required before a runtime-control change is merged.

The production provider smoke is intentionally outside this guide; see #126 and `docs/production-smoke-gate.md`.

## 1. Required CI gates for every SDK runtime PR

A runtime PR is not mergeable until all of the following are green:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm test
pnpm --filter captar build
# repository CI also runs the clean external package-install smoke
```

For changes in `@captar/config`, `@captar/types` or `@captar/utils`, their package tests/builds are part of the root Turbo run because they directly affect the published SDK bundle.

Never merge by bypassing a failing SDK test merely because the marketing/platform build is green.

## 2. Test philosophy

Every guardrail test should answer four questions:

1. **Was the decision correct?** allowed, blocked, failed or completed.
2. **Was provider/tool user code invoked?** locally blockable failures must keep invocation count unchanged.
3. **Was accounting conserved?** reservation, committed, released and remaining state must match the documented invariant.
4. **Was lifecycle telemetry terminal and truthful?** exactly one correct terminal state, with authoritative vs estimated cost clearly represented when that distinction exists.

Mocks should be deterministic and credential-free. Real provider credentials belong only in the explicit production smoke gate.

## 3. Core budget engine matrix

Required cases for `BudgetEngine`:

| Case | Expected result |
| --- | --- |
| reserve below remaining | reservation increases exactly |
| reserve equal to remaining | accepted |
| reserve above remaining | `BudgetExceededError`, state unchanged |
| reserve negative | reject |
| reserve NaN/infinity | reject |
| protected final reserve | ordinary reserve cannot consume it |
| final reserve (`isFinal`) | can consume protected amount but never total max |
| commit actual < reserved | difference released |
| commit actual = reserved | zero release |
| commit actual > reserved | truthful commit + reservation overrun |
| commit above hard max | truthful commit + hard overrun |
| commit more reserved than exists | reject, state unchanged |
| repeated sub-micro charges | aggregate nonzero after #188 |
| unlimited budget | no artificial finite cap |
| invalid budget config | reject at policy compilation after #180 |

Property/conservation checks:

```text
current reserved >= 0
committed >= 0
released >= 0
accepted reserve <= modeled remaining at decision time
reserved after completed reconciliation == previous reserved - reconciled reservation
```

Do not test display-rounded values as internal accounting truth once #188 is fixed.

## 4. Budget planner matrix

Required cases:

- unknown provider/model pricing fails closed;
- finite vs unlimited budget;
- input cost exactly at boundary;
- input cost one unit over boundary;
- finalization reserve subtraction;
- caller limit lower than affordable limit is preserved;
- policy limit lower than caller/affordable limit wins;
- affordable limit lower than caller/policy wins;
- zero-priced output does not create divide-by-zero behavior;
- invalid/zero effective limit semantics are explicit;
- multibyte Unicode input estimator remains conservative;
- Responses `instructions` affects estimate after #178;
- tool/function schemas affect estimate after #178;
- structured response schemas affect estimate where billable after #178;
- transport-only fields do not incorrectly inflate token cost;
- hosted paid tool fees are reserved/fail-closed after #189;
- current Chat `max_completion_tokens` path after #175.

Every preflight-block test must assert provider invocation count is zero.

## 5. Pricing registry/accounting matrix

Implemented by #183 and future pricing-version work:

- complete base entry accepted;
- negative/NaN/infinite rate rejected;
- new partial override rejected;
- existing partial override accepted;
- cached-input price optional, but when absent cached tokens fall back to normal input price;
- top-level `cached_input_tokens` normalized;
- Responses nested `input_tokens_details.cached_tokens` normalized;
- Chat nested `prompt_tokens_details.cached_tokens` normalized;
- cached count cannot exceed total input for cost calculation;
- provider aggregate `usage.cost` overrides local token calculation when valid;
- missing usage falls back only with an explicit estimated-cost source;
- registry snapshot/version emitted after #181;
- current supported aliases resolve; unknown aliases remain fail-closed.

## 6. OpenAI wrapper compatibility matrix

This section should run against both small class-based mocks and, where possible without network access, an instantiated official OpenAI Node client.

### Method surface

After #184:

- original client prototype remains intact;
- untouched top-level client methods remain callable;
- `responses.stream`, `responses.cancel` and other resource methods remain callable;
- `chat.completions.parse`, `.stream`, `.runTools` remain callable with correct receiver;
- getters, symbols and non-enumerable resource properties survive wrapping;
- Captar intercepts only the intended request method(s);
- original client is not unexpectedly mutated.

### Request signature

After #173:

```ts
create(body, options?)
```

must preserve the second argument for Responses and Chat:

- `signal`;
- `timeout`;
- `maxRetries`;
- custom headers;
- other RequestOptions values.

Captar-specific metadata must never be injected into the provider request body unless the provider schema explicitly supports it.

### Output-limit fields

After #175:

- Responses: `max_output_tokens`;
- current Chat: `max_completion_tokens`;
- legacy/OpenAI-compatible providers: capability-specific `max_tokens` behavior;
- existing smaller caller cap is never increased;
- conflicting fields are not emitted.

## 7. Timeout/cancellation matrix

After #173, use an abort-aware mock provider.

Cases:

- provider resolves before timeout;
- provider rejects before timeout;
- Captar timeout aborts underlying signal;
- caller signal aborts provider and Captar observes it;
- caller signal + Captar timeout compose without double-finalization;
- timer is cleared after early completion;
- request/concurrency slot released exactly once;
- reservation state after confirmed cancellation follows documented policy;
- if provider spend cannot be known, event is marked unresolved rather than zero/actual estimate;
- internal retries do not silently bypass call/spend policy.

## 8. Streaming matrix

Do not use a single generic stream fixture for all providers.

### Chat Completions

- stream with `stream_options.include_usage=true` and final usage chunk;
- Captar adds/preserves include-usage option according to provider capability;
- final usage charged once, not summed as cumulative snapshots;
- nested cached token details normalized;
- early consumer break;
- stream `.abort()`/caller abort;
- provider error after partial chunks;
- no final usage => estimated/unresolved classification, never fake authoritative cost.

### Responses raw streaming

- delta events followed by `response.completed` containing `event.response.usage`;
- terminal response model/usage extracted from nested response;
- error/incomplete/cancelled terminal events;
- terminal normalized response is telemetry-safe;
- live stream object is never JSON serialized as provider response.

### OpenAI-compatible router

- top-level `usage.cost` final chunk/event when supplied;
- provider identity remains router identity;
- model alias/returned model mismatch is handled by documented pricing lookup rules.

## 9. Policy engine matrix

### Model/access policy

- allowlisted model accepted;
- non-allowlisted model blocked before provider;
- blocklisted model blocked;
- allow+block conflict follows documented restrictive rule;
- remote block/allow policy cannot be weakened locally after #180.

### Cost/output/retry policy

- max estimated cost boundary;
- output cap boundary for every supported output-limit field;
- invalid numeric limits rejected;
- retry configuration uses actual provider request options after #173.

### Repetition

After #172/#190:

- repeated identical request crosses wrapper boundaries within one session;
- separate sessions have independent counters;
- same length/prefix/suffix but different middle content does not collide;
- different instructions/tools produce different semantic fingerprint;
- reordered object keys remain equivalent;
- threshold zero semantics are explicit;
- blocked provider invocation count remains unchanged.

## 10. Session call/concurrency matrix

Already covered substantially; preserve these regressions:

- total call ceiling blocks next invocation;
- multiple wrappers share call count;
- concurrency ceiling blocks overlapping promise calls;
- slot released after success;
- slot released after provider error;
- stream owns slot through iteration;
- early stream cancellation releases slot;
- no slot underflow/double release;
- blocked pre-provider request count semantics are documented;
- after #185, closed/closing session blocks new work;
- after #173, local slot lifetime matches underlying provider lifetime on timeout/cancel.

## 11. Tool runtime matrix

After #172/#186:

- allowlist/blocklist;
- session-wide total tool call ceiling;
- optional separate per-tool ceiling if introduced;
- two handles cannot reset counters;
- separate sessions have independent counters;
- approval true/false/function;
- approval callback throws;
- estimate number/function;
- estimate callback throws;
- reserve budget blocks before `work()`;
- work success/failure;
- actual cost number/function;
- actual callback throws;
- actual > estimate reservation overrun;
- actual > hard budget violation;
- final event exactly once for every path;
- `toolCallCount` transition matches documented attempted/admitted/executed semantics;
- global budget/policy hooks receive tool blocks if unified.

## 12. Session lifecycle matrix

After #185:

- initialize emits one root running span;
- close emits one terminal root span;
- repeated close returns stable summary without duplicate close event;
- new LLM call after close rejected before provider;
- new tool after close rejected before work;
- close with active request follows documented wait/reject/abort behavior;
- close with active stream follows documented behavior;
- no child events occur after final close under the selected state machine;
- final summary cannot silently change after closure.

## 13. Event bus matrix

After #176:

- listener receives event;
- unsubscribe stops future delivery;
- multiple listeners all receive event;
- one throwing listener does not starve unrelated listeners in best-effort mode;
- listener failure does not change provider result by default;
- optional strict telemetry mode, if added, has explicit behavior;
- no unhandled promise rejection from async listener.

## 14. HTTP exporter matrix

Use mocked `fetch` only; no live network.

Cases:

- below batch threshold stays queued;
- exact threshold flushes once;
- successful response removes batch;
- 5xx/retryable result requeues in original order;
- thrown network error requeues before reporting;
- later success sends retained events exactly once;
- 4xx/non-retryable response triggers explicit drop/error channel;
- concurrent flush calls cannot duplicate/drop events;
- invalid batch size rejected;
- custom headers/auth precedence documented;
- circular/BigInt/class/stream event data handled by safe serializer/normalizer;
- queue growth is bounded or drop/backpressure policy is explicit.

## 15. Payload-retention matrix

After #182 semantics are chosen:

- `none` does not expose raw prompt/response beyond the documented boundary;
- `redacted` removes configured sensitive content before the documented boundary;
- `raw` requires explicit configuration;
- policy/usage/cost/IDs remain available without payload capture;
- custom listener/exporter behavior matches the same contract;
- platform repeats server-side retention as defense in depth;
- uppercase Prisma enum/lowercase SDK type is normalized explicitly.

## 16. Policy synchronization matrix

After #180/#187:

- schema-valid remote policy accepted;
- malformed policy rejected;
- required mode: timeout/network/non-2xx fails closed;
- cached mode: last-known policy honored only inside TTL/version rules;
- best-effort mode: documented local fallback;
- remote numeric max cannot be raised locally;
- remote blocklist cannot be removed;
- allowlists intersect;
- approvals/denials merge restrictively;
- local code can tighten controls;
- emitted session-start metadata records effective policy source/version.

## 17. Utilities matrix

### deterministic serialization/fingerprint

- nested object key order stable;
- arrays preserve order;
- unsupported/circular inputs have explicit behavior;
- after #190, collision-resistant semantic hashing.

### IDs

After #191:

- selected ID format/length;
- crypto source;
- OTel trace/span format if claimed;
- IDs remain stable across child event joins.

### money

After #188:

- fixed-point conversion boundaries;
- large values;
- tiny values;
- repeated addition;
- no negative zero/display anomalies.

### token heuristic

- empty/null;
- plain ASCII;
- Unicode;
- structured JSON-like input;
- clearly documented as estimate rather than tokenizer truth.

## 18. Span/telemetry mapping matrix

- default running span fields;
- explicit parent/start/id;
- update merges attributes without mutating original;
- completed/blocked/failed terminal snapshots;
- event-to-record with and without span;
- metadata/provider/model/request ID mapping;
- spend fields;
- after #191, valid telemetry IDs for the advertised export standard.

## 19. Callback matrix

After #186:

- budget callback receives actual `session.id`;
- policy callback receives actual `session.id`;
- explicit `traceId` is available separately if needed;
- callbacks fire once;
- callback exception handling semantics are documented;
- tool and LLM guardrail decisions use consistent callback/event channels.

## 20. Package-publication matrix

CI external install smoke must continue to prove:

1. SDK builds declarations/JS.
2. package can be packed/installed outside monorepo.
3. bundled internal workspace packages resolve.
4. ESM import succeeds.
5. public `createCaptar` call can construct a runtime without monorepo path aliases.

Add a small TypeScript consumer compile fixture when public API stabilizes, so declaration compatibility is verified in addition to runtime import.

## 21. How to debug a failed guardrail test

Follow this sequence rather than changing assertions first:

```text
1. Did the provider/work mock run?
   ├─ yes, but should have been blocked → preflight ordering/policy bug
   └─ no → inspect expected error/event/accounting

2. Inspect session state before and after:
   committedUsd / reservedUsd / remainingUsd

3. Inspect ordered Captar events:
   session.started
   request.started
   request.allowed or request.blocked
   estimate.reserved
   provider.response / request.failed
   spend.committed
   guardrail.violation

4. Inspect provider argument(s):
   request body
   request options
   output cap
   abort signal

5. For streams, inspect every raw provider event/chunk and terminal event.

6. Confirm whether spend source is provider actual, usage-derived, estimate, or unresolved.

7. Minimize to one deterministic fixture and open/update the linked GitHub issue with:
   exact reproduction
   expected behavior
   actual behavior
   provider invocation count
   accounting state
   event sequence
   root cause
   proposed fix
```

## 22. GitHub issue evidence standard

A confirmed defect issue should contain:

- affected file/function;
- user-facing invariant;
- minimal deterministic reproduction;
- expected vs actual result;
- whether provider/tool user code executed;
- accounting/event evidence;
- root cause;
- severity rationale;
- proposed implementation direction;
- regression tests required to close the issue.

Do not close an audit defect because a code path "looks fixed". Close it only when a regression test fails before the fix (or otherwise proves the old bug), passes after the fix, and the repository CI/package smoke is green.

## 23. Production testing boundary

This matrix deliberately uses mocks/fixtures and GitHub CI. Real OpenAI/OpenRouter/provider calls, Vercel re-enablement and production ingest verification remain behind #126. The SDK audit must not silently cross that gate.
