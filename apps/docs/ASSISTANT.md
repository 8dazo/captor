# Captar Docs Assistant

This directory contains the Mintlify docs site for Captar.

## Context

- Product name: Captar
- Scope: traces-first runtime control for OpenAI and OpenAI-compatible apps
- Docs stack: Mintlify
- Docs root: `apps/docs`

## Brand rules

- Use the shared logo from `logo.png`.
- Write `Captar` with the italic serif wordmark in the landing header.
- Keep the visual style clean, readable, and professional in both light and dark themes.

## Content rules

- Keep v1 docs focused on SDK, traces, budgets, tool tracking, datasets, and manual evals.
- Do not imply support for out-of-scope v1 features like dashboards, signals, SQL exploration, alerts, or playgrounds.
- Prefer clear examples and practical explanations over decorative filler.

## Local commands

```bash
pnpm --dir apps/docs dev
pnpm --dir apps/docs lint
pnpm --dir apps/docs build
```
