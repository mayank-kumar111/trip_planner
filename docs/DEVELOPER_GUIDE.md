# Developer Guide

## 1. Development philosophy

Keep the application understandable by separating responsibilities.

- UI components handle presentation and user interaction.
- Next.js API routes handle HTTP concerns, authentication boundaries, validation, and small orchestration decisions.
- `lib/` contains reusable business/provider logic.
- Convex functions own persistent application data and ownership checks.
- Tests protect pure policies and important production workflows.

Do not move secrets into client code and do not duplicate business logic across API routes.

## 2. Repository structure

```text
app/        Next.js pages, layouts, UI, and API route boundaries
components/ Shared UI
context/    React context/state shared across the application
convex/     Convex schema and server functions
hooks/      Reusable React hooks
lib/        Business logic, provider clients, security, caching, routing, pipeline
 tests/     Automated regression tests
docs/       Human-readable project documentation
.github/    CI workflow
```

## 3. Important `lib/` modules

| Module | Responsibility |
|---|---|
| `lib/trip/validation.ts` | Runtime validation of generated trip plans |
| `lib/trip/date-rules.ts` | Authoritative travel-date normalization/extraction |
| `lib/trip/place-identity.ts` | Canonical place identity and trip-wide deduplication |
| `lib/trip/routing.ts` | Shared route enrichment |
| `lib/trip/generation-job.ts` | Pure generation-job stale/retry/claim policy |
| `lib/trip/generation-pipeline.ts` | Ordered generation processing pipeline |
| `lib/trip/background-processing.ts` | Production background-processing orchestration |
| `lib/places/cache.ts` | Shared in-process Places cache and lookup controls |
| `lib/maps/routes.ts` | Google Routes client/cache/concurrency controls |
| `lib/security/request-id.ts` | Safe request correlation IDs |

## 4. Generation pipeline

The current reusable pipeline follows this conceptual order:

```text
Raw AI trip
   ↓
Places enrichment
   ↓
Place deduplication / intelligence optimization
   ↓
Persist enriched trip
   ↓
Route enrichment (when enabled)
   ↓
Persist routed trip
   ↓
Mark generation completed
```

The pipeline catches failures and persists a failed job state without replacing the original pipeline error with a secondary terminal-persistence error.

## 5. HTTP boundary rules

A Next.js API route should generally do this:

```text
Receive request
   ↓
Authenticate
   ↓
Apply Arcjet protection where appropriate
   ↓
Check bounded request size
   ↓
Parse/validate input
   ↓
Check ownership
   ↓
Claim persistent work when applicable
   ↓
Return a small HTTP response
```

Long provider orchestration belongs in reusable services, not in a large HTTP handler.

## 6. Authentication and authorization

Clerk supplies the signed-in identity.

For trip ownership, the stable Clerk user ID is the canonical current identity. Legacy email fallback exists for compatibility with older user records.

Every Convex operation that exposes user-owned trip data must enforce ownership. A UI restriction is not an authorization boundary.

## 7. Quota rules

AI quota accounting is server-owned.

A generation reserves usage before expensive AI work. The server confirms successful AI generation or releases the reservation on an invalid/failing generation. The browser must never be trusted to confirm or release quota.

## 8. Provider rules

### Places

Use canonical provider identity when available. Normalize lookup queries and use the shared cache. Keep cache size and lifetime bounded.

### Routes

Use normalized coordinates, bounded caching, in-flight deduplication, request timeout, and the global concurrency cap. Prefer itinerary-day sequence routing over one provider request for every activity segment.

## 9. Validation rules

Do not trust AI output simply because it is JSON.

`lib/trip/validation.ts` checks:

- required fields;
- bounded text;
- valid `YYYY-MM-DD` dates;
- start/end ordering;
- duration/date consistency;
- consecutive itinerary days/dates;
- collection limits;
- coordinate ranges;
- hotel rating range;
- required hotel/activity strings.

## 10. TypeScript rules

Prefer explicit types and type guards at external boundaries.

Do not introduce `any` into application code unless there is a documented reason. Convex's `v.any()` and generated Convex files are intentional exceptions and should not be replaced merely to satisfy a text search.

Run:

```bash
npm run typecheck
```

before considering a change complete.

## 11. Testing rules

Every behavior change should have a regression test when practical, especially for:

- authorization policy;
- date rules;
- quota lifecycle;
- generation-job state;
- request validation;
- place deduplication;
- background processing failure/recovery;
- provider metrics.

Run:

```bash
npm test
```

## 12. CI parity

The CI workflow is the release quality gate:

```text
npm ci
npm run audit
npm run typecheck
npm test
npm run build
```

CI uses Node 22.

## 13. Safe logging

Use request IDs to correlate a request across logs. Log useful operational facts such as duration, status, provider failure counts, and cache counters.

Never log:

- API keys;
- authentication secrets;
- access tokens;
- complete private user payloads;
- raw provider credentials.

## 14. Adding a new API endpoint

Before implementation, decide:

1. Is it public or authenticated?
2. Does it expose user-owned data?
3. Does it call an expensive external provider?
4. What is the maximum request size?
5. What input validation is required?
6. What rate limit/Arcjet policy applies?
7. What information is safe to log?
8. Does it need a persistent job rather than synchronous processing?
9. What regression test proves the security and failure behavior?

## 15. Pull request/release expectations

Before merging a meaningful change:

```bash
npm run audit
npm run typecheck
npm test
npm run build
```

Then confirm CI is green on the exact commit intended for release.

## 16. Known technical debt

These are deliberate documented limitations, not hidden defects:

1. The secured trip worker still executes inside the Next.js runtime; durable queue scheduling and stale recovery are provided by Convex.
2. Provider caches are process-local.
3. Production SLO dashboards/aggregated metrics are not yet implemented.
4. Legacy email identity fallback remains for older records.

These limitations are why aggressive scale remains NO-GO.
