# @captar/sdk

Runtime control for OpenAI-compatible applications: budgets, policy enforcement, tool guardrails, and span-first traces.

## Install

```bash
npm install @captar/sdk
```

## Quick start

```ts
import { createCaptar } from '@captar/sdk';

const captar = createCaptar({
  project: 'my-app',
  controlPlane: {
    hookId: process.env.CAPTAR_HOOK_ID!,
    baseUrl: process.env.CAPTAR_CONTROL_PLANE_URL,
    syncPolicy: true,
  },
});

const session = await captar.startSession({
  budget: { maxSpendUsd: 1 },
});

const openai = captar.wrapOpenAI(client, { session });
// Use `openai` as your normal OpenAI-compatible client.

await session.close();
await captar.flush();
```

For hosted trace ingestion, configure `CAPTAR_INGEST_URL` and `CAPTAR_INGEST_API_KEY`. Keep your model-provider SDK and API keys; Captar wraps the client rather than acting as an LLM gateway.

Documentation: https://captar.aurat.ai/docs
