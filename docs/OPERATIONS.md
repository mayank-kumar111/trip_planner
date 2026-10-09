# Operations Handbook

## 1. Purpose

This document explains how to operate Trip Planner during a small controlled beta.

## 2. What to watch

Monitor these signals regularly:

- generation success/failure;
- worker dispatch/lease failures;
- provider failures;
- Places request and cache counters;
- Routes request and cache counters;
- generation duration;
- quota reconciliation problems;
- duplicate place lookups;
- authorization errors;
- crash/error volume.

The current application records useful per-request/job signals, worker lease state, and provider counters, but a full production dashboard is still future work.

## 3. Initial beta limits

Keep the first cohort small enough for manual observation. Do not infer production SLO compliance from the automated test suite.

Pause onboarding if you observe:

- repeated generation failures;
- quota inconsistencies;
- cross-user authorization problems;
- unexpectedly high provider usage/cost;
- repeated processing stuck in stale states;
- deployment instability.

## 4. Generation stages

A normal job progresses through:

```text
generated → enriching → enriched → routing → completed
```

A failure may move the job to `failed`. Stale/failed jobs can be eligible for retry.

## 5. Troubleshooting checklist

### User cannot generate

1. Confirm authentication.
2. Check AI quota availability.
3. Check request ID/error logs.
4. Check Gemini configuration/provider availability.
5. Check the generation job status.

### Generation is stuck

1. Inspect the persistent generation job.
2. Check whether it is stale.
3. Check provider errors and duration.
4. Use the retry path when the job is eligible.
5. Do not repeatedly start duplicate processing manually.

### Places are failing

Check:

- Google Places credential/configuration;
- provider quota/billing;
- Arcjet rejection;
- request validation;
- provider failure counters.

### Routes are failing

Check:

- whether route enrichment is enabled;
- Google Routes credential/configuration;
- route provider quota/billing;
- coordinate validity;
- timeout/provider failure metrics.

## 6. Logging and privacy

Use request IDs to trace a request. Never copy production logs containing secrets or private payloads into public tickets.

Operational logs should prefer aggregate facts over complete user data.

## 7. Rollback procedure

If a release is unhealthy:

1. Stop onboarding new beta users.
2. Identify the last known-good deployment/commit.
3. Roll back using the hosting platform's supported deployment rollback mechanism.
4. Verify health and authentication.
5. Run one controlled generation smoke test.
6. Record the incident and root cause before restoring the new release.

## 8. Provider cost control

Current protections include bounded caches, in-flight deduplication, provider concurrency caps, canonical place identity, place deduplication, and route batching.

These reduce waste but do not replace provider budgets/alerts.

## 9. Current scale limitations

The current design is for controlled beta:

- the secured worker still executes inside the Next.js runtime;
- provider caches are process-local;
- production metrics are not yet aggregated into a full SLO dashboard.

Do not remove these warnings from release documentation until the architecture changes.

## 10. Incident severity

### Critical

Examples: cross-user data exposure, leaked production secret, widespread generation failure, runaway provider cost.

Action: pause onboarding immediately, contain the issue, rotate credentials when necessary, and roll back if appropriate.

### High

Examples: major provider outage, repeated stuck jobs, quota accounting errors.

Action: pause expansion and investigate before continuing.

### Medium

Examples: isolated generation failure with successful retry, non-critical UI issue.

Action: record, monitor, and fix according to impact.
