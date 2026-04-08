# Database

This folder owns the Prisma schema, migrations, and seed data for the Captar platform.

## Commands

- `pnpm db:generate`
- `pnpm db:push`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm db:reset:seed`
  This accepts Prisma data-loss prompts, clears the existing database contents through the seed, and recreates the demo fixtures.

## Seeded Demo Data

The seed is destructive for local development: it clears existing platform data, then recreates a realistic frontend demo.

The seed creates:

- one seeded demo user that matches the login screen defaults
- a rich frontend demo project with two active hooks, mixed trace states, datasets, and manual evals
- a lighter sandbox project so `/projects` stays browsable instead of redirecting immediately
- completed, blocked, failed, and running traces with spans, payloads, spend, and violations
- imported and trace-export datasets, plus an empty dataset for empty-state testing
- completed and in-progress manual eval runs for reviewer workflow testing
