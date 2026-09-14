# Current Focus

- Last updated: 2026-09-14
- Active delivery issue: `#81`
- Active branch: `feat/81-company-profile-og-images`
- Remaining open product-decision issue: `#72`
- Delivery model: issue-linked branches and pull requests; never direct-to-main

## V1 state

- TypeScript SDK runtime control and OpenAI-compatible wrapping are implemented.
- Span-first tracing, ingest, trace inspection, datasets, and manual eval flows are implemented.
- Captar docs live inside the marketing application.
- CI and build workflows are green on the latest `main` commit as of this update.

## Current delivery

- Finish `#81` by providing branded page-specific social cards and complete canonical social/robots metadata for the marketing site.
- Treat the existing `/story` route as the company profile rather than creating a duplicate `/about` page.

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
