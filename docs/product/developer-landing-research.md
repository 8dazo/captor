# Developer landing and capacity preflight (#239)

Research date: 2026-10-02. This is a homepage/product-pattern review of primary sources, not a measured market-size or customer-demand study.

## What the market already provides

| Reference                                                                             | Observed positioning or adoption pattern                                                                              | Captor decision                                                                                                                   |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [AgentBudget](https://agentbudget.dev/) / [docs](https://agentbudget.dev/docs)        | Leads with per-session dollar enforcement, code examples, circuit breaking, and integration paths.                    | Budget enforcement alone is not unique. Show the precise admission boundary and usable examples.                                  |
| [Langfuse](https://langfuse.com/)                                                     | Pairs its observability/evaluation proposition with product evidence, integrations, documentation, and a public demo. | Give developers concrete evidence and an immediate action, without inventing customer proof or claiming to replace observability. |
| [Portkey](https://portkey.ai/) / [guardrails](https://portkey.ai/features/guardrails) | Gateway-oriented governance, usage controls, routing, and guardrails.                                                 | Explain the in-process operating model. Do not imply other tools cannot enforce limits.                                           |
| [Helicone](https://www.helicone.ai/)                                                  | Connects gateway/observability positioning to docs and developer utilities such as cost comparison.                   | Add a useful local utility: a contract builder with portable output. Avoid maintaining a speculative provider-price catalog.      |
| [Trigger.dev](https://trigger.dev/)                                                   | Names durable agents/workflows and supports the pitch with code and execution product detail.                         | Explain how Captor fits inside a runner and demonstrate restart semantics, not scheduling or infrastructure.                      |

## Interpretation

The adoption opportunity is a short path from understanding a boundary to putting it in application code. This is an inference from the reviewed product pages, not validated customer research. Our implementation therefore prioritizes working examples, portable contracts, and explicit failure/restart semantics over a longer feature checklist.

The attached original draft focuses on LLM budgets; the current 1.0 repository also contains execution contracts for jobs/backfills. Preserve both: retain execution contracts as the primary landing narrative, expose the existing OpenAI-compatible session wrapper in the code selector, and distinguish those APIs. Do not silently promise native Anthropic/Gemini support, shared daily budgets, guaranteed final billing, automatic rollback, or content-safety filtering.

## Delivered scope

- `ExecutionRun.checkResource`: small additive SDK feature for graceful, non-mutating capacity checks. Includes pending reservations; terminal runs reject admission. A check never replaces `reserve` and does not persist a checkpoint.
- Contract builder: three workload presets, editable resource allowance/work count/units, deterministic capacity preview, generated code, clipboard action, downloadable JSON. Local arithmetic only; no provider calls, credentials, arbitrary code evaluation, or stored visitor inputs.
- Recovery illustration: start, limit stop, and explicit restart. Distinguishes accumulated source progress from the fresh allowance on each invocation. Documents replay/idempotency caveats.
- Examples: add the existing OpenAI-compatible API and copy controls. Keep new unpublished API labeled as repository-only.
- Navigation: use the same compact shell on documentation routes, removing stale localhost sign-in/signup CTAs. Existing documentation sidebars remain.

## Guardrails for copy

- No invented customer logos, testimonials, install counts, measured latency, or savings percentages.
- AI costs are estimated before a call and reconciled later. Provider charges can exceed estimates.
- Only guarded operations count; in-memory limits are per-run/per-session, not fleet-wide.
- Checkpoints do not make side effects atomic. Stable source ordering and idempotent writes remain required.
- No database work, npm publication, paid service, or pricing decision in this delivery.

## Next product validation

Recruit a small set of TypeScript users with a real repair job, API sync, or agent tool loop. Measure time to first enforced limit and successful restart. Learn whether distributed budgets or broader provider support is the next actual need before expanding infrastructure.
