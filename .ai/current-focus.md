# Current Focus

## 2026-09-22 execution readiness

- Active branch: `fix/155-execution-readiness`; references #155 runtime hardening, #210 UI audit, and #228 workload validation. A new umbrella issue could not be created because the GitHub connector returns HTTP 400 `Invalid MCP request metadata`.
- PR #232 and platform Git-deployment PR #234 are merged. Last verified main: `fd27099434cbf1c1f2411edd179c3b184c25bdfe`.
- Implemented locally: ordinary failed receipt persistence, final-storage error context, backfill/Prisma error preservation, corrected quickstart, fresh-process recovery demo, execution-first docs/marketing, and pilot checklist.
- Validation: 175 core/SDK tests; packed typed consumer including failure/quickstart checks; SQLite and JSONL fresh-process recovery; marketing lint and production build (41 pages); rendered headings/doc links on 14 routes.
- Marketing main-only Git deployment prepared in the branch. SDK fixes remain unreleased; npm version unchanged at 1.0.0.
- Database reseed/schema work remains paused per user steering. No data cleared. Hosted receipt import workflow remains unverified against the target DB.
- GitHub/Vercel connectors currently return metadata errors. Branch delivery status is recorded in session-handoff.md; do not claim these new changes are merged or live.

## 2026-09-21 update

- Active delivery: #231, branch `feat/231-execution-run-inspector`.
- Execution-receipt Runs list/detail, JSON/JSONL import and JSON download implemented; legacy AI traces remain separate.
- Verification: 41 platform tests, platform typecheck and production build pass locally.
- Browser preview blocked by local socket permissions; authenticated integration testing needs a database.
- Additive schema rollout required before deployment; see `docs/platform/execution-receipts.md`.
- Earlier notes below describe the older AI-first delivery, not the current execution-safety direction.

- Last updated: 2026-09-14
- Active delivery issue: none
- Active branch: `main`
- Remaining open product-decision issue: `#72`
- Delivery model: issue-linked branches and pull requests; never direct-to-main

## V1 state

- TypeScript SDK runtime control and OpenAI-compatible wrapping are implemented.
- Span-first tracing, ingest, trace inspection, datasets, and manual eval flows are implemented.
- Captar docs live inside the marketing application.
- CI and build workflows are green on the latest `main` commit as of this update.

## Latest delivery

- Issue `#150` was completed through PR `#151` and merged into `main`.
- Shared dialogs now use Radix title and description primitives without changing the existing visual design.

## Blocked decision

- `#72` needs approved pricing tiers, limits, and feature availability before implementation. Do not publish speculative pricing.

## Explicitly not shipping as part of this delivery

- Online/automated evaluators
- Signals
- SQL exploration
- Alerts
- New dashboards
- Debugger and replay
- Playground
