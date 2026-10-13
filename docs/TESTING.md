# Testing Guide

## Purpose

Testing protects the behaviors that are most important to users and to the business: correct dates, ownership, quota accounting, provider boundaries, reliable processing, and safe recovery.

## Automated checks

Run the complete local quality gate:

```bash
npm ci
npm run audit
npm run typecheck
npm test
npm run build
```

## Test categories

| Area | What it protects |
|---|---|
| Trip validation | Invalid AI output is rejected |
| Date rules | Selected dates remain authoritative |
| Place identity | Duplicate real-world places are reduced |
| Generation job | Stale/retry/claim behavior |
| Process request | Request size and payload boundaries |
| Process decision | Duplicate-processing response behavior |
| Generation pipeline | Ordered processing and failure persistence |
| Background processing | Real orchestration and provider metrics |

## Current verification snapshot

At commit `fc7c132`:

- typecheck: PASS;
- tests: **37/37 PASS**;
- production build: PASS;
- build output: 17/17 static pages generated;
- CI run #9: PASS;
- npm audit: 0 high/critical vulnerabilities reported locally.

## Manual beta tests

### Authentication

1. Open the protected trip-creation page while signed out.
2. Confirm redirect to Clerk sign-in.
3. Sign in.
4. Confirm trip creation is available.

### Ownership

1. Account A creates a trip.
2. Account B attempts to open Account A's trip URL/ID.
3. Confirm the backend does not expose Account A's trip.
4. Confirm the UI does not crash because a non-owned job is invisible.

### Quota

1. Record the user's available generation count.
2. Generate one valid trip.
3. Confirm the successful AI generation consumes one unit.
4. Do not use browser-side controls to manually confirm/release quota.

### Happy-path generation

1. Provide destination, duration, travelers, interests/preferences, origin, and exact dates.
2. Confirm already-known information is not repeatedly requested.
3. Generate the trip.
4. Confirm processing completes.
5. Confirm places are not unnecessarily duplicated.
6. Confirm dates and duration agree.
7. Refresh My Trips.
8. Confirm the trip remains available.

### Date integrity

Test a five-day selection and verify the itinerary covers exactly five consecutive dates. Test conflicting AI duration/date data and confirm validation rejects the inconsistency.

### Provider input

Test malformed JSON, oversized bodies, and invalid/empty place names against provider-backed endpoints. Expected responses should be controlled client errors, not unhandled server exceptions.

### Recovery

Use a controlled test/staging scenario to create a failed or stale generation job. Confirm the UI exposes retry and that retry can reclaim eligible work. Do not claim a production recovery test passed unless it was actually observed in the deployed environment.

## What automated tests cannot prove

Passing tests do not prove:

- provider availability;
- production latency;
- production cost;
- production-scale concurrency;
- deployment configuration;
- real browser behavior across every device;
- durable execution after hosting-process termination.

These require deployment and operational evidence.
