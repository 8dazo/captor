# captar

Runtime control for OpenAI-compatible applications: budgets, policy enforcement, tool guardrails, and span-first traces.

## Install

```bash
npm install captar
```

## Quick start

```ts
import { createCaptar } from 'captar';

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

## OpenRouter and other OpenAI-compatible providers

Set `provider` when the wrapped client is not OpenAI so Captar records the correct provider in traces, spend events, and pricing lookups.

```ts
const session = await captar.startSession({
  budget: { maxSpendUsd: 1 },
});

const openrouter = captar.wrapOpenAI(openrouterClient, {
  session,
  provider: 'openrouter',
});

await openrouter.chat.completions.create({
  model: 'openrouter/free',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

`provider` defaults to `openai`, so existing integrations do not need to change.

When an OpenAI-compatible provider returns an authoritative numeric `usage.cost`, Captar uses that value as the actual committed USD cost. This is useful for routers such as OpenRouter where the final upstream and price may be selected dynamically. Local pricing remains the fallback when the provider does not report cost, and you can still add pricing overrides for providers or models that need estimate-time budget enforcement.

For hosted trace ingestion, configure `CAPTAR_INGEST_URL` and `CAPTAR_INGEST_API_KEY`. Keep your model-provider SDK and API keys; Captar wraps the client rather than acting as an LLM gateway.

Documentation: https://captar.aurat.ai/docs
