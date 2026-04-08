# V1 Roadmap

## In scope

- TypeScript SDK for runtime control and tracing
- OpenAI and OpenAI-compatible request wrapping
- Span-first trace persistence
- Spend, policy, payload retention, and violation tracking
- Platform views for project, hook, and trace inspection
- Repo workflow rules, issue templates, PR template, and label sync

## Near-term next after span foundation

1. Dataset export from traces
2. Offline and manual evaluation runs
3. Online evaluators for production traffic
4. Signals over trace/span data
5. Search, SQL, dashboards, alerts, queues, debugger, and playground

## Ship criteria

- SDK emits stable parent/child spans for session, request, and tool execution
- Platform persists and renders spans
- Trace pages show debugging-oriented structure instead of only event logs
- GitHub workflow is documented and automated enough to avoid direct-to-main work

