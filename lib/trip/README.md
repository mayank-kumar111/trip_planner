# `lib/trip`

Core trip domain rules and generation orchestration.

## Responsibilities
- `date-rules.ts` — authoritative travel-date normalization/derivation.
- `validation.ts` — runtime semantic trip-plan validation.
- `place-identity.ts` — canonical place identity and deduplication.
- `generation-job.ts` — stale/retry/claim policy.
- `generation-pipeline.ts` — stage orchestration and failure semantics.
- `background-processing.ts` — production background service around the pipeline.
- `routing.ts` — reusable itinerary route enrichment.

## Impact
This directory contains critical correctness and cost controls. Changes should normally include regression tests and full CI verification.
