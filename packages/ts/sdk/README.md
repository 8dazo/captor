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

## Provider-hosted tool charges

Provider-hosted tools can have non-token fees. Under a finite `maxSpendUsd`, Captar fails closed rather than treating those fees as zero.

Configure conservative per-invocation prices on the wrapped client and give the provider a finite `max_tool_calls` ceiling whenever a configured hosted tool has a positive price:

```ts
const openai = captar.wrapOpenAI(client, {
  session,
  providerToolCostsUsd: {
    web_search: 0.01, // use the current price applicable to your provider/account
  },
});

await openai.responses.create({
  model: 'your-model',
  input: 'Find the latest information',
  tools: [{ type: 'web_search' }],
  max_tool_calls: 2,
});
```

Captar reserves `max_tool_calls ×` the highest configured per-call price among the hosted tools available to that request. This is intentionally conservative because the model may choose any of the supplied hosted tools. If hosted-tool pricing is unknown, or a positive hosted-tool price has no `max_tool_calls` ceiling, the request is blocked before provider execution when the session has a hard USD budget.

Local `function` and `custom` tools are not included in this provider-hosted charge reservation; account for application tools with `captar.trackTool()` instead. Explicit zero-cost hosted-tool entries are supported. If the provider later returns an authoritative numeric `usage.cost`, Captar uses that value for postflight reconciliation instead of the conservative local estimate.

Provider pricing changes over time, so Captar does not hard-code hosted-tool prices into this option. Keep `providerToolCostsUsd` aligned with the provider/account pricing you actually use.

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
