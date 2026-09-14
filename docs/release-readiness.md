# Release readiness

This is the minimum production release gate for Captar V1.

## Automated gates

Pull requests and `main` must pass:

1. repository lint and tests;
2. TypeScript builds for `@captar/types`, `@captar/config`, `@captar/utils`, and `@captar/sdk`;
3. `pnpm pack` for all four public packages;
4. install of those tarballs into a clean npm consumer project;
5. import of `@captar/sdk`, creation of a Captar runtime/session, and exporter flush from that clean project.

The tag release workflow repeats the clean-install smoke before publishing.

## Public npm packages

Publish in dependency order:

1. `@captar/types`
2. `@captar/config`
3. `@captar/utils`
4. `@captar/sdk`

`@captar/ui`, the platform app, and the marketing app are private/internal and must not be published.

A release tag such as `v0.1.0` requires the GitHub Actions secret `NPM_TOKEN`. The token must be able to publish the `@captar` scope. Do not create a release tag until the package names/scope are owned by the npm account used by that token.

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
3. Configure a clean Node 20 app with `@captar/sdk`, the hook id, production ingest URL, and ingest API key.
4. Start a Captar session and wrap an OpenAI-compatible client.
5. Make one successful model call and flush Captar.
6. Confirm the trace appears in the correct project and includes model span, usage/cost metadata, and payload according to redaction policy.
7. Set a deliberately small call/spend budget and confirm the next violating call is blocked.
8. Track one tool call and confirm its span is attached to the trace.
9. Add the trace to a dataset and complete a manual evaluation score.
10. Verify a request to `/api/ingest` without the bearer token returns `401` when the production ingest key is configured.

## Release command path

After all gates are green and production E2E passes, create the release tag matching package versions. The release workflow publishes the four packages and creates the GitHub release.
