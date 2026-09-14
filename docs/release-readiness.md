# Release readiness

This is the minimum production release gate for Captar V1.

## Automated gates

Pull requests and `main` must pass:

1. repository lint and tests;
2. TypeScript builds for the `captar` SDK and its internal helper workspaces;
3. `npm pack` for the single public `captar` package with the helpers bundled inside it;
4. install of that tarball into a clean npm consumer project;
5. import of `captar`, creation of a Captar runtime/session, and exporter flush from that clean project.

The tag release workflow repeats the clean-install smoke before publishing.

## Public npm package

The only public npm package is `captar`.

`@captar/types`, `@captar/config`, `@captar/utils`, `@captar/ui`, the platform app, and the marketing app are internal/private and must not be published independently. The SDK tarball bundles the three runtime helper workspaces it needs so consumers only install one package.

The existing public `captar` package was at `0.4.1` before this release, so the next SDK release is `captar@0.5.0` and should use the matching `v0.5.0` Git tag.

A release tag requires the GitHub Actions secret `NPM_TOKEN`. The token must have publish permission for the unscoped `captar` package and, when npm account policy requires it, be configured for automation/bypass-2FA publishing.

## Production platform configuration

Required platform configuration:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` / trusted production host configuration
- `CAPTAR_INGEST_URL`
- `CAPTAR_INGEST_API_KEY` (strong random secret)
- public marketing/platform URLs

When `CAPTAR_INGEST_API_KEY` is configured, `/api/ingest` requires the SDK to send the matching bearer token. Production must configure this value; do not rely on a hook id as an ingestion credential.

## Production E2E smoke

Run this against the production deployment before announcing a release:

1. Sign in to the platform.
2. Create/select a project and create a hook.
3. Configure a clean Node 20 app with `captar`, the hook id, production ingest URL, and ingest API key.
4. Start a Captar session and wrap an OpenAI-compatible client.
5. Make one successful model call and flush Captar.
6. Confirm the trace appears in the correct project and includes model span, usage/cost metadata, and payload according to redaction policy.
7. Set a deliberately small call/spend budget and confirm the next violating call is blocked.
8. Track one tool call and confirm its span is attached to the trace.
9. Add the trace to a dataset and complete a manual evaluation score.
10. Verify a request to `/api/ingest` without the bearer token returns `401` when the production ingest key is configured.

## Release command path

After all gates are green and production E2E passes, create the release tag matching the public package version. The release workflow publishes `captar` and creates the GitHub release.
