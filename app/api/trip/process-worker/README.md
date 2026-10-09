# `app/api/trip/process-worker`

Protected durable trip-processing worker boundary.

- `route.ts` — accepts scheduler-dispatched trip jobs using the `X-Trip-Worker-Secret` header.
- Fetches the persisted trip and generation job from Convex, claims a worker lease, runs background enrichment/routing, and persists job progress through lease-protected Convex mutations.
- This route is intentionally excluded from Clerk session protection in `middleware.ts`; worker authentication is handled by `TRIP_WORKER_SECRET`.
- `TRIP_PROCESS_WORKER_URL` points the Convex scheduler to this endpoint.
