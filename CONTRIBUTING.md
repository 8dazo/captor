# Contributing to Captar

Thank you for your interest in contributing to Captar. This document outlines the development workflow, branch naming conventions, and submission process.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL

### Installation

```bash
pnpm install
cp .env.example .env
# Update .env with your database and auth credentials
```

### Database Setup

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### Running the Apps

```bash
pnpm dev    # Start all apps in parallel via Turborepo
```

- Platform app: http://localhost:3000
- Marketing app: http://localhost:3001
- Docs app (Mintlify): http://localhost:3002

### Running Tests

```bash
pnpm test   # Run all tests across workspace
```

### Code Quality

```bash
pnpm lint               # Run TypeScript check across workspace
pnpm format             # Format changed files with Prettier
```

Prettier is automatically run on every commit via lint-staged and husky.

## Branch Naming

All branches must follow the format:

```
type/<issue-number>-<short-slug>
```

Allowed prefixes: `feat/`, `fix/`, `chore/`

Examples:

- `feat/33-dashboard-page`
- `fix/42-budget-overflow`
- `chore/15-sync-labels`

Branches **must** include an issue number. Do not include `codex` in branch names.

## Commit Messages

Reference the related issue in every commit:

```
feat: add dashboard metric cards - Refs #33
chore: remove deprecated helper - Refs #15
```

For the final commit of a feature branch, use:

```
feat: complete dashboard page - Closes #33
```

## Pull Request Process

1. Create or reference a GitHub issue with `gh issue create`
2. Work on a properly named branch
3. Update `.ai/session-handoff.md` if the work is substantial
4. Open a pull request that links the issue
5. Ensure CI passes (lint + test + build)
6. Merge through the pull request only — never push directly to `main`

## Issue Labels

Use exactly one `severity/*` and one `area/*` label per issue. Run:

```bash
node scripts/sync-github-labels.mjs
```

To re-apply the canonical label set if labels drift.

## Testing Guidelines

- Add tests for new functionality, especially in the SDK and platform API layers
- Use `vitest` for unit and integration tests
- Database tests in `apps/platform/test/` should use the Prisma test database URL if available
- Mock external API calls (e.g., OpenAI) in tests

## Project Structure

```
apps/
  platform/       Next.js platform app (traces, datasets, evals)
  marketing/      Next.js marketing site and docs
  docs/           Mintlify standalone docs (being migrated to marketing)
packages/ts/
  sdk/            Core TypeScript runtime SDK
  types/          Shared type definitions
  config/         Pricing, defaults, environment helpers
  utils/          Utility helpers
  ui/             Shared UI primitives
```

## Questions?

Open an issue or check `.ai/` for project memory, roadmap, and workflow docs.
