# Captar Docs

This app now uses Mintlify instead of Fumadocs.

## Run locally

From the repo root:

```bash
pnpm install
pnpm --filter @captar/docs dev
```

The docs site starts with `npx mint dev`, so you do not need a local Mintlify
global install if you prefer the `pnpm` script.

## Validate

```bash
pnpm --filter @captar/docs lint
pnpm --filter @captar/docs build
```

Both commands run `npx mint validate`.

## Content structure

- `docs.json` defines the Mintlify navigation and branding.
- Root-level `*.mdx` files are the live docs pages.
- The Captar logo is copied from the shared monorepo asset into `apps/docs/logo.png`.
