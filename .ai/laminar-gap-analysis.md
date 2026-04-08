# Laminar Gap Analysis

- Last reviewed: 2026-04-08
- Sources reviewed:
  - `https://laminar.sh/`
  - `https://docs.laminar.sh/platform`
  - `https://docs.laminar.sh/analyze`
  - `https://docs.laminar.sh/evaluations`
  - `https://docs.laminar.sh/datasets/adding-data`

## What Laminar emphasizes

- Rich trace debugging with tree, timeline, reader-style views, and live updates
- Span-level observability as the shared primitive
- Datasets and evaluation workflows connected to traces
- Higher-level analysis surfaces like signals, search, SQL, and dashboards

## What Captar already has

- Runtime session control
- Budget reservation and reconciliation
- Tool tracking hooks
- Policy sync and platform ingest
- Payload retention and violation records

## What Captar needs for v1 parity direction

- Persisted spans with stable hierarchy and lifecycle state
- Trace UI designed around spans, not only raw event rows
- Cleaner workflow for turning findings into issues and PRs

## What stays after v1

- Dataset management
- Evaluation runners and scoring
- Signals and analysis layers
- Search and SQL interfaces
- Dashboards, alerts, queues, debugger, and playground

