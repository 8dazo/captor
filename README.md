# Captar

<p align="center">
	<img src="https://komarev.com/ghpvc/?username=8dazo&label=Views&color=0e75b6&style=flat" alt="Profile views" />
	<img src="https://starchart.cc/8dazo/captor.svg" alt="Stargazer graph" />
</p>

Captar is a runtime control layer for AI applications. It helps teams enforce spend limits, tool usage rules, and execution policy inside the application runtime, without requiring a proxy gateway or handing over provider keys by default.

## Why Captar

Modern AI apps need more than observability. They need guardrails that act before a request overruns budget, triggers unsafe tooling, or leaves the intended execution path.

Captar is designed to provide:

- Local-first policy enforcement for AI calls and tool execution
- Budget reservation and reconciliation before and after model usage
- Optional export of traces, spend events, and violations to a platform layer
- Project-scoped datasets built from retained trace payloads
- Minimal integration changes for teams already using OpenAI-based workflows

## Repository Overview

This repository is a `pnpm` monorepo managed with Turborepo.

### Applications

- `apps/platform` - Next.js platform app for local inspection, ingest, and operational flows
- `apps/docs` - Next.js + MDX documentation app
- `apps/site` - reserved marketing site for a later release stage

### Packages

- `packages/ts/sdk` - core TypeScript runtime SDK
- `packages/ts/config` - shared pricing, defaults, and environment config
- `packages/ts/types` - shared public types and contracts
- `packages/ts/utils` - utility helpers
- `packages/ts/ui` - shared UI helpers

### Supporting Directories

- `db` - Prisma schema, migrations, and seed logic
- `infra` - infrastructure-related assets and notes
- `demo` - demo flows and example runtime usage
- `scripts` - project scripts and automation helpers

## Runtime Flow

At a high level, the TypeScript runtime follows this sequence:

1. Normalize the provider request
2. Evaluate local policy for model and tool usage
3. Estimate worst-case cost
4. Reserve budget before execution
5. Execute the provider or tool call
6. Reconcile actual usage and release unused reserve
7. Emit traces, spend records, and policy events
8. Export strong traces into project datasets for later review or eval prep

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` 10+
- PostgreSQL

### Installation

```bash
pnpm install
cp .env.example .env
```

Update `.env` with your local database and auth values before starting the apps.

### Database Setup

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### Run the Workspace

```bash
pnpm dev
```

Useful app-specific commands:

```bash
pnpm --filter @captar/platform dev
pnpm --filter @captar/docs dev
pnpm demo:live
```

## Available Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm demo:live
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
```

## Environment

The example environment file includes the core variables needed for local development:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `CAPTAR_PLATFORM_URL`
- `CAPTAR_DEMO_HOOK_ID`
- `CAPTAR_DEMO_USER_EMAIL`
- `CAPTAR_DEMO_USER_PASSWORD`

See [`.env.example`](/Users/d3v1/projects/captar/.env.example) for the current template.

## Current Scope

The current repository is focused on the first operational slice of Captar:

- TypeScript / Node runtime SDK
- OpenAI request control flows
- Spend-aware execution and reconciliation
- Tool tracking and approval hooks
- Optional export and platform ingestion paths
- Platform trace debugging plus project-scoped dataset import/export workflows
- Documentation, demo flows, and platform groundwork

## Current Platform Workflow

The current v1 platform flow is:

1. Capture retained prompts and responses from traces.
2. Inspect them in the platform trace debugger.
3. Export useful traces into append-only project datasets.
4. Import or export datasets as `json`, `jsonl`, or `csv`.

Offline/manual eval execution is the next milestone after the dataset flow. It is not shipped in this repository yet.
