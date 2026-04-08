# Captar Repo Instructions

Follow these rules for all work in this repository.

## Delivery Workflow

- Do not push directly to `main`.
- Every non-trivial bug, improvement, or feature starts with a GitHub issue created via `gh`.
- Branches must use the format `type/<issue-number>-<short-slug>`.
- Branch names must never include `codex`.
- Every pull request must link the issue it addresses.
- Merge changes through pull requests only.

## Repo Memory

- Treat `.ai/` as shared project memory, not private scratch space.
- Read `.ai/current-focus.md`, `.ai/workflow.md`, and `.ai/session-handoff.md` before major work.
- Update `.ai/session-handoff.md` at the start and end of substantial implementation so the next session has accurate context.
- Keep `.ai/github-backlog.md` aligned with real GitHub issues when priorities change.

## Product Direction

- V1 is traces-first and focused on the TypeScript SDK plus the platform app.
- Prefer OpenAI and OpenAI-compatible integrations only for v1.
- Do not ship evals, signals, SQL, dashboards, alerts, queues, debugger, or playground features yet; keep them documented in `.ai/` as next-stage roadmap items.

