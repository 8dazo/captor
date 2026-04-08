# Session Handoff

## Start state

- Date: 2026-04-08
- Umbrella issue: `#3`
- Active milestone issue: `#25`
- Goal: rebuild `apps/docs` with Mintlify, an SDK-first hierarchy, a branded landing page, and a clean header/search experience

## Current progress

- Repo memory and workflow docs are committed in-tree
- Span-first tracing is implemented across SDK types, request flows, and tool flows
- Platform ingest persists spans, span metadata, and idempotent ledger or violation records
- Platform trace page now renders tree, timeline, events, payloads, and violations
- GitHub issue templates, PR template, label sync, and branch protection scripts are added
- Dataset milestone is merged
- Manual eval milestone is merged
- Issue `#25` is created on GitHub and work is happening on `feat/25-fumadocs-notebook-docs`
- `apps/docs` now uses Mintlify with `docs.json` at the docs root and root-level MDX pages
- The docs home page at `/` is rebuilt as a branded SDK-first landing page with a proper logo/name header
- The docs content is reorganized under root-level Mintlify sections into getting started, core concepts, platform, and reference
- The docs app now validates through the Mintlify CLI
- Validation passed with `pnpm --filter @captar/docs lint` and `pnpm --filter @captar/docs build`

## Next steps

- Review the docs pages in the browser for final copy and hierarchy polish
- Commit the branch changes and open the PR linked to `#25`
