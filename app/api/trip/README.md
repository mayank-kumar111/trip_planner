# `app/api/trip`

Trip-processing HTTP boundaries.

- `enrich/` — provider enrichment boundary.
- `process-worker/` — secured Convex-scheduled worker boundary for persistent trip processing.
- `routes/` — optional route calculation boundary.

Inputs are authenticated trip/job requests; outputs are bounded JSON responses. Business logic lives in reusable `lib/trip` services so HTTP transport remains thin. The durable generation flow is dispatched through Convex to the secured worker boundary.
