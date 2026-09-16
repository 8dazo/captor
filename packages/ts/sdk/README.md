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

## Payload retention

When `controlPlane.syncPolicy` is enabled, Captar synchronizes the hook's `payloadRetention` mode together with its policy and applies it **inside the SDK before telemetry leaves the RuntimeSession**. The same minimized event is delivered to `captar.onEvent()` listeners and exporters:

- `none`: `request.started.data.request` and `provider.response.data.response` are omitted.
- `redacted`: payload object/array structure and field names are retained, while scalar values are replaced with `[REDACTED]`.
- `raw`: request and response payload objects are exported unchanged.

Model IDs, usage, spend, policy decisions, trace/session IDs, and other enforcement metadata remain available in every mode. Retention affects telemetry copies only: Captar still evaluates the original request, the provider still receives the original request, and the caller still receives the original provider response.

The hosted ingest path should continue to apply its own retention rules as defense in depth. When no control-plane retention mode is synchronized, the SDK preserves the existing local behavior and treats telemetry payloads as `raw`; configure a synced hook when you need the control plane to govern payload capture.

## Finalization reserve and soft budget threshold

`finalizationReserveUsd` protects part of a hard session budget from ordinary wrapped model calls. Ordinary calls are capped against `maxSpendUsd - finalizationReserveUsd`; create a dedicated finalization wrapper when the application reaches its final-response stage:

```ts
const session = await captar.startSession({
  budget: {
    maxSpendUsd: 1,
    finalizationReserveUsd: 0.2,
    softLimitPct: 0.8,
  },
});

const regular = captar.wrapOpenAI(client, { session });
const finalizer = captar.wrapOpenAI(client, {
  session,
  useFinalizationReserve: true,
});

// Intermediate work cannot consume the protected $0.20.
await regular.responses.create({
  model: 'your-model',
  input: 'Do the intermediate work',
});

// Final-stage calls may consume the protected reserve, but they still cannot
// exceed the session's total maxSpendUsd.
await finalizer.responses.create({
  model: 'your-model',
  input: 'Produce the final answer',
});
```

`useFinalizationReserve` is Captar wrapper configuration and is never serialized into the provider request. Use it on a wrapper dedicated to final-stage execution; multiple calls through that wrapper still share the same hard session ceiling.

When committed spend reaches `maxSpendUsd × softLimitPct`, Captar emits one `guardrail.violation` event for the session with `category: 'spend'`, `softLimit: true`, the threshold percentage/USD value, and committed spend at the crossing. The event fires at most once and applies to both wrapped model spend and `trackTool()` spend. No soft-limit event is emitted when the session has no finite `maxSpendUsd`.

## Session close semantics

`session.close()` is an execution boundary. As soon as close begins, Captar stops admitting new wrapped model calls and tracked-tool runs. Work that was already admitted is allowed to finish, reconcile spend, and emit its terminal request/tool event before the session itself is marked closed.

For streaming requests, the session remains in the draining state until the admitted stream is consumed or otherwise finalized. Call `session.close()` after your application has finished using its active streams; abandoning an admitted stream without finalizing it can intentionally keep the session open because Captar will not emit `session.closed` ahead of an unfinished child request.

Repeated `close()` calls are idempotent and share the same drain operation. After closure, wrapped provider calls and tracked tools reject before provider/user work begins and do not emit child lifecycle events after `session.closed`.

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
