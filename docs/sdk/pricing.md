# SDK pricing registry

Captar's built-in OpenAI pricing is a **versioned, verified snapshot**, not a promise that provider prices never change.

## Current snapshot

- Snapshot version / verification date: `2026-09-16`
- Freshness gate: 120 days
- Primary source: https://developers.openai.com/api/docs/models
- Unknown provider/model pairs remain fail-closed until an explicit pricing entry or override is supplied.

The snapshot includes the current OpenAI aliases used by Captar's OpenAI-compatible wrapper:

| Model | Input / 1K | Cached input / 1K | Cache write / 1K | Output / 1K |
| --- | ---: | ---: | ---: | ---: |
| `gpt-6-astra` | $0.0100 | $0.0010 | $0.0125 | $0.0500 |
| `gpt-5.6-sol` | $0.0040 | $0.0004 | $0.0050 | $0.0200 |
| `gpt-5.6` (Sol alias) | $0.0040 | $0.0004 | $0.0050 | $0.0200 |
| `gpt-5.6-terra` | $0.0020 | $0.0002 | $0.0025 | $0.0120 |
| `gpt-5.6-luna` | $0.0002 | $0.00002 | $0.00025 | $0.0012 |

The existing `gpt-4.1`, `gpt-4.1-mini`, and `gpt-4o-mini` standard text-token entries are also re-verified in the same snapshot.

## Long-context pricing

For GPT-5.6-family models and GPT-6 Astra, requests with **more than 272,000 input tokens** are locally priced using:

- 2× input-side rates, including cached input and cache writes;
- 1.5× output rate for the full request.

The preflight estimator uses Captar's conservative input-token upper bound. This may apply the long-context multiplier earlier than an exact provider tokenizer would, but it must not under-reserve a hard USD budget. Postflight local calculation uses provider-reported token counts when available.

## Prompt-cache writes

Current Responses usage can report `input_tokens_details.cache_write_tokens`. Captar accounts for those tokens separately using the snapshot's cache-write rate.

If a current model can incur cache-write billing but the usage payload omits cache-write detail, Captar charges the remaining uncached input at the higher cache-write rate and marks the local price as `pricingConservative: true` / upper-bound rather than pretending the cost is exact.

## Service tiers

The current registry schema keys prices by **provider + model**, not by service tier. Built-in entries therefore represent Standard/default token pricing. Captar accepts an omitted, `auto`, or `default` request tier. OpenAI documents `auto` as using the Project setting and defaulting to Standard unless the Project is configured otherwise.

An explicitly requested non-standard tier such as `flex`, `fast`, `priority`, or `ultrafast` fails closed before provider execution. A normal `pricingOverrides` entry does not bypass this guard because it cannot prove which tier the override represents. Tier-specific local pricing needs a future tier-keyed pricing contract rather than an ambiguous model-level number.

GPT-6 Astra's model page, for example, documents Batch/Flex at 50% of Standard and Fast at 2× applicable rates; those alternate processing prices are intentionally not inferred from a generic flat entry today.

If an OpenAI Project changes its `auto` default away from Standard, do not rely on the built-in local registry for exact pricing until tier-aware configuration exists. Provider-reported numeric `usage.cost`, where available from a provider/router integration, remains authoritative postflight, but Captar still requires a safe preflight price before a hard-budget request is admitted.

## Provenance in telemetry

`request.allowed`, `estimate.reserved`, `provider.response`, and `spend.committed` carry:

- `pricingVersion`
- `pricingSource`
- `pricingConservative`
- `longContextMultiplierApplied`

A built-in entry overridden by `pricingOverrides` is marked `custom_override` and gets a `+custom` pricing version so historical records do not falsely claim the unmodified built-in snapshot.

Provider-reported numeric `usage.cost` remains authoritative when present. Pricing provenance still records the registry used for preflight reservation.

## Updating the snapshot

The config test suite rejects a built-in snapshot older than `OPENAI_PRICING_SNAPSHOT_MAX_AGE_DAYS`. Updating prices requires:

1. verify rates and aliases against first-party provider documentation;
2. update the snapshot version/date and source-specific rules;
3. update cache-write and long-context rules when provider semantics change;
4. run the SDK's pricing accounting, full test, Build, and external package-install gates;
5. preserve unknown-model fail-closed behavior.

The current GPT-5.6 Sol price is promotional through at least November 21, 2026 according to OpenAI's model documentation, so this snapshot should be re-verified before that date even if the generic 120-day freshness gate has not yet expired.
