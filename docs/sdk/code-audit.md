# Captar TypeScript SDK code audit ledger

Audit tracker: #171.

This ledger records the executable runtime surface reviewed during the SDK deep audit. The goal is not to restate source code line-by-line; it is to ensure that every executable function/class method and every meaningful branch has an owner, invariant, regression target and known-finding status.

The audit scope includes `packages/ts/sdk` plus `@captar/types`, `@captar/config`, and `@captar/utils` because those packages directly define runtime policy, pricing, money, IDs and loop behavior.

## Status legend

- **Verified** — implementation behavior is understood and covered sufficiently for its current contract.
- **Verified after fix** — a defect was corrected during this audit and regression coverage was added.
- **Issue** — confirmed defect/gap with a dedicated GitHub issue.
- **Needs more coverage** — no confirmed defect, but branch-level testing is incomplete.
- **Structural** — declarations/simple classes with no meaningful runtime branch.

---

## `packages/ts/sdk/src/index.ts`

### Imports/exports and public types

**Status:** Structural + Issue #184/#173.

The module re-exports `@captar/types`, budget/policy errors and the span-record conversion helper. `OpenAICompatibleWrapOptions` adds provider identity to `OpenAIWrapOptions`.

The public `CaptarInstance.wrapOpenAI<TClient>() => TClient` typing currently promises a full runtime client shape even though spread-based wrapping can remove prototype methods (#184).

### `createExporter(options)`

**Responsibility:** choose custom/HTTP/env/no-op telemetry exporter.

**Branches reviewed:**

- no explicit exporter + ingest env exists;
- no explicit exporter + no ingest env;
- custom exporter with `.export`;
- HTTP exporter options;
- optional ingest API key.

**Findings:**

- exporter/listener failure isolation is incomplete (#176);
- `CAPTAR_TIMEOUT_MS` is parsed elsewhere but not used here/effective policy (#187).

**Coverage target:** constructor selection tests with explicit exporter, HTTP options, env URL/key, and no-op path.

### `mergePolicy(base, override)`

**Responsibility:** shallow merge budget/call/tool subobjects.

**Status:** Issue #180.

Plain spreading means later layers can loosen earlier remote/admin controls. Required restrictive merge semantics are not implemented.

**Coverage target:** restrictive policy compiler tests after #180.

### `fetchControlPlanePolicy(options)`

**Responsibility:** synchronously fetch hook policy on session start when `syncPolicy` is enabled.

**Branches reviewed:** sync off, custom base URL, API key header, non-2xx, JSON success.

**Findings:**

- no explicit required/cached/best-effort availability mode or policy cache (#187);
- returned `payloadRetention` is discarded (#182);
- policy response is trusted via TypeScript assertion without runtime schema validation (#180/#187).

### `isBlockedExecutionError(error)`

**Responsibility:** classify policy/budget errors as blocks.

**Status:** Verified for current two error classes; tool path does not consistently reuse equivalent semantics (#186).

### `errorMessage(error)`

**Responsibility:** normalize unknown errors to displayable reason.

**Status:** Verified/simple.

**Coverage target:** `Error` and non-Error thrown values.

### `emptyEstimate(provider, model)`

**Responsibility:** initialize safe estimate state for outer error paths.

**Status:** Verified/simple.

### `emitSpendReconciliation(...)`

**Responsibility:** emit committed spend and a spend guardrail violation on reservation/hard-budget overrun.

**Branches reviewed:** no overrun, reservation-only overrun, hard-budget overrun.

**Status:** Verified for current number precision and normalized actual usage.

**Findings:** internal micro-dollar rounding can lose repeated tiny spend (#188). Estimated vs provider-authoritative cost source is not represented (#174/#189).

### `createCaptar(options)`

**Responsibility:** create instance-scoped event bus/exporter/pricing registry and public API methods.

**Status:** mixed; child methods listed below.

### `onEvent(listener)`

**Responsibility:** subscribe to runtime events and return unsubscribe closure.

**Finding:** throwing listener currently propagates through runtime emission (#176).

### `startSession(sessionOptions)`

**Responsibility:** fetch/compile effective policy, create session metadata/budget, initialize session span.

**Branches reviewed:** remote policy on/off; metadata; control-plane hook metadata; budget overlay.

**Findings:**

- local budget/policy can loosen remote policy (#180);
- control-plane availability semantics (#187);
- retention field ignored (#182);
- session close lifecycle later allows new work (#185).

### `wrapOpenAI(client, wrapOptions)`

**Responsibility:** intercept supported OpenAI-compatible request creation.

**Findings:**

- stateful `PolicyEngine` is wrapper-local (#172);
- spread clone can remove prototype methods (#184);
- second OpenAI `RequestOptions` argument is dropped (#173);
- only `create` is controlled; helper methods that may execute requests are not intercepted (#184 design decision must be explicit).

### inner `wrapMethod(namespace, methodName, invoke)`

**Responsibility:** build the request lifecycle wrapper.

**Reviewed control-flow order:** request span → started event → planner → policy → slot → allowed → reserve → provider → stream/nonstream reconciliation → catch → callback → finally.

**Findings:**

- raw payload emitted before block (#182);
- timeout does not cancel provider (#173);
- Chat output field compatibility (#175);
- planner incomplete request-cost surface (#178/#189);
- streaming normalization (#174);
- callback ID mismatch (#186).

### streaming async iterator wrapper

**Responsibility:** preserve async iteration while holding reservation/concurrency state until stream termination.

**Verified:** slot/reservation cleanup has coverage for normal completion and early consumer break in current mocked shape.

**Issues:** #174 (provider-specific terminal usage, cancellation confidence, stream object export).

### outer catch/finally path

**Responsibility:** release reservation, classify blocked vs failed, emit terminal event, invoke callbacks, release slot.

**Verified:** provider failure releases reservation; policy/budget blocks do not invoke provider in covered cases.

**Issues:** #173 timeout ambiguity; #186 callbacks use trace ID in `sessionId`; telemetry can itself throw inside error handling (#176).

### `trackTool(name, toolOptions)`

**Responsibility:** construct tracked tool handle.

**Issue:** creates a fresh `PolicyEngine` per handle (#172).

### `flush()`

**Responsibility:** explicitly flush exporter when supported.

**Status:** Needs more coverage.

**Target:** success, retryable failure, thrown network failure, custom exporter with/without flush (#176).

---

## `packages/ts/sdk/src/internal/budget-engine.ts`

### `assertAccountingAmount(value, label)`

**Responsibility:** reject negative/non-finite reserve/commit operation values.

**Status:** Verified with tests.

**Gap:** it validates operation amounts, not budget policy configuration itself (#180).

### `BudgetEngine.constructor(budget)`

**Responsibility:** retain budget policy.

**Issue:** no normalization/validation for `maxSpendUsd`, reserve, soft percentage (#180/#179).

### `getState()`

**Responsibility:** expose committed/reserved/remaining amounts.

**Status:** Verified for valid finite/unlimited budgets and overrun behavior.

**Issue:** six-decimal money precision (#188); invalid budget values can produce `NaN` (#180).

### `getTotals()`

**Responsibility:** cumulative reserved/released/committed summary.

**Status:** Verified conceptually; add explicit conservation/property tests.

### `reserve(amountUsd, {isFinal})`

**Responsibility:** atomically check local remaining budget and add reservation.

**Verified:** insufficient budget block, invalid operation value, final reserve protection mechanics.

**Design gap:** no public wrapped-call mechanism marks a call final (#179).

**Issue:** internal rounding (#188).

### `commit(reservedUsd, actualUsd)`

**Responsibility:** reconcile reserved estimate against provider/tool actual truth.

**Verified:** release, reservation overrun, hard overrun, invalid amount, impossible reservation release.

**Issue:** internal rounding (#188).

---

## `packages/ts/sdk/src/internal/budget-planner.ts`

### `utf8ByteLength(value)`

**Responsibility:** conservative byte-count helper for current input estimator.

**Status:** Verified as a byte-length primitive, not a full token estimator.

**Coverage target:** ASCII, multibyte Unicode, structured input.

### `conservativeInputTokens(request)`

**Responsibility:** approximate input tokens conservatively using serialized bytes.

**Issue:** considers only `input`/`messages`; omits other billable context (#178).

### `requestOutputLimit(request)`

**Responsibility:** read caller output ceiling.

**Issue:** ignores `max_completion_tokens` (#175).

### `minDefined(values)`

**Responsibility:** choose strictest finite output cap.

**Status:** Verified by planner tests.

**Coverage target:** undefined, NaN/infinity policy values once validation semantics are defined (#180).

### local `calculateCost(pricing, input, output)`

**Responsibility:** compute preflight token cost.

**Status:** Verified for flat token rates.

**Limits:** no hosted-tool/non-token charge model (#189), no conditional long-context/tier pricing (#181/#189), money precision (#188).

### `BudgetPlanner.plan(request, options)`

**Branches reviewed:** unknown pricing, finite/unlimited budget, finalization reserve, input-only overflow, zero/nonzero output rate, caller/policy/affordable cap, invalid effective cap, planned-cost overflow, request patch.

**Status:** Strong existing test base but incomplete request/pricing model.

**Issues:** #175, #178, #189, #188.

---

## `packages/ts/sdk/src/internal/errors.ts`

### `BudgetExceededError`

**Status:** Structural/verified. Sets stable class name.

### `PolicyViolationError`

**Status:** Structural/verified.

### `ToolApprovalRequiredError`

**Status:** Structural/verified.

**Coverage target:** `instanceof`, `.name`, message preservation across public exports where applicable.

---

## `packages/ts/sdk/src/internal/event-bus.ts`

### `subscribe(listener)`

**Responsibility:** register listener and return unsubscribe closure.

**Status:** Needs more coverage.

**Targets:** unsubscribe idempotence; mutation during dispatch; multiple listeners.

### `emit(event)`

**Responsibility:** sequentially await listeners.

**Issue:** listener exceptions abort subsequent listeners and propagate into inference (#176).

---

## `packages/ts/sdk/src/internal/exporter.ts`

### `NoopExporter.export(batch)`

**Responsibility:** accept events locally without transport.

**Status:** Verified/simple.

### `HttpBatchExporter.constructor(options, project, hookId)`

**Responsibility:** capture HTTP/batch configuration.

**Coverage target:** invalid/zero batch sizes and header precedence should be specified.

### `enqueue(event)`

**Responsibility:** queue event and flush at threshold.

**Issue:** flush exceptions propagate to runtime (#176).

**Coverage target:** exact threshold, below threshold, concurrent enqueues, queue ordering.

### `export(batch)`

**Responsibility:** JSON serialize/post batch and map response into `ExportResult`.

**Issues:** arbitrary event values may not be JSON safe; thrown serialization/network errors are not normalized (#176). Non-retryable response has weak visibility.

### `flush()`

**Responsibility:** remove current queue batch, export, requeue retryable result.

**Issue:** thrown `export()` after `splice()` loses batch (#176).

**Required tests:** fetch reject, 5xx retry, 4xx/drop signal, later recovery, no duplication.

---

## `packages/ts/sdk/src/internal/openai-adapter.ts`

### `usageNumber(value)` (after #183)

**Responsibility:** accept finite non-negative numeric usage/cost values.

**Status:** Verified after fix #183.

### `objectRecord(value)` (after #183)

**Responsibility:** safely narrow unknown nested usage structures.

**Status:** Verified/simple.

### `cachedTokensFromUsage(usage, inputTokens)` (after #183)

**Responsibility:** normalize top-level and official nested cached-token counts and clamp cache to total input.

**Status:** Verified after fix #183 for non-streaming response shapes.

### constructor

**Responsibility:** retain pricing registry, execute callback, timeout, provider identity.

**Status:** Structural.

### `estimate(request)`

**Responsibility:** local model/input/output/cost estimate.

**Status:** fail-closed pricing after #183.

**Note:** primary wrapped path uses `BudgetPlanner`; this estimate method still has a simpler input/output estimator. Provider adapter interface should eventually avoid duplicate competing planners.

### `execute(request)`

**Responsibility:** require pricing then invoke provider under timeout helper.

**Issue:** timeout races only and cannot forward per-request options (#173).

### `extractUsage(response, estimatedCost)`

**Responsibility:** normalize non-stream usage and calculate/accept actual cost.

**Status:** Verified after #183 for top-level token counts, official nested cached counts and provider `usage.cost`.

**Coverage targets:** malformed/negative provider usage, missing usage fallback, model response alias mismatch.

### `extractStreamUsage(model, chunks, estimatedCost)`

**Responsibility:** aggregate generic flat usage chunks.

**Issue:** provider-specific stream shapes and cumulative-vs-final semantics (#174).

### `resolveOutputTokens(request)`

**Issue:** ignores `max_completion_tokens` (#175); default 256 is only estimator behavior, not a universal provider cap.

### `calculateCost(...)`

**Status:** Verified after #183 for cached vs uncached replacement math.

**Issue:** six-decimal helper precision (#188), non-token charges (#189).

### `requirePricing(model)`

**Status:** Verified; fail closed.

---

## `packages/ts/sdk/src/internal/policy-engine.ts`

### constructor / internal state

Implicit state consists of `RepetitionTracker` and per-tool-name count map.

**Issue:** ownership is PolicyEngine-instance-local instead of session-wide (#172).

### `evaluateCall(request, policy, estimatedCost)`

**Responsibility:** static call policy + repeated-call tracking.

**Issues:** wrapper-local repetition state (#172); lossy/incomplete fingerprint (#190).

### `evaluateTool(name, policy)`

**Responsibility:** allow/block + tool-call count.

**Issues:** handle-local engine (#172); count map is keyed by tool name despite `maxCallsPerSession` naming (#172 comment); truthy check makes zero semantics inconsistent (#180).

### `assertCallPolicy(...)`

**Branches:** allowed model, blocked model, estimated cost, output tokens, retry ceiling.

**Issues:** retry helper does not represent actual OpenAI RequestOptions/client retry behavior (#173); direct output check is tied to selected fields (#175); numeric policy validation missing (#180).

---

## `packages/ts/sdk/src/internal/pricing-registry.ts`

### constructor

**Responsibility:** merge/validate source + overrides into provider:model map.

**Status:** Verified after #183 through `applyPricingOverrides` validation.

**Gap:** alias/version/freshness model (#181).

### `get(provider, model)`

**Status:** Verified/simple exact lookup.

### private `key(provider, model)`

**Status:** Structural. Case-sensitive exact identity is current behavior.

---

## `packages/ts/sdk/src/internal/session.ts`

### constructor

**Responsibility:** create budget engine, effective policy overlay, root trace, summary counters.

**Status:** current budget override is propagated into `session.policy` after #170.

**Issues:** policy validation/precedence (#180), session-scoped policy engine missing (#172).

### `initialize()`

**Responsibility:** emit root `session.started` event/span.

**Issue:** telemetry failure can make startSession fail (#176).

### `getState()` / `getSummary()`

**Status:** Verified for existing accounting semantics.

**Issue:** money precision (#188).

### `acquireRequestSlot(policy)`

**Responsibility:** enforce total logical call count and active concurrency, increment counters, return idempotent release closure.

**Status:** strongly covered for shared wrappers, promises, streams and early stream cancellation.

**Issues:** does not check closed session (#185); invalid policy numbers (#180); local timeout can release while provider remains active (#173).

### `markRequest(blocked)`

**Responsibility:** increment blocked count or legacy request count.

**Status:** blocked path used; non-blocked increment is largely superseded by `acquireRequestSlot` and should be reviewed for dead/ambiguous API.

### `markToolCall()`

**Responsibility:** increment summary tool count.

**Issue:** exact semantic transition (attempted/admitted/executed) is unclear in tool lifecycle (#186).

### `reserve()` / `commit()`

**Responsibility:** expose budget engine operations internally.

**Status:** Verified delegation.

### `emit(type, data, options)`

**Responsibility:** construct event envelope, dispatch listeners, export.

**Issues:** failure coupling + raw serialization/retention (#176/#182).

### `close()`

**Responsibility:** idempotently emit completed session span and flush.

**Issue:** not an execution boundary; active/later work semantics undefined (#185).

---

## `packages/ts/sdk/src/internal/span.ts`

### `createSpanSnapshot(options)`

**Responsibility:** create running span with generated ID/default start time.

**Status:** Verified/simple.

**Coverage targets:** explicit ID/start/parent/attributes vs defaults.

### `updateSpanSnapshot(span, update)`

**Responsibility:** immutable shallow span/attribute update.

**Status:** Verified/simple.

**Coverage target:** attribute merge precedence and original object immutability.

---

## `packages/ts/sdk/src/internal/telemetry.ts`

### `eventToSpanRecord(event)`

**Responsibility:** flatten event + span metadata into OTel-like attribute record.

**Status:** deterministic mapping understood.

**Issue:** Captar IDs are not OpenTelemetry-format identifiers despite `trace_id`/`span_id` naming (#191).

**Coverage targets:** event with/without span, parent, metadata, provider/model/request ID and spend fields.

---

## `packages/ts/sdk/src/internal/tools.ts`

### `createTrackedTool(name, options, policyEngine)`

**Responsibility:** create a handle whose `run()` enforces tool policy/approval/budget and emits tool telemetry.

**Issue:** caller supplies a fresh PolicyEngine per handle from `trackTool()` (#172).

### returned `run(work)`

**Reviewed stages:** span creation → policy → approval → mark count → estimate → reserve → started → work → actual → commit → completed; error/release path.

**Issues:** #172 and #186. In particular, approval/estimate errors sit outside the main execution catch, budget block classification differs from LLM path, and global guardrail callbacks are not unified.

---

## `packages/ts/types/src/index.ts`

This file is declaration-heavy rather than algorithmic. Audit focused on whether types accurately describe runtime semantics.

### `BudgetPolicy`

**Issues:** `softLimitPct` has no runtime effect; finalization reserve lacks public final-call path (#179); numeric validation missing (#180).

### `CallPolicy`

**Issues:** retry semantics do not correspond fully to OpenAI SDK RequestOptions (#173); `maxOutputTokens` field mapping incomplete for Chat (#175); validation missing (#180).

### `ToolPolicy`

**Issue:** `maxCallsPerSession` runtime semantics currently per-engine/per-tool name (#172).

### `SessionPolicy`

**Issue:** no type-level distinction between authoritative/admin policy and local tightening override (#180).

### payload/dataset/eval types

**Status:** platform-facing declarations; not on the critical SDK enforcement path except `PayloadRetentionMode`/`ControlPlaneHook` (#182).

### `ControlPlaneHook`

**Issue:** SDK discards `payloadRetention`; runtime validation of fetched payload absent (#182/#187). Platform Prisma enum uses uppercase values while TypeScript retention mode is lowercase, requiring explicit normalization if the SDK begins consuming this field.

### `PricingEntry` / `PricingOverride`

**Status:** basic rates validated after #183. Structural model cannot represent conditional/hosted-tool pricing (#181/#189).

### `UsageRecord`

**Issue:** no source/confidence dimension distinguishing provider actual vs local estimate/unresolved (#174/#189).

### trace/span/event types

**Issue:** IDs are Captar-prefixed random IDs, not OTel IDs (#191). Event data is intentionally generic and therefore needs safe serialization boundary (#176).

### `ProviderAdapter`

**Observation:** interface combines estimate/execute/extract usage, while main wrapper now has a separate `BudgetPlanner`. Future adapter refactor should avoid duplicate estimators and include stream/capability methods.

### session/tool/public option types

**Issues:** callback `sessionId` runtime mismatch (#186); no final-call option (#179); no explicit telemetry failure mode (#176); no policy-sync availability mode (#187).

---

## `packages/ts/config/src/index.ts`

### built-in pricing data

**Status:** values are structurally validated after #183.

**Issue:** snapshot dated 2026-04-04 is stale for current OpenAI model catalog (#181).

### `defaultSessionPolicy`

**Observation:** includes currently non-operational `softLimitPct`; tool max-call semantics affected by #172/#179.

### `getCaptarEnvConfig(env)`

**Status:** parsing behavior understood.

**Issue:** timeout value is not validated and not consumed by runtime (#187).

### `assertPricingRate` / `validatePricingEntry` (after #183)

**Status:** Verified after fix; direct config tests added.

### `applyPricingOverrides(base, overrides)` (after #183)

**Status:** Verified after fix for base validation, complete new entries and partial existing overrides.

**Remaining:** pricing snapshot/version/source architecture (#181).

---

## `packages/ts/utils/src/index.ts`

### `stableStringify(value)`

**Responsibility:** deterministic key ordering for loop fingerprint input.

**Status:** works for ordinary JSON-like request values.

**Coverage targets:** arrays, key reorder, nested objects, undefined/non-JSON values, circular values. Request normalization should ultimately constrain inputs before hashing (#190).

### `roundUsd(value)` / `sumUsd(...values)`

**Issue:** six-decimal per-operation rounding causes cumulative precision loss (#188).

### `createId(prefix)`

**Issue:** short `Math.random()` identifier and OTel compatibility (#191).

### `fingerprintRequest(request)`

**Issue:** lossy length/head/tail fingerprint creates deterministic collisions (#190).

### `RepetitionTracker.record/reset`

**Status:** simple counter behavior; state ownership is wrong at integration layer (#172).

**Coverage targets:** threshold-related sequence, reset, independent keys.

### `withTimeout(work, timeoutMs)`

**Issue:** `Promise.race` timeout does not abort underlying work/provider (#173). Timer cleanup semantics should also be improved.

### `estimateTokensFromText(value)`

**Status:** heuristic only. Not used by the stricter byte-bound planner, but used by `OpenAIAdapter.estimate()`.

**Observation:** duplicate estimator semantics should be consolidated in provider adapter refactor.

### `resolveRetryCount(request)`

**Issue:** reads retry-like properties from request body while official OpenAI retry configuration commonly lives in request/client options (#173).

### `aggregateStreamUsage(chunks)`

**Issue:** generic summation assumes flat incremental usage chunks. Official provider streaming semantics differ and may expose one final total or nested terminal usage (#174). Cost is summed similarly and can double-count if a provider emits cumulative snapshots.

---

## Package/build surface

### `packages/ts/sdk/package.json`

**Reviewed:** ESM exports, files, workspace bundled dependencies, Node >=18, build/lint/test scripts.

External installation smoke in CI is an important guard because workspace dependencies are bundled into the published package.

**Coverage target:** continue installing packed SDK into a clean external directory on every SDK PR.

### TypeScript configuration

Root TypeScript is strict with `noUncheckedIndexedAccess`; SDK build and declaration generation run in CI.

### Existing regression files

Current suite includes budget engine, budget planner, budget overrun, call limits, provider cost/identity, runtime controller, strict runtime matrix, plus pricing-accounting tests added by #183.

The next coverage expansion is defined in [`testing.md`](./testing.md), especially exporter/listener failures, official OpenAI compatibility, policy compilation, session lifecycle, tool lifecycle, stream shapes and utility/property invariants.

---

## Audit conclusion at this checkpoint

The SDK has a solid local reservation/reconciliation core and meaningful preflight blocking, but "hard budget" is not yet a universal statement across every provider request shape and failure mode. The highest-risk remaining gaps are tracked in #172–#190, with #191 as lower-priority identity/OTel hardening.

The audit is complete only when #171's definition of done is satisfied; this file should be updated whenever a finding is fixed so `Issue` rows become `Verified after fix` with the closing PR/test reference.
