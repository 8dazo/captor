# Session Handoff

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
