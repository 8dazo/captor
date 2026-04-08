# V1 Roadmap

## In scope

- TypeScript SDK for runtime control and tracing
- OpenAI and OpenAI-compatible request wrapping
- Span-first trace persistence
- Project-scoped datasets built from traces and file imports
- Spend, policy, payload retention, and violation tracking
- Platform views for project, hook, trace, and dataset inspection
- Repo workflow rules, issue templates, PR template, and label sync

## Current milestone

- Dataset export from traces
- Dataset import and export in `json`, `jsonl`, and `csv`
- Project-scoped dataset browsing in the platform

## Near-term next after datasets

1. Offline and manual evaluation runs
2. Online evaluators for production traffic
3. Signals over trace/span and dataset activity
4. Search, SQL, dashboards, alerts, queues, debugger, and playground

## Ship criteria

- SDK emits stable parent/child spans for session, request, and tool execution
- Platform persists and renders spans
- Trace pages show debugging-oriented structure instead of only event logs
- Platform can export traces into append-only datasets and import rows from files
- GitHub workflow is documented and automated enough to avoid direct-to-main work
