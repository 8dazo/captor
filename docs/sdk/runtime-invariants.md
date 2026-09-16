# Captar SDK runtime invariants

This document defines the invariants Captar should preserve as an in-process AI runtime-control layer. It distinguishes invariants already enforced by the current TypeScript SDK from invariants that are incomplete or violated by known audit findings.

A runtime invariant is stronger than a feature description: it should be testable, deterministic, and remain true across success, error, concurrency, cancellation and telemetry failure paths.

## Status language

- **ENFORCED** — current implementation has direct regression coverage and no known audit exception within the stated scope.
- **PARTIAL** — the invariant holds for a narrower scope than the public concept implies.
- **OPEN DEFECT** — a confirmed code path violates the invariant; linked issue contains reproduction and proposed fix.
- **DESIGN GAP** — behavior is not fully specified yet, so code cannot be considered correct until semantics are chosen.

## 1. Pricing must fail closed

**Invariant:** a request that requires USD budget enforcement must not reach the provider when Captar cannot price its provider/model under the configured pricing model.

**Status:** ENFORCED for token-priced wrapped `create` calls.

Current behavior:

- `BudgetPlanner` requires a `PricingEntry` before provider execution.
- unknown pricing raises `PolicyViolationError`;
- regression tests assert provider invocation count remains zero.
- after #183, `OpenAIAdapter.estimate()` also fails closed instead of manufacturing zero-price fallback data.

Limits:

- the built-in registry is stale for current OpenAI models (#181);
- provider-hosted non-token charges are outside the current pricing model (#189).

## 2. A pricing entry must not be malformed

**Invariant:** model pricing used for hard-budget decisions must contain finite non-negative required rates.

**Status:** ENFORCED after #183 for base entries and pricing overrides.

A new override must define both input and output rates. Partial overrides are allowed only when a complete existing entry supplies omitted fields.

Remaining pricing-structure limits (context-tier multipliers, regional/service-tier uplifts, hosted-tool fees) are tracked by #181/#189.

## 3. Cached input must replace, not duplicate, normal input cost

**Invariant:** when provider usage reports cached input as a subset of total input, the cached subset is charged at the cached rate instead of being charged at both rates.

**Status:** ENFORCED after #183 for non-streaming normalized usage.

Formula:

```text
uncachedInput = max(0, inputTokens - cachedInputTokens)
cost =
  uncachedInput * normalInputRate
  + cachedInputTokens * cachedInputRate
  + outputTokens * outputRate
```

If no cached-input rate exists, the cached subset falls back to the normal input rate rather than becoming free.

Streaming nested-usage normalization remains part of #174.

## 4. Reservation may never silently exceed remaining modeled budget

**Invariant:** a local reservation must be accepted only when it fits the current session budget after already committed/reserved spend and protected finalization reserve.

**Status:** ENFORCED for finite valid budget values.

`BudgetEngine.reserve()` synchronously rechecks remaining budget, which prevents parallel calls from both reserving the same remaining dollars even if they planned from a similar earlier state.

Configuration validation gaps such as `NaN` budget values are an OPEN DEFECT (#180).

## 5. Provider truth must not be clamped away

**Invariant:** when the provider reports an authoritative actual cost above the reservation or hard budget, Captar records the actual amount and reports the overrun instead of pretending the hard limit succeeded.

**Status:** ENFORCED for normalized non-streaming/provider-cost paths.

Current reconciliation exposes:

- `reservationOverrunUsd`;
- `hardBudgetOverrunUsd`;
- negative remaining budget when actual spend exceeded the configured maximum;
- `guardrail.violation` with category `spend`.

This is postflight truth, not proof that preflight prevented the provider from overspending.

## 6. Hard preflight scope must match every billable request component

**Invariant:** any cost Captar claims to constrain before provider execution must be represented in the preflight model.

**Status:** OPEN DEFECT.

Known omissions:

- token-bearing request fields beyond `input`/`messages` (#178);
- provider-hosted paid tools and other non-token charges (#189);
- context/service/region-dependent price rules (#181/#189).

Until these are modeled, `$X hard budget` is strict only inside the explicitly modeled cost surface.

## 7. Money must accumulate without systematic low-value loss

**Invariant:** the sum of many small charges must approximate the sum of raw charges within a documented precision bound.

**Status:** OPEN DEFECT (#188).

Current six-decimal USD rounding occurs before repeated accumulation, which can turn sub-micro-dollar per-call charges into zero.

Target implementation should use fixed-point internal accounting or defer display rounding until serialization/UI boundaries.

## 8. Output caps must never increase caller limits

**Invariant:** Captar may make a provider output ceiling stricter, never looser.

**Status:** ENFORCED for currently recognized `max_output_tokens` / `max_tokens` fields.

Current planner takes the minimum of:

- caller-supplied limit;
- policy limit;
- budget-affordable limit.

Chat `max_completion_tokens` compatibility is an OPEN DEFECT (#175).

## 9. A blocked request must not invoke provider code

**Invariant:** pricing, policy, call-count and concurrency blocks that are knowable locally must happen before provider invocation.

**Status:** ENFORCED for current covered paths.

Regression tests use provider mocks and assert unchanged invocation counts.

Caveat: `request.started` telemetry is emitted before the block and can contain raw payloads (#182).

## 10. Session call/concurrency limits must be session-wide

**Invariant:** creating additional wrapper objects must not reset session execution limits.

**Status:**

- `maxCallsPerSession`: ENFORCED by `RuntimeSession`.
- `maxConcurrentCalls`: ENFORCED by `RuntimeSession` for covered promise/stream paths.
- repeated-call threshold: OPEN DEFECT because state is wrapper-local (#172).
- tool call threshold: OPEN DEFECT because state is handle-local and keyed by tool name (#172).

## 11. Concurrency slots must be released exactly once

**Invariant:** every admitted request slot is released once on success, provider failure, completed stream, and cancelled stream.

**Status:** ENFORCED for the current tested LLM paths.

The release callback is idempotent. Stream wrappers retain the slot until iteration finalizes.

Timeout is special: the local slot can be released while the underlying provider operation remains alive because timeout does not abort it (#173). Therefore the local concurrency invariant is not yet equivalent to provider-side concurrency.

## 12. Loop detection must identify semantic repeats without deterministic collisions

**Invariant:** two behaviorally distinct requests must not collide merely because their serialization length/prefix/suffix match.

**Status:** OPEN DEFECT (#190).

Current fingerprint is lossy and ignores request context such as instructions/tools. A collision-resistant canonical semantic fingerprint is required.

## 13. Wrapper insertion must preserve provider SDK compatibility

**Invariant:** adding Captar around an existing client must not remove unrelated SDK methods, drop caller request options, or change required method receivers.

**Status:** OPEN DEFECT.

- second OpenAI `RequestOptions` argument is dropped (#173);
- spread-based resource clones can remove prototype methods (#184);
- Chat output-limit field compatibility is incomplete (#175).

Target: proxy/interceptor behavior should be observationally equivalent to the original client for methods Captar does not intercept.

## 14. Timeout means underlying execution stops, or the spend becomes unresolved

**Invariant:** Captar must never release budget under the assumption of zero cost while a timed-out provider request can still execute and spend.

**Status:** OPEN DEFECT (#173).

Current timer is a promise race only. Target behavior should abort provider execution through a composed signal where supported, and explicitly mark spend unresolved when authoritative cancellation/accounting cannot be guaranteed.

## 15. Postflight cost must carry a source/confidence concept

**Invariant:** estimated cost must not be indistinguishable from provider-authoritative actual cost.

**Status:** DESIGN GAP / OPEN DEFECT (#174/#189).

Required concepts:

```text
provider-authoritative
locally-calculated-from-provider-usage
preflight-estimated
unresolved
```

This is essential for cancellation, incomplete streaming usage, hosted tools and providers that omit actual aggregate cost.

## 16. Streaming completion must reconcile provider-specific usage shapes

**Invariant:** a supported provider/endpoint stream should consume its terminal usage format rather than relying on a generic `chunk.usage` assumption.

**Status:** OPEN DEFECT (#174).

Chat and Responses have distinct streaming shapes. Stream objects themselves must not be exported as response payloads.

## 17. Session closure must be an execution boundary

**Invariant:** once a session is definitively closed, no new child provider/tool execution may be admitted under that session.

**Status:** OPEN DEFECT / DESIGN GAP (#185).

Current `closed` flag only makes `close()` idempotent. Behavior while active work exists is not specified.

## 18. Finalization reserve must be consumable only by an explicit final execution

**Invariant:** protected finalization budget is unavailable to ordinary steps but can be consumed by a declared final step without exceeding total hard budget.

**Status:** DESIGN GAP (#179).

The budget engine has an `isFinal` concept, but the public wrapped LLM path cannot currently mark a call final.

## 19. Soft limits must have observable one-shot semantics

**Invariant:** configuring `softLimitPct` must produce a deterministic warning/event/hook when the threshold is crossed.

**Status:** OPEN DEFECT (#179).

The field is currently configured/defaulted but not evaluated.

## 20. Tool lifecycle must always terminate

**Invariant:** once a tool span/lifecycle begins, every path ends in exactly one completed, blocked or failed terminal state.

**Status:** OPEN DEFECT (#186).

Approval/estimate callback exceptions can occur outside the main tool try/catch, and budget blocks use generic failure semantics.

## 21. Telemetry must not control provider success by default

**Invariant:** a tracing/export/listener outage should not transform a successful provider result into an application inference failure unless strict telemetry delivery is explicitly configured.

**Status:** OPEN DEFECT (#176).

Current event emission awaits listeners/exporters on the runtime path.

## 22. Exporter retries must not lose removed batches

**Invariant:** once events are removed from an in-memory queue for delivery, a retryable transport failure must either restore them or explicitly report a bounded drop policy.

**Status:** OPEN DEFECT (#176).

A thrown fetch/serialization error can currently occur after `splice()` removed the batch.

## 23. Retention must have one clearly named boundary

**Invariant:** users must know whether `payloadRetention` means "not stored by Captar" or "never exported raw from the process".

**Status:** DESIGN GAP (#182).

The platform applies server-side retention before payload storage, but the SDK currently exports raw request/response values first and discards synced retention mode.

## 24. Remote governance must not be silently weakened

**Invariant:** if a remote/admin policy is intended to be authoritative, local code cannot loosen it through later shallow overrides unless that capability is explicit.

**Status:** OPEN DEFECT (#180).

Required merge semantics should be restrictive by field type (minimum numeric caps, union denylists/approvals, intersection allowlists, etc.).

## 25. Configuration must reject invalid numeric states

**Invariant:** `NaN`, infinity where unsupported, negative counts/money and non-integer count limits cannot enter enforcement state.

**Status:**

- pricing: ENFORCED after #183;
- reservation/commit amounts: ENFORCED;
- budget/policy limits: OPEN DEFECT (#180);
- environment timeout: OPEN DEFECT (#187).

## 26. IDs must be collision-resistant for expected telemetry volume

**Invariant:** entity/trace/span IDs must have sufficient uniqueness and, when advertised as OTel IDs, conform to OTel format.

**Status:** DESIGN GAP (#191).

Current helper uses a short `Math.random()` base-36 suffix; OTel-like export uses prefixed IDs as `trace_id`/`span_id`.

## 27. Explicit production boundary

**Invariant:** repository audit/test changes do not implicitly deploy production infrastructure or run real provider smoke tests.

**Status:** ENFORCED operationally.

Vercel Git deployment remains disabled for platform and marketing. Production validation remains gated by #126 and `docs/production-smoke-gate.md`.
