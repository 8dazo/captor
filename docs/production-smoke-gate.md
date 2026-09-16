# Production smoke gate

This checklist is the boundary between the runtime-hardening program (#155) and the first real production provider validation (#126).

**Current state:** do not deploy or execute the provider smoke while `apps/platform/vercel.json` and `apps/marketing/vercel.json` have `git.deploymentEnabled: false`.

## Preconditions

All items below must be true before opening a deployment re-enable PR:

- [ ] #157 strict unknown-pricing behavior is merged to `main`.
- [ ] #158 budget planner/output-token ceiling is merged to `main`.
- [ ] #159 reconciliation/overrun signaling is merged to `main`.
- [ ] #160 session call-count and concurrency controls are merged to `main`.
- [ ] #161 strict-enforcement regression matrix is merged to `main`.
- [ ] `main` CI and Build workflows are green.
- [ ] `node scripts/smoke-sdk-package.mjs` passes in GitHub CI.
- [ ] Vercel Git deployments are still disabled.
- [ ] No provider or ingest secret is committed to the repository.

## Deployment gate

Re-enable deployment only in a separate PR whose sole operational purpose is opening the smoke-test window.

For both Vercel app roots, change the Git block from:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

to a main-only deployment policy:

```json
{
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

Before merging that PR:

1. Verify the diff does not contain application behavior changes or secrets.
2. Verify GitHub CI/Build are green.
3. Record the exact `main` SHA that will be deployed.
4. Confirm the production Vercel environment already contains the required provider key and Captar ingest configuration.

## Smoke harness requirements

A temporary production smoke route or script must be inert by default and must never expose credentials in a response, log, query parameter, source file, or client bundle.

The smoke must exercise the published/packaged `captar` SDK through the same public API an application uses:

1. Create a Captar instance for a dedicated smoke project/hook.
2. Start a session with a hard USD budget.
3. Wrap an OpenAI-compatible client.
4. Execute the allowed case below.
5. Execute the blocked case below in a fresh session.
6. Flush telemetry.
7. Confirm the expected platform records.

## Case A — allowed request

Use an explicitly priced provider/model entry and a conservative hard budget that comfortably covers one short response.

Expected evidence:

- provider function is invoked exactly once;
- outgoing request contains Captar's enforced output-token ceiling when a hard budget applies;
- request is recorded as started then allowed;
- an estimate is reserved before provider execution;
- provider usage is reconciled to committed spend;
- reserved spend returns to zero after completion;
- trace/span status is completed;
- platform trace shows provider, model, token usage, estimated cost, and actual cost.

Failure conditions:

- missing/incorrect provider/model pricing;
- provider request has no expected token ceiling;
- actual spend silently exceeds the session budget;
- reservation is leaked after completion;
- trace/ledger records are missing or contradictory.

## Case B — locally blocked request

Use the same provider/model but set the session budget below the conservative cost of the input plus one affordable output token, or otherwise configure a deterministic hard policy violation.

Expected evidence:

- provider function is invoked zero times;
- request is recorded as blocked;
- the block reason identifies the budget/policy constraint;
- no provider spend is committed;
- any temporary reservation is fully released;
- the platform shows the blocked trace/violation.

This case is the key production proof: a request that cannot fit the configured runtime policy must be stopped before the provider call.

## Optional Case C — unknown pricing

Use a provider/model combination with no registry entry or override.

Expected evidence:

- provider function is invoked zero times;
- Captar returns the typed policy error describing missing pricing;
- the platform records the request as blocked;
- no spend is reserved/committed beyond zero-value bookkeeping required by the current event model.

## Evidence to attach to #126

Record only non-secret evidence:

- deployed `main` commit SHA;
- Vercel deployment identifier/URL for the platform deployment;
- SDK/package version under test;
- provider and model names;
- Captar trace/session identifiers;
- allowed-case budget, enforced output-token ceiling, estimated cost, actual cost, and final session state;
- blocked-case budget, error type/message, provider invocation count, and final session state;
- screenshots or sanitized event excerpts if useful.

Never attach provider keys, ingest API keys, auth cookies, database URLs, or raw sensitive prompts/responses.

## Cleanup immediately after the smoke

1. Remove any temporary production-only route/harness in a dedicated cleanup PR.
2. Verify CI/Build.
3. Merge the cleanup PR.
4. Decide explicitly whether normal main-only Vercel deployment should remain enabled or whether to re-freeze it until the next release window.
5. Close #126 only after both allowed and blocked production cases are verified and cleanup is merged.
6. Update #155 with the final pre-production hardening status.

## Rollback

If the deployment itself fails or either smoke case violates an enforcement invariant:

1. Stop smoke execution; do not retry with a larger budget merely to make it pass.
2. Restore `git.deploymentEnabled: false` if it was re-enabled.
3. Roll back the smoke-route change if one was introduced.
4. Attach sanitized failure evidence to #126 and open a focused bug issue under #155.
5. Fix and prove the regression in credential-free CI before opening another production gate.

Production smoke execution is intentionally **not** part of #162. This document prepares the gate; #126 owns the actual production validation once #155 is complete.
