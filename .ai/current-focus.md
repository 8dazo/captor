# Current Focus

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

- Issue `#147` was completed through PR `#148` and merged into `main`.
- Captar now uses a namespaced Auth.js session cookie, with secure-cookie behavior preserved for HTTPS/production.

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
