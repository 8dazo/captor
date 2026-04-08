---
name: repo-github-workflow
description: Follow Captar's repository workflow for non-trivial work. Use when making substantial fixes, features, or refactors in this repo so work starts from a GitHub issue, uses an issue-numbered branch, updates `.ai` memory, and finishes through a pull request instead of direct pushes to `main`.
---

# Repo GitHub Workflow

Use this skill for substantial work in this repository.

## Required steps

1. Read `AGENTS.md`, `.ai/current-focus.md`, `.ai/workflow.md`, and `.ai/session-handoff.md`.
2. If the work is non-trivial and no issue exists yet, create one with `gh issue create`.
3. Work on a branch named `type/<issue-number>-<short-slug>`.
4. Never include `codex` in the branch name.
5. Update `.ai/session-handoff.md` when the work starts and again before wrapping up.
6. Open a pull request linked to the issue before merge.
7. Never push directly to `main`.

## Labels

- Use one `severity/*` label.
- Use one `area/*` label.
- Do not invent extra labels unless the repository policy changes.

## References

- `AGENTS.md`
- `.ai/current-focus.md`
- `.ai/workflow.md`
- `.ai/github-backlog.md`
- `.ai/session-handoff.md`
