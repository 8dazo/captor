# captar

Captor is a runtime control layer for AI calls.

It enforces spend, tool, and execution policy inside the app runtime with minimal SDK changes, while optionally exporting traces, logs, and spend events to a hosted control plane.

## Positioning

- Stop runaway AI calls before they spend, act, or leak.
- Local hard enforcement first, cloud visibility optional.
- No proxy gateway requirement and no provider key custody by default.

## Layout

```txt
apps/
  docs/        Next.js + MDX docs app
  platform/    thin ingest + local event inspection stub
  site/        reserved for release-candidate marketing site
packages/
  ts/
    config/    pricing snapshots, defaults, env config
    sdk/       runtime SDK, OpenAI wrapping, tools, exporter
    types/     public contracts
    ui/        minimal shared UI helpers
    utils/     pure helpers
  rust/
    core/
    cli/
    bindings/
  python/
    ml/
    workers/
    common/
  schemas/
    openapi/   ingest contract
    protobuf/  reserved for later
    jsonschema/ event + policy schemas
infra/
scripts/
```

## TypeScript Runtime Flow

1. Normalize the provider request.
2. Evaluate call and tool policy locally.
3. Estimate worst-case cost.
4. Reserve budget before execution.
5. Execute the provider or tool call.
6. Reconcile actual usage and release unused reserve.
7. Emit events for traces, spend, and violations.

## Workspace Commands

- `pnpm build`
- `pnpm lint`
- `pnpm test`

## V1 Scope

- TypeScript / Node runtime SDK
- OpenAI `responses.create`
- OpenAI `chat.completions.create`
- Streaming reconciliation
- Tool tracking and approval hooks
- Optional HTTP exporter
- Docs, ingest contract, and thin platform stub
