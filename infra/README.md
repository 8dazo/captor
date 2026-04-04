# Captar Infra Notes

V1 keeps hard enforcement local to the SDK. The hosted side is optional and starts with a thin ingest surface for traces and spend events.

## Intended Stack

- Postgres: orgs, projects, API tokens, policies, budget configs
- ClickHouse: high-volume event storage, traces, span events, aggregations
- Queue: async ingest fan-out, alert jobs, webhook delivery
- Next.js platform app: ingest endpoint, local inspection UI, health checks

## V1 Scope

- Local development can point the SDK exporter at `apps/platform/api/ingest`.
- Health endpoint lives at `apps/platform/api/health`.
- Shared-budget reservation services are intentionally deferred.
- Protobuf is intentionally deferred; JSON over HTTP is enough for v1 validation.
