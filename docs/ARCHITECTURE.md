# Architecture

## 1. Architecture goals

The application is structured to make trip generation reliable, secure, observable, and understandable while using managed services for infrastructure-heavy responsibilities.

## 2. System overview

```text
                         ┌────────────────────┐
                         │     Browser UI     │
                         │ ChatBox / My Trips │
                         └─────────┬──────────┘
                                   │ HTTPS
                                   ▼
                         ┌────────────────────┐
                         │   Next.js layer    │
                         │ auth + validation  │
                         │ API boundaries     │
                         └───────┬────────────┘
                                 │
             ┌───────────────────┼────────────────────┐
             │                   │                    │
             ▼                   ▼                    ▼
        ┌──────────┐       ┌────────────┐       ┌──────────┐
        │ Gemini   │       │   Convex   │       │ Arcjet   │
        │ AI       │       │ DB/backend │       │ security │
        └──────────┘       └─────┬──────┘       └──────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Background processing  │
                    │ reusable pipeline      │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    ▼                        ▼
             Google Places             Google Routes
```

## 3. Responsibilities by layer

### Browser

Collects conversation input, displays progress/results, and requests server operations. It is not trusted for authentication, authorization, quota accounting, or provider credentials.

### Next.js API

Provides authenticated HTTP boundaries. Routes perform request parsing, size limits, validation, authorization checks, Arcjet protection where appropriate, and small orchestration decisions.

### Convex

Stores users, trips, generation jobs, and AI usage state. Ownership checks are enforced server-side.

### AI provider

Gemini creates structured candidate trip content from the user's conversation.

### Places provider

Google Places resolves real places and supplies factual place information used by the application.

### Routes provider

Google Routes calculates route information when route enrichment is enabled.

## 4. Generation sequence

```text
User request
   ↓
Authenticated AI endpoint
   ↓
Quota reservation
   ↓
Gemini generation
   ↓
Runtime trip validation
   ↓
Quota confirmation/release
   ↓
Raw trip persistence
   ↓
TripGenerationJob creation/claim
   ↓
Background processing
   ↓
Places resolution
   ↓
Canonical identity + deduplication
   ↓
Trip intelligence/optimization
   ↓
Enriched persistence
   ↓
Day-level route sequence
   ↓
Routed persistence
   ↓
Completed job
```

## 5. Why raw output is saved early

AI generation and provider enrichment have different failure modes and costs. Saving the raw valid AI plan before expensive enrichment means a provider outage does not necessarily destroy the generated work and gives the persistent job a recovery point.

## 6. Generation job state machine

```text
             ┌─────────────┐
             │  generated  │
             └──────┬──────┘
                    │ claim
                    ▼
             ┌─────────────┐
             │  enriching  │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │   enriched  │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │   routing   │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │  completed  │
             └─────────────┘

Any processing stage may fail → failed.
Failed/stale work can be retried.
```

The job also records timing and provider/cache metrics.

## 7. Duplicate processing protection

A generation job is persistent. A claim operation transitions fresh generated work into active processing. A second processor cannot simply claim the same active job.

Stale jobs are detected using the shared generation-job policy. Failed/stale work is eligible for retry.

## 8. Background processing boundary

`app/api/trip/process/route.ts` is intentionally thin. It authenticates, validates, checks ownership, claims the job, and starts `processBackgroundTrip`.

`lib/trip/background-processing.ts` owns the application-level background orchestration.

`lib/trip/generation-pipeline.ts` owns the ordered processing stages.

This separation allows tests and future worker infrastructure to reuse the same pipeline without moving the business logic back into an HTTP route.

### Current limitation

Generation is durably scheduled through Convex to a secured Next.js worker. If the hosting process is terminated during an active attempt, the persistent job state, heartbeat, lease, and stale recovery provide the recovery path.

## 9. Places caching and identity

`lib/places/cache.ts` provides a bounded in-process cache with:

- normalized lookup keys;
- 10-minute TTL;
- maximum 500 entries;
- in-flight promise deduplication;
- failed-request eviction;
- maximum three concurrent Places lookups.

Resolved places prefer canonical `place_id` identity. Trip-wide deduplication prevents the same place from being repeatedly represented as different activities/hotels when identity can be established.

### Scale limitation

The cache lives in the application process. Multiple instances do not share it. A distributed/shared cache is a future scale milestone.

## 10. Routes controls

Route requests use:

- normalized coordinates;
- bounded cache lifetime and size;
- in-flight deduplication;
- request timeout;
- provider concurrency cap;
- day-level route sequence batching where contiguous coordinates are available.

This is designed to avoid one external route request per activity segment whenever a sequence request can represent the day.

## 11. Date source of truth

`lib/trip/date-rules.ts` centralizes date normalization and explicit date extraction. `lib/trip/validation.ts` enforces the resulting contract.

The rule is:

```text
Selected exact start/end dates
          ↓
Authoritative trip dates
          ↓
Derived inclusive duration
          ↓
Consecutive itinerary days
```

AI cannot silently replace an explicitly selected date range.

## 12. Security boundaries

```text
Browser
  │
  │ authenticated request
  ▼
Clerk identity
  │
  ▼
Next.js API
  ├── Arcjet
  ├── request limits
  ├── runtime validation
  └── ownership checks
  │
  ▼
Convex/provider services
```

Provider secrets remain server-side.

## 13. Failure handling

### AI failure

The quota reservation is released when generation fails or final generated-plan validation fails.

### Provider failure

Background processing records provider failures and marks the generation job failed rather than pretending the trip completed.

### Terminal persistence failure

The pipeline preserves the original processing error if the attempt to persist the terminal failed state also fails. This prevents a secondary database problem from hiding the actual root cause.

### Stale processing

If a job remains incomplete beyond the configured stale threshold, the UI can expose recovery/retry behavior.

## 14. Observability

Important routes attach a request ID. Generation jobs store:

- processing start time;
- completion time;
- duration;
- Places requests;
- Places cache hits;
- Routes requests;
- Routes cache hits;
- provider failures.

Current tests protect these counters. Production aggregation and dashboards remain a future operations milestone.

## 15. Data ownership

The stable Clerk subject/user ID is the canonical current ownership identity. Legacy email fallback exists only to support older records.

User-facing operations should never rely on an ID supplied by the browser without verifying that the authenticated user owns the referenced record.

## 16. Future target architecture

For aggressive scale, evolve toward:

```text
Next.js
   ↓
Authenticated orchestration
   ↓
Persistent queue
   ↓
Durable workers
   ├── Places
   ├── intelligence
   ├── Routes
   └── persistence
          ↓
     Shared cache
```

The application logic already has reusable boundaries that make this migration easier, but the infrastructure change itself has not been completed.
