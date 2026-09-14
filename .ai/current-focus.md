# Current Focus

- Last updated: 2026-09-14
- Active delivery issue: `#143`
- Active branch: `feat/143-platform-dashboard-revamp`
- Remaining open product-decision issue: `#72`
- Delivery model: issue-linked branches and pull requests; never direct-to-main

## V1 state

- TypeScript SDK runtime control and OpenAI-compatible wrapping are implemented.
- Span-first tracing, ingest, trace inspection, datasets, and manual eval flows are implemented.
- Captar docs live inside the marketing application.
- CI and build workflows are green on the latest `main` commit as of this update.

## Current delivery

- Revamp the platform dashboard and authentication experience around a restrained black/graphite design system informed by the marketing site.
- Replace platform Lucide usage with Hugeicons and apply the system consistently across all platform routes and states.

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
