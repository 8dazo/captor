# Current Focus

- Last updated: 2026-09-14
- Active delivery issue: `#147`
- Active branch: `fix/147-auth-session-cookie`
- Remaining open product-decision issue: `#72`
- Delivery model: issue-linked branches and pull requests; never direct-to-main

## V1 state

- TypeScript SDK runtime control and OpenAI-compatible wrapping are implemented.
- Span-first tracing, ingest, trace inspection, datasets, and manual eval flows are implemented.
- Captar docs live inside the marketing application.
- CI and build workflows are green on the latest `main` commit as of this update.

## Current delivery

- Namespace the Auth.js session cookie so stale or foreign localhost cookies cannot trigger JWT decryption errors in Captar.
- Keep secure-cookie behavior enabled for HTTPS/production while retaining HTTP localhost support.

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
