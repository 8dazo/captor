# Current Focus

- Last updated: 2026-04-08
- Umbrella issue: `#3` - V1 traces-first foundation, repo memory, and GitHub workflow
- Active delivery issue: `#23`
- Delivery model: split issue-linked branches and pull requests instead of one large branch

## V1 priorities now

- Keep the new traces, datasets, and manual eval flows easy to demo locally with resettable seed data.
- Keep the public SDK surface centered on `createCaptar()`, `wrapOpenAI()`, and `trackTool()`.
- Keep automated evaluators out of scope until the manual eval flow is stable.
- Keep shared repo memory and GitHub workflow enforcement current as each split issue lands.

## Current delivery

- `#23` resettable frontend demo seed that clears local data before recreating rich trace, dataset, and manual eval fixtures

## Explicitly not shipping in v1

- Automated evaluators
- Signals
- SQL exploration
- Alerts
- Dashboards
- Debugger and replay
- Playground
