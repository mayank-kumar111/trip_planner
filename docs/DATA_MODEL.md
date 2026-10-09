# Data Model

Trip Planner uses Convex for persistent application state. The exact generated Convex IDs/types should be obtained from the generated data model; this document explains the business meaning of the important records.

## 1. User

Represents an application user associated with a Clerk identity.

The stable Clerk user ID is the preferred identity for current authorization. Older records may still require legacy compatibility behavior.

## 2. Trip

Represents a user's saved travel plan.

A trip can contain information such as:

- origin;
- destination;
- travel dates;
- duration;
- traveler/group information;
- budget/preferences;
- hotels;
- day-by-day itinerary;
- place/provider metadata;
- route information.

The application must treat ownership as security-sensitive data.

## 3. AI usage

AI usage state tracks generation allowance and active reservations.

The important lifecycle is:

```text
available quota
   ↓ reserve
reserved quota
   ├── confirm → used
   └── release → available
```

Reservations expire so abandoned work does not permanently consume capacity.

## 4. TripGenerationJob

This persistent record tracks a generation workflow separately from the final trip payload.

Current lifecycle statuses:

```text
generated → enriching → enriched → routing → completed
                 │           │          │
                 └───────────┴──────────┴──→ failed
```

Jobs also support stale/retry behavior and operational timing/metric fields.

## 5. Job timing

The job can record:

- processing start;
- completion;
- total duration.

These values support troubleshooting and future SLO measurement.

## 6. Provider metrics

Generation jobs can store counters such as:

- Places requests;
- Places cache hits;
- Routes requests;
- Routes cache hits;
- provider failures.

These counters are operational signals, not billing statements.

## 7. Ownership rule

A browser-supplied trip ID is not proof of ownership.

The backend must compare the authenticated Clerk identity with the trip/job owner before reading or mutating user-owned records.

## 8. Date integrity

The trip model may contain both dates and duration, but the selected exact start/end dates are authoritative when present. Validation ensures the duration and itinerary agree with those dates.

## 9. Provider identity

When Google Places resolves an entity, the application prefers the provider's canonical `place_id`. Name/address normalization is used as a fallback identity strategy when a canonical ID is unavailable.

This helps prevent the same real-world place from being stored repeatedly under minor naming differences.

## 10. Schema source of truth

For exact field names and Convex validator definitions, see `convex/schema.ts`. This document explains semantics so readers do not need to understand Convex validators before understanding the data.
