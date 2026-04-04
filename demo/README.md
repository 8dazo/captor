# Live Demo

This folder lets you run Captar against a real OpenAI-compatible endpoint and inspect the actual provider response, session spend state, and exported events.

## Prerequisites

- A real API key
- The local platform app running if you want to see ingest behavior
- `openai` installed in the workspace root

## Install

```bash
pnpm add openai
```

## Environment

The demo script reads `demo/.env`.

Recommended OpenRouter values:

```env
OPENAI_API_KEY=your_openrouter_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openrouter/free
OPENAI_SURFACE=chat.completions
OPENAI_TIMEOUT_MS=30000
CAPTAR_CONTROL_PLANE_URL=http://localhost:3000
CAPTAR_CONTROL_PLANE_PROJECT_ID=
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_TITLE=Captar Live Demo
```

## Start the local ingest stub

```bash
pnpm --filter @captar/platform dev
```

The local platform app may start on `3001` if `3000` is busy. If that happens, update `CAPTAR_CONTROL_PLANE_URL` in `demo/.env` to match the printed port.

If `CAPTAR_CONTROL_PLANE_PROJECT_ID` is empty, the demo auto-creates a project and prints the dashboard URL.

## Run the live demo

```bash
pnpm demo:live
```

## What you should see

- The real provider response payload
- The reconciled Captar session state
- The final session summary
- Event batches accepted by the local ingest endpoint
