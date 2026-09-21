# Current Focus

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
