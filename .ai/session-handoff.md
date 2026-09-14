# Session Handoff

## Current state

- Date: 2026-09-14
- Latest `main`: `32c1bd69bf646c6fdf779e77098120959600846b`
- Latest observed CI and Build runs on `main`: successful
- Open GitHub issues observed: `#81` and `#72`
- Active delivery: `#81` on `feat/81-company-profile-og-images`

## Product status

The repository is past the original pre-MVP state. The TypeScript SDK, OpenAI-compatible wrapping, runtime budgets/policies, span-first tracing, platform ingest and trace inspection, trace-backed datasets, manual eval flows, marketing docs migration, and CI/deploy workflows are present on `main`.

## Work completed in the active branch

- Reworked the reusable OG card to accept page-specific eyebrow, title, and description content while keeping Captar branding.
- Added OG variants for home, docs, pricing, and the company/story page.
- Added default Twitter large-card metadata at the root layout.
- Added page-specific Open Graph and Twitter metadata to pricing and story.
- Added docs Open Graph/Twitter image metadata while preserving per-document titles and descriptions.
- Added canonical host and sitemap values to `robots.ts`.
- Synced `.ai/current-focus.md` and `.ai/github-backlog.md` with current GitHub state.

## Product decision still required

Issue `#72` contains speculative pricing. It should not be completed by guessing. Before implementation, approve the Free/Pro/Enterprise prices, limits, and which listed features are live versus coming soon.

## Next steps

- Open a PR for `feat/81-company-profile-og-images` linked to `#81`.
- Let GitHub Actions run CI/build validation on the PR.
- Fix any PR validation failures before merge.
- Merge through the PR only when checks pass.
- After merge, close `#81` if GitHub does not close it automatically.
- Resolve the pricing decision for `#72`; after that it is the only known open issue from this audit.
