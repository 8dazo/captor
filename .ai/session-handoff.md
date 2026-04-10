# Session Handoff

## Start state

- Date: 2026-04-10
- Umbrella issue: `#3`
- Active milestone issue: `#28`
- Goal: move the current Captar docs content into the docs section inside `apps/marketing` while preserving the existing docs writing format

## Current progress

- Repo memory and workflow docs are committed in-tree
- Span-first tracing is implemented across SDK types, request flows, and tool flows
- Platform ingest persists spans, span metadata, and idempotent ledger or violation records
- Platform trace page now renders tree, timeline, events, payloads, and violations
- GitHub issue templates, PR template, label sync, and branch protection scripts are added
- Dataset milestone is merged
- Manual eval milestone is merged
- Issue `#28` is created on GitHub and work is happening on `feat/28-mintlify-docs-polish`
- `apps/docs` now uses Mintlify with `docs.json` at the docs root and root-level MDX pages
- The docs home page at `/` is rebuilt as a branded SDK-first landing page with a proper logo/name header
- The docs content is reorganized under root-level Mintlify sections into getting started, core concepts, platform, and reference
- The docs app now validates through the Mintlify CLI
- Validation passed with `pnpm --filter @captar/docs lint` and `pnpm --filter @captar/docs build`
- The imported `apps/marketing` app is copied into the issue worktree so the existing marketing docs shell can be used as the new target for Captar docs content
- The current Captar docs tree from `apps/docs` is copied into `apps/marketing/content/docs` under getting started, core concepts, platform, and reference
- The marketing docs navigation now reflects the Captar docs hierarchy, with introduction, SDK-first sections, and platform pages grouped under the existing docs shell
- The marketing MDX renderer now supports the current Captar docs writing primitives such as `Cards`, `Card`, `Steps`, `Step`, `Files`, `Folder`, `File`, and Mintlify-style `Tabs` plus `Tab`
- Internal docs links from the copied standalone docs content are automatically routed under `/docs`, and the marketing docs content slug for the root page now resolves to `/docs`
- The Captar docs logo asset is copied into the marketing public assets for the migrated docs landing page
- The imported marketing app is now locally installable inside this repo without the missing `@workspace/*` packages by using local route, common, UI, Tailwind, PostCSS, ESLint, and env shims
- `components.json` is configured for the marketing app and shadcn/ui components are generated into `apps/marketing/components/ui`
- Validation passed with `pnpm --filter marketing build:content` and `pnpm --filter marketing typecheck`
- The marketing app now runs locally with `pnpm --filter marketing dev`, and `/`, `/docs`, and `/docs/getting-started/quickstart` each return `200`
- The dev script uses plain `next dev --port 3001` because the imported home page hit SVG import issues under Turbopack

## Next steps

- Decide whether to keep `apps/docs` in parallel during migration or switch traffic to the marketing docs route after the marketing app is made installable
- Commit the issue branch changes and open the PR linked to `#28`
