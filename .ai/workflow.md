# Delivery Workflow

## Default process

1. Create or reference a GitHub issue with `gh`.
2. Work on a branch named `type/<issue-number>-<short-slug>`.
3. Keep `.ai/session-handoff.md` current while the work is active.
4. Open a pull request linked to the issue.
5. Merge through the pull request only.

## Branch naming

- Allowed examples:
  - `feat/3-v1-traces-foundation`
  - `fix/12-tool-budget-release`
  - `chore/20-sync-github-labels`
- Forbidden patterns:
  - `main`
  - `codex/...`
  - any branch without an issue number

## Issue and PR expectations

- Issues should have a clear summary, context, acceptance criteria, and validation plan.
- Pull requests should link the issue, summarize behavior changes, list validation, and call out rollback or risk notes.
- Use `node scripts/sync-github-labels.mjs` to enforce the approved label set.
- Use `node scripts/protect-main-branch.mjs` to apply or re-apply `main` branch protection.

## Label policy

- Use exactly one `severity/*` label for issues.
- Use exactly one `area/*` label for issues and PRs.
- Avoid ad hoc labels unless the repo policy changes in `.ai/`.
