# Session Handoff

## Marketing redesign — implementation and preview verified

- Issue #235; PR #236; branch `feat/235-marketing-redesign`. Earlier blocked SDK/docs work is included in this delivery. GitHub and Vercel access recovered; historical blocked notes below are superseded by this entry.
- Completed a compact three-section landing with original graphite/ivory/signal-yellow styling, large typography, animated resource illustration, adjustable request ceiling, replay, copy install, pause control, reduced-motion CSS, and simplified responsive navigation/footer.
- Compared Trigger.dev, Inngest, and Langfuse in the browser. Kept implemented execution-control positioning; no unsupported AI/global-budget promises or copied third-party assets.
- Final application source: remote commit `3597169e92ca3c46464f91356a902134d639f4d7`; final preview `https://captor-marketing-7k74948w6-8dazos-projects.vercel.app`, Vercel READY. The following commit only records this handoff.
- GitHub build, lint-and-test, Node 24 compatibility, and Vercel checks all succeeded for that application commit. Local production build generated 41 pages; marketing lint and TypeScript passed. Included SDK work passed 175 tests, packed-consumer and JSONL/SQLite fresh-process checks.
- Browser verified blocking request five at limit four, completion at six, keyboard slider, replay, clipboard feedback, motion pause, and quickstart navigation. Reviewed hero and lower sections; final gauge correction and popup removal verified. No app console errors observed; extension noise excluded.
- Mobile-device/reduced-motion emulation was unavailable. Responsive and reduced-motion styles were reviewed, but mobile visual verification is not claimed.
- Next delivery action: mark PR #236 ready, merge through GitHub after checks, and verify `https://captar.aurat.ai`. PR and Vercel deployment state are authoritative for subsequent delivery status.
- Database stays paused. No reseed, schema mutation, npm publication, version bump, or hosted authenticated DB validation.

## Execution readiness — committed locally, remote delivery blocked

Branch: `fix/155-execution-readiness`; base main `fd27099`. References #155, #210, #228. No new issue, remote branch, or PR was created. Direct `git push -u origin fix/155-execution-readiness` failed with `could not read Username for https://github.com`; there are no working push credentials in this session. GitHub and Vercel connector requests fail with HTTP 400 `Invalid MCP request metadata`, including a final read-only retry.

Delivered in the working branch:

- `runStored` and stored backfills persist ordinary failure receipts and retain the original thrown value when saving succeeds. Final save failure raises `RunPersistenceError` with receipt, storage cause, and original execution error.
- Nested failures finalize the correct outer receipt. Backfill and Prisma cleanup preserve contract failures.
- Nine additional core regressions (29 core tests total) cover ordinary/primitive/nested errors, persistence failure, partial replay, corrupt JSONL, and Prisma post-query violations.
- Runnable metric-based quickstart and JSONL recovery demo: stop at four, restart for two, independently verify six, inspect CLI history. Existing SQLite recovery retained.
- Execution docs/nav/home/pricing/story/FAQ/footer/contact and OG copy aligned; AI compatibility URLs retained; fake newsletter removed. Pilot and release checklists updated. Marketing main-only Git deployment prepared.
- CI/release run the recovery demo; packed-package smoke executes the quickstart and new failure APIs. No npm publish or version bump.

Passed locally on Node 24.19.0: 175 core/SDK tests (28 files), core/SDK TypeScript builds, release metadata check, typed clean packed npm consumer, SQLite fresh-process smoke, JSONL recovery demo, marketing ESLint, content build (26 docs), Next production build (41 pages), and rendered content/doc links on 14 routes. Node 22 CI is configured but not run remotely. No browser visual review or hosted authenticated test was completed.

Local setup notes: initial pnpm wrapper invoked an unsolicited install and modified lock/workspace files; those generated changes were restored. Package smoke now invokes the installed TypeScript binary directly. Missing lint plugin links in reused local dependencies were repaired; final lint/build pass. No dependency or lockfile changes are part of this delivery.

Database work remains paused per the user's instruction to skip the access problem and move SDK/marketing forward. No reseed, schema change, or data deletion occurred. Platform #232 deployed previously with #234, but authenticated receipt import still needs schema rollout and validation.

Next remote steps: push branch if needed, create issue-linked PR referencing #155/#210/#228, run GitHub checks, review/merge via PR, verify marketing Vercel deployment after main-only Git configuration lands. Resume database work separately when explicitly revisited. Do not push directly to main.

## Active delivery — execution readiness

- User requested SDK reliability, recovery demo, docs/marketing alignment, validation, and deployment in one delivery. Database reseeding is paused.
- Local branch: `fix/155-execution-readiness`; existing tracking references: #155 (runtime hardening), #210 (UI audit), #228 (real-user validation).
- New umbrella issue creation failed with connector HTTP 400 `Invalid MCP request metadata`. No new issue or PR has been created; do not claim remote delivery until verified.
- Plan: preserve ordinary failure receipts and original errors; cover persistence/recovery boundaries; fix metric examples; run a fresh-process demo; align docs and marketing with implemented capabilities; prepare pilot checklist; validate before PR/deployment.
- Baseline: main `fd27099`; platform deployment READY after #234. Marketing Git deployment remains disabled. Baseline execution suite: 20 passing tests.

## Active delivery — 2026-09-21

- Issue #231; branch `feat/231-execution-run-inspector`.
- User approved the connected GitHub integration in place of `gh`.
- Implement receipt-backed project Runs, detail and JSON export with explicit JSON/JSONL import.
- Preserve legacy trace routes. SDK receipts omit contract snapshots, release history and resume lineage; do not fabricate them.
- Additive database schema only; no production migration/deployment.

### Implementation and verification

- Added authenticated project-scoped `/projects/:projectId/runs` and `/runs/:recordId` pages, search/status filters, 25-row pagination, receipt import dialog and JSON export.
- Runs use `ExecutionReceiptRecord`; legacy trace URLs stay intact under AI traces navigation.
- JSON/JSONL/array imports validate the SDK receipt format, cap size/count, retain the final occurrence of each ID within a file, and skip existing project IDs without overwriting evidence.
- Inspector presents resource totals/limits, violations, metrics, checkpoints and raw JSON. It explicitly identifies snapshot semantics and missing contract/release/resume evidence.
- 41 platform tests pass, including receipt compatibility, malformed files, cross-project query scoping, membership-gated writes and authenticated/private exports.
- Generated Prisma client, built types/config dependencies, platform TypeScript check and Next production build pass.
- Installed dependencies with the runtime's pnpm fallback; it exited on ignored dependency lifecycle scripts. Required binaries were present, and Prisma generation/tests/typecheck/build ran successfully directly. No dependency or build-policy changes retained.
- Browser verification attempted: agent-browser daemon failed to start; local preview socket creation returned EPERM. No browser or authenticated database E2E success is claimed.
- No configured database. Before deployment, apply the reviewed additive SQL in `db/sql/231_execution_receipts.sql` (existing-schema database) or use the existing `db:push` workflow for disposable development. Then verify authenticated import → list → detail → export, desktop/mobile and keyboard paths.
- Full contracts editor, backfill execution management and marketing/docs migration remain out of scope.

## Current state

- Date: 2026-09-14
- Latest `main`: `9a32b044bc4e20ca78150509f54796e834a45b44`
- Latest observed CI and Build runs on `main`: successful
- Open GitHub issues observed during this session include `#81` and `#72`
- Active delivery: none; working tree returned to `main` after PR `#151` merged

## Latest dialog fix

- The shared `DialogTitle` and `DialogDescription` wrappers rendered plain HTML elements, so Radix could not associate them with `DialogContent`.
- Delegate those wrappers to `DialogPrimitive.Title` and `DialogPrimitive.Description` while preserving the existing styles.
- Delivered through issue `#150` and merged PR `#151`.

## Latest fix

- Namespaced the Auth.js JWT session cookie as `captar.session-token` in local HTTP development and `__Secure-captar.session-token` for HTTPS/production.
- This prevents unrelated or stale default `authjs.session-token` cookies on localhost from causing `JWTSessionError: JWEInvalid` during login-page rendering.
- A configured `DATABASE_URL` is still required to submit credentials; that is separate from the cookie decoding error.
- Delivered through issue `#147` and merged PR `#148`.

## Previously completed and merged via PR `#145`

- Rebuilt the platform design system around a restrained black/graphite palette derived from the marketing app, removing the previous cyan/neon treatment.
- Reworked the authenticated shell with persistent desktop navigation, compact mobile navigation, project-aware route links, system status, user identity, and sign-out affordances.
- Rebuilt the login experience as a responsive product/auth split layout with clearer positioning, credential fields, trust messaging, and mobile treatment.
- Replaced all platform Lucide usage with a typed Hugeicons adapter and removed the Lucide dependency from the platform.
- Restyled shared cards, metrics, tables, buttons, inputs, textareas, selects, dialogs, tabs, badges, code payloads, skeletons, empty states, not-found, and error states so every route inherits one visual language.
- Added a projects page heading, search treatment, interactive project cards, and filtered empty state.
- Added `metadataBase` to remove the platform metadata warning.
- Removed the platform's unused invalid `@captar/sdk` workspace dependency, which blocked dependency updates because the SDK package is currently named `captar`.
- Preserved existing server data access, actions, API routes, and mutations.

## Validation

- `pnpm --filter @captar/platform lint` passes.
- `pnpm --filter @captar/platform test` passes: 4 files, 18 tests.
- Production build passes with a temporary syntactically valid database URL and auth secret.
- Dialog accessibility fix compiles with the shared title and description wrappers bound to their Radix primitives.
- A request carrying the malformed legacy `authjs.session-token=garbage` cookie returns `200` from `/login` without emitting `JWTSessionError`.
- Browser verification passes for `/login` at desktop and 390 px mobile widths with no blank page or framework overlay.
- Authenticated visual verification requires a real `DATABASE_URL`; this checkout has no `.env` and no local PostgreSQL service.

## Product status

The repository is past the original pre-MVP state. The TypeScript SDK, OpenAI-compatible wrapping, runtime budgets/policies, span-first tracing, platform ingest and trace inspection, trace-backed datasets, manual eval flows, marketing docs migration, and CI/deploy workflows are present on `main`.

## Product decision still required

Issue `#72` contains speculative pricing. It should not be completed by guessing. Before implementation, approve the Free/Pro/Enterprise prices, limits, and which listed features are live versus coming soon.

## Next steps

- Configure a local `DATABASE_URL`, run the seed, and perform an authenticated browser pass before additional UI iteration.
