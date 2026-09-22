# GitHub Backlog

## 2026-09-22 delivery update

- #155 / #210: reliability and execution-focused marketing changes prepared on `fix/155-execution-readiness`; local verification complete. These references do not imply the full older issues are closed.
- #228: three-developer pilot checklist prepared at `docs/product/pilot-checklist.md`; recruitment and results remain pending.
- #231: implementation merged via PR #232. Additive schema rollout and authenticated hosted verification remain pending.
- #233: platform main-only Git deployments restored via merged PR #234. Marketing deployment configuration is prepared in the active branch.
- A new umbrella issue and remote delivery are blocked by GitHub connector metadata errors. Historical backlog notes below may describe earlier states.

## Active

- `#231` Execution receipt Runs and Run Detail — implemented on `feat/231-execution-run-inspector`; review and database-backed/browser verification pending.
- `#210` Existing UI audit — this receipt slice does not complete the entire rebuild.
- `#228` Real-user validation of production backfills remains a separate milestone.

- `#81` Add Captar company profile and OG images — implementation active on `feat/81-company-profile-og-images`
- `#72` Finalize pricing page with real Captar pricing tiers — blocked on an approved pricing decision; do not invent plan limits or prices

## Recently completed foundation

- `#150` Dialog accessibility primitives, merged via PR `#151`
- `#147` Platform Auth.js cookie isolation, merged via PR `#148`
- `#143` Platform dashboard and authentication UI revamp, merged via PR `#145`
- V1 traces-first SDK and platform foundation
- Span-first trace ingest and inspection
- Trace-backed datasets and file imports
- Manual evaluation runs and reviewer scoring
- Captar docs migration into the marketing app
- CI/build and Vercel deployment workflow fixes

## Next candidate issues

- Define the online evaluator model after manual eval rubrics and run snapshots settle
- Add signals over trace, dataset, and eval activity after reviewer workflows exist
- Export eval results and summaries for downstream analysis or benchmarking
