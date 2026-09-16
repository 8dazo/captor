<p align="center">
  <img src="apps/marketing/public/logo.png" width="112" height="112" alt="Captar" />
</p>

<h1 align="center">Captar</h1>

<p align="center">
  <strong>Runtime control for production AI applications.</strong>
</p>

<p align="center">
  Enforce spend and execution policy in-process, keep provider keys in your app, and export the resulting traces, spend, and violations for review.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/captar"><img src="https://img.shields.io/npm/v/captar?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://github.com/8dazo/captor/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/8dazo/captor/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/8dazo/captor/releases"><img src="https://img.shields.io/github/v/release/8dazo/captor?style=flat-square" alt="GitHub release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="Apache 2.0" /></a>
</p>

<p align="center">
  <a href="https://captar.aurat.ai/docs">Docs</a> ·
  <a href="https://captar.aurat.ai">Website</a> ·
  <a href="https://github.com/8dazo/captor/issues">Issues</a> ·
  <a href="docs/sdk/runtime-flow.md">Runtime flow</a> ·
  <a href="docs/sdk/runtime-invariants.md">Runtime invariants</a>
</p>

---

## Why Captar

An AI request can be observable and still be too expensive, repeated in a loop, or allowed to execute with the wrong policy.

Captar puts the control decision in the application runtime. Your code keeps using its provider SDK and provider credentials; Captar wraps the client, evaluates the session budget and policy before execution, tracks the call or tool lifecycle, reconciles usage afterward, and can export the evidence to the Captar platform.

There is **no LLM proxy in the request path**.

```text
Your application
      │
      ▼
┌───────────────────────┐
│ Captar runtime        │
│                       │
│ policy ─┐             │
│ budget ─┼─ preflight  │
│ loops  ─┘             │
└──────────┬────────────┘
           │ allowed
           ▼
┌───────────────────────┐
│ Provider SDK / API    │
│ OpenAI-compatible     │
└──────────┬────────────┘
           │ usage
           ▼
┌───────────────────────┐
│ reconciliation        │
│ spans + spend +       │
│ violations            │
└──────────┬────────────┘
           │ optional export
           ▼
┌───────────────────────┐
│ Captar platform       │
│ traces / datasets /   │
│ manual evals          │
└───────────────────────┘
```

## Install

```bash
npm install captar openai
```

The public SDK package is **`captar`**. The repository's helper workspaces are bundled into the published SDK and are not required as separate application dependencies.

## Quick start

```ts
import OpenAI from 'openai';
import { createCaptar } from 'captar';

const captar = createCaptar({
  project: 'checkout-agent',
});

const session = await captar.startSession({
  budget: {
    maxSpendUsd: 0.25,
  },
  policy: {
    call: {
      maxCallsPerSession: 20,
      maxConcurrentCalls: 4,
    },
  },
});

const openai = captar.wrapOpenAI(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  { session },
);

const response = await openai.responses.create({
  model: 'gpt-4.1-mini',
  input: 'Summarize this order.',
});

await session.close();
await captar.flush();
```

Your OpenAI client stays an OpenAI client. Captar intercepts the controlled request path while preserving the provider SDK around it.

## OpenRouter and other OpenAI-compatible providers

Tell Captar which provider is behind the client so pricing lookups and telemetry keep the correct identity:

```ts
const openrouter = captar.wrapOpenAI(openrouterClient, {
  session,
  provider: 'openrouter',
});

await openrouter.chat.completions.create({
  model: 'openrouter/free',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

`provider` defaults to `openai`.

When a compatible provider returns a valid numeric `usage.cost`, Captar treats that value as the provider-reported actual cost. Local pricing is used when provider cost is unavailable. Unknown pricing fails closed unless an explicit pricing entry/override is configured.

## Track tools

The same session can govern non-model work:

```ts
const search = captar.trackTool('catalog.search', {
  session,
  estimate: 0.002,
  actual: 0.0015,
});

const result = await search.run(async () => {
  return await searchCatalog();
});
```

Session tool policy supports allow/block rules, approval requirements, and call ceilings.

## What is enforced today

Captar distinguishes preflight enforcement from postflight accounting instead of treating every signal as the same kind of guarantee.

| Capability | Current behavior |
| --- | --- |
| Unknown provider/model pricing | Fails closed before provider execution |
| Session spend budget | Preflight reservation + provider output-token ceiling where supported |
| Caller output limit | Captar never intentionally increases a stricter caller limit |
| Repeated requests | Runtime loop policy can block repeated request fingerprints |
| Session call ceiling | Enforced across wrapped clients sharing the same session |
| Concurrent call ceiling | Held through promise/stream lifecycle and released afterward |
| Provider actual cost | Reconciled after response when authoritative usage/cost is available |
| Provider overrun | Actual spend is recorded rather than clamped; a violation is emitted |
| Tool policy | Evaluated before tracked tool execution |
| Trace lifecycle | Session/request/tool spans and terminal states are emitted |

For the exact guarantee language, open limitations, and failure semantics, use the maintained audit docs rather than relying on marketing shorthand:

- [`docs/sdk/runtime-flow.md`](docs/sdk/runtime-flow.md) — exact execution order
- [`docs/sdk/runtime-invariants.md`](docs/sdk/runtime-invariants.md) — enforced, partial, and open invariants
- [`docs/sdk/code-audit.md`](docs/sdk/code-audit.md) — file/function audit ledger
- [`docs/sdk/testing.md`](docs/sdk/testing.md) — regression and failure-injection matrix

## Runtime events and platform

Captar emits runtime evidence for sessions, requests, tools, spend, and guardrail decisions. With hosted ingestion configured, those events can be inspected in the platform as traces and used to build datasets/manual evaluations.

```bash
CAPTAR_INGEST_URL=...
CAPTAR_INGEST_API_KEY=...
CAPTAR_HOOK_ID=...
CAPTAR_CONTROL_PLANE_URL=...
```

Model-provider API keys remain in your application.

## Repository

```text
captor/
├── apps/
│   ├── platform/       # trace, spend, violation, dataset and eval UI/API
│   ├── marketing/      # website + product documentation
│   └── site/           # deferred site workspace
├── packages/ts/
│   ├── sdk/            # published `captar` runtime SDK
│   ├── config/         # pricing/default policy/env configuration
│   ├── types/          # shared runtime contracts
│   ├── utils/          # runtime utilities
│   └── ui/             # shared UI package
├── db/prisma/          # PostgreSQL schema + migrations
├── demo/               # provider-backed demo tooling
├── docs/
│   ├── sdk/            # runtime audit + test documentation
│   └── infra/          # deployment/operations notes
└── .github/workflows/  # CI, build and release automation
```

## Local development

### Requirements

- Node.js 20+
- pnpm 10
- PostgreSQL for platform persistence

```bash
git clone https://github.com/8dazo/captor.git
cd captor

pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Useful commands:

```bash
pnpm lint
pnpm test
pnpm build
pnpm format

pnpm --filter captar build
pnpm --filter @captar/platform dev
pnpm --filter marketing dev
```

`pnpm demo:live` is provider-backed and requires the appropriate credentials. Normal CI and SDK regression tests are credential-free.

## Release safety

The SDK is currently published as `captar@0.5.0`. Release work is gated by:

1. repository lint/tests;
2. SDK/helper build;
3. a clean external install of the staged npm artifact;
4. explicit production smoke validation before deployment changes are re-enabled.

Automatic Vercel Git deployments are intentionally paused during the current runtime-hardening program. The production smoke procedure is documented in [`docs/production-smoke-gate.md`](docs/production-smoke-gate.md).

## Current engineering focus

The SDK is undergoing a deep runtime audit tracked in [#171](https://github.com/8dazo/captor/issues/171). Confirmed defects are tracked individually and are closed only after regression coverage and CI validation. The audit documentation intentionally records open limitations instead of presenting them as completed guarantees.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR. Changes should include focused tests for runtime behavior and preserve the issue → branch → PR workflow used by the repository.

For development details, see [`DEVELOPMENT.md`](DEVELOPMENT.md).

## Security

Please follow [`SECURITY.md`](SECURITY.md) for responsible disclosure. Do not publish credentials, provider keys, ingest keys, or sensitive retained payloads in issues.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).

---

<p align="center">
  <sub>Runtime control for AI applications.</sub>
  <br />
  <a href="https://captar.aurat.ai">captar.aurat.ai</a> ·
  <a href="https://captar.aurat.ai/docs">docs</a> ·
  <a href="https://github.com/8dazo/captor/releases">releases</a>
</p>
