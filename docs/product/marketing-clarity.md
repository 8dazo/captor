# Captor 1.0 landing narrative (#237)

## Product statement

Captor is an open-source TypeScript SDK that puts a per-run execution contract around backfills and background jobs. The application defines resource ceilings and outcome checks; guarded operations are admitted before a side effect, and a run returns a receipt. Stored backfills persist successful batch offsets for explicit restart with a stable source and idempotent writes.

The product name is **Captor**; the published npm package and import path are **`captar`**. The SDK runs on Node.js 22+ inside an existing process, scheduler, queue worker, or workflow engine. Local use requires no hosted account.

## Adjacent positioning reviewed

| Site                                    | What the homepage makes clear                                                                | Lesson for Captor                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Trigger.dev](https://trigger.dev/)     | Names durable AI agents and workflows, then shows code, use cases, and the managed platform. | Lead with the workload and show real code near the promise. Do not imply Captor supplies scheduling or infrastructure.              |
| [Inngest](https://www.inngest.com/)     | Explains durable steps, retries, flow control, and use cases with an installation path.      | State the operating model and what a failure resumes from. Captor's checkpoint and idempotency conditions need plain language.      |
| [Hatchet](https://hatchet.run/)         | Explicitly calls itself an orchestration engine and shows a run inspector.                   | Explain Captor's narrower role inside the runner and label the receipt illustration as an example.                                  |
| [AgentBudget](https://agentbudget.dev/) | Leads with a concrete hard limit and a tiny integration example for AI agents.               | Make the enforcement moment specific. Captor's 1.0 homepage should focus on execution contracts; the older AI adapter is secondary. |

## Page sequence

1. **Hero:** hard limits for backfills and background jobs, package command, direct quickstart, and the labeled local request-limit illustration.
2. **Three contract jobs:** preflight resource limit, checkpoint after a successful batch, outcome and receipt.
3. **Code proof:** runnable local repair example plus stored backfill and bounded fetch examples. Link each to the matching docs.
4. **Use cases:** backfill, repair, API sync, and recurring worker in the team's existing runner.
5. **Operating model:** existing runner → SDK → application work and receipt; local JSONL/SQLite storage; optional manual platform import.
6. **Boundaries and FAQ:** only instrumented operations count; cancellation is cooperative; side effects are not rolled back; stable ordering and idempotency are required for replay; budgets reset on a resumed invocation.
7. **Final action:** install and test one representative job.

## Claims and proof

- `run`, `reserve`, `commit`, outcome metrics, receipts: `packages/ts/core/src/index.ts` and `apps/marketing/content/docs/execution/contracts.mdx`.
- `backfill`, sequential batches, persisted numeric offsets, `resume`: `packages/ts/core/src/backfill.ts` and `apps/marketing/content/docs/execution/backfills.mdx`.
- JSONL/SQLite stores and `runStored`: `packages/ts/core/src/store.ts` and `apps/marketing/content/docs/execution/stores.mdx`.
- Bounded fetch and Prisma guard: `packages/ts/core/src/fetch.ts`, `prisma.ts`, and adapter docs.
- Optional manual receipt import, without remote execution or automatic telemetry: `apps/marketing/content/docs/platform/receipts.mdx`.
- No invented customer proof, fleet-wide budget, automatic rollback, automatic request capture, or hosted pricing.

## Verification

Marketing lint, TypeScript, and production build passed locally (41 generated pages). The Vercel preview for PR #238 is READY, and its GitHub CI and Build checks passed. Desktop browser review covered the hero, example switch, use-case grid, receipt/FAQ sections, anchor navigation, and FAQ expansion with no visible framework overlay. The prior request-limit demo was preserved; mobile CSS was reviewed, but phone viewport emulation was unavailable in this browser, so mobile visual validation remains an open check.
