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

- Offline and manual evaluation runs on top of project datasets
- Project-scoped rubric definitions, run snapshots, and reviewer scoring
- Platform pages for eval creation, run launch, and row-by-row review

## Near-term next after manual evals

1. Online evaluators for production traffic
2. Signals over trace/span, dataset, and eval activity
3. Search, SQL, dashboards, alerts, queues, debugger, and playground
4. Eval result exports, annotations, and richer collaboration workflows

## Ship criteria

- SDK emits stable parent/child spans for session, request, and tool execution
- Platform persists and renders spans
- Trace pages show debugging-oriented structure instead of only event logs
- Platform can export traces into append-only datasets and import rows from files
- Platform can create manual evals from datasets, start runs, and save reviewer scores with pass/fail plus rubric metrics
- GitHub workflow is documented and automated enough to avoid direct-to-main work
