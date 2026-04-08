# Current Focus

- Last updated: 2026-04-08
- Umbrella issue: `#3` - V1 traces-first foundation, repo memory, and GitHub workflow
- Active delivery issues: `#4`, `#5`, and `#6`
- Delivery model: split issue-linked branches and pull requests instead of one large branch

## V1 priorities now

- Make traces span-first across the SDK and platform.
- Keep the public SDK surface centered on `createCaptar()`, `wrapOpenAI()`, and `trackTool()`.
- Upgrade the platform trace view from a flat event log into a debugging surface with tree and timeline structure.
- Add shared repo memory and GitHub workflow enforcement so future work follows the same delivery process.

## Current split

- `#4` repo workflow, `.ai` memory, templates, and GitHub admin scripts
- `#5` SDK span tracing foundation
- `#6` platform span persistence and debugger UI

## Explicitly not shipping in v1

- Datasets
- Evals
- Signals
- SQL exploration
- Alerts
- Dashboards
- Debugger and replay
- Playground
