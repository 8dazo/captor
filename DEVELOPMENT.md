# Development Guide

This document covers local development setup, architecture, and workflows for contributing to Captar.

## Prerequisites

| Tool       | Version    | Purpose                                     |
| ---------- | ---------- | ------------------------------------------- |
| Node.js    | 20+        | Runtime for apps and packages               |
| pnpm       | 10+        | Package manager and workspace orchestration |
| PostgreSQL | 14+        | Primary database                            |
| Rust       | 1.70+      | Core runtime SDK and CLI                    |
| Docker     | (optional) | For local PostgreSQL or infrastructure      |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/8dazo/captor.git
cd captor
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and auth secret

# 3. Set up database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Start all apps
pnpm dev
```

**App URLs after `pnpm dev`:**

- Platform: http://localhost:3000
- Marketing site: http://localhost:3001

## Environment Variables

See `.env.example` for the full template. Key variables:

| Variable                    | Required  | Description                                            |
| --------------------------- | --------- | ------------------------------------------------------ |
| `DATABASE_URL`              | Yes       | PostgreSQL connection string                           |
| `AUTH_SECRET`               | Yes       | Long random string for NextAuth                        |
| `AUTH_URL`                  | Yes       | Your platform base URL (e.g., `http://localhost:3000`) |
| `AUTH_TRUST_HOST`           | Local dev | Set to `true` for local development                    |
| `CAPTAR_PLATFORM_URL`       | Yes       | URL your SDK points to                                 |
| `CAPTAR_DEMO_HOOK_ID`       | Optional  | Demo hook ID for the live demo                         |
| `CAPTAR_DEMO_USER_EMAIL`    | Optional  | Demo login email                                       |
| `CAPTAR_DEMO_USER_PASSWORD` | Optional  | Demo login password                                    |

## Project Structure

```
captor/
├── apps/
│   ├── platform/           # Next.js 15 — traces, datasets, evals, auth
│   ├── marketing/          # Next.js 15 — landing, docs, pricing, blog
│   └── site/               # Reserved for future release
├── packages/ts/
│   ├── sdk/                # Core TypeScript runtime SDK
│   ├── types/              # Shared public types
│   ├── config/             # Pricing, defaults, env helpers
│   ├── utils/              # Utility helpers
│   └── ui/                 # Shared UI primitives
├── packages/rust/
│   ├── core/               # Rust core runtime (WIP)
│   ├── cli/                # Rust CLI (WIP)
│   └── bindings/           # Platform bindings (WIP)
├── db/
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Migration files
│   └── seed.ts             # Seed script
├── infra/                  # Terraform, Docker, deployment assets
├── demo/                   # Live demo scripts
├── scripts/               # Automation helpers
└── docs/                  # Plans and ADRs
```

## Workspace Commands

```bash
# Development
pnpm dev                  # Start all apps in parallel via Turbo
pnpm --filter @captar/platform dev     # Platform only
pnpm --filter marketing dev             # Marketing only

# Building
pnpm build                # Build all packages and apps

# Database
pnpm db:generate          # Generate Prisma client from schema
pnpm db:push              # Push schema changes to database
pnpm db:migrate           # Run migration with prompt
pnpm db:seed              # Seed database with demo data
pnpm db:reset:seed        # Push with data loss + seed (destructive)

# Code Quality
pnpm lint                 # TypeScript check across workspace
pnpm format               # Format with Prettier
pnpm test                 # Run all tests

# Demo
pnpm demo:live            # Run live OpenAI demonstration
```

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

Reference the related issue:

```
feat: add dashboard metric cards - Refs #33
chore: remove deprecated helper - Refs #15
```

For the final commit of a feature branch:

```
feat: complete dashboard page - Closes #33
```

## Tech Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Framework  | Next.js 15 (App Router)      |
| Language   | TypeScript 5, Rust           |
| Styling    | Tailwind CSS 3, shadcn/ui    |
| Database   | PostgreSQL 14+, Prisma ORM   |
| Auth       | NextAuth.js v5               |
| Icons      | Lucide React                 |
| Monorepo   | pnpm workspaces, Turborepo   |
| Testing    | Vitest                       |
| Formatting | Prettier, lint-staged, Husky |

## Architecture

### Runtime Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│   OpenAI    │     │   Captar    │
│   Request   │     │   Client    │────>│   Runtime   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                ┌───────────────────────────────┼───────────┐
                │                               │           │
                ▼                               ▼           ▼
         ┌──────────┐                 ┌──────────┐ ┌──────────┐
         │  Budget  │                 │  Policy  │ │  Tool    │
         │  Reserve │                 │  Eval    │ │  Track   │
         └──────────┘                 └──────────┘ └──────────┘
```

1. Normalize the provider request
2. Evaluate policy (model, tool, cost limits)
3. Estimate worst-case cost
4. Reserve budget before execution
5. Execute provider/tool call
6. Reconcile actual usage, release unused reserve
7. Emit traces, spend events, violations
8. Export strong traces into datasets

### Platform Flow

1. Capture prompts/responses from traces
2. Inspect in trace debugger
3. Export traces into append-only datasets
4. Import/export datasets (JSON, JSONL, CSV)
5. Create manual evals from datasets
6. Score with pass/fail + weighted rubric criteria

## SDK Usage

```typescript
import { wrapOpenAI } from '@captar/sdk';

const client = wrapOpenAI(openai, {
  sessionId: 'session_123',
  budget: { maxSpendCents: 10000 },
  tools: { allowed: ['search', 'calculate'] },
});

const completion = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Troubleshooting

### Prisma errors

```bash
pnpm db:generate
# If types are stale:
rm -rf node_modules/.pnpm db/prisma/client
pnpm install
pnpm db:generate
```

### Next.js build issues

```bash
rm -rf apps/platform/.next apps/marketing/.next
pnpm build
```

### Turborepo cache issues

```bash
rm -rf .turbo
pnpm build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution workflow.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
