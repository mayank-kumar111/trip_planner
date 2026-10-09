# Environment Variables

## Executive view
Environment variables configure connections to authentication, AI, abuse protection, maps, persistence, and quota systems. Values containing secrets must be supplied by the deployment platform.

## Server-side secrets
- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY`
- `ARCJET_KEY`
- `GOOGLE_PLACE_API_KEY`
- `GOOGLE_ROUTES_API_KEY`
- `TRIP_WORKER_SECRET`
- Convex deployment/auth configuration as required by the deployment.

Use `<INSERT_PRODUCTION_KEY_HERE>` in documentation examples; never use a real credential.

## Browser-visible configuration
Variables prefixed `NEXT_PUBLIC_` are shipped to browser code and therefore are not secret. This includes optional Google Maps browser configuration and public Clerk configuration.

## Durable processing configuration
- `TRIP_PROCESS_WORKER_URL` points the Convex scheduler at the protected Next.js worker endpoint.
- `TRIP_WORKER_SECRET` is shared only between the Convex deployment and the Next.js deployment; rotate it if exposed.
- The scheduler persists the dispatch request, while a five-minute watchdog re-queues stale processing jobs.

## Product configuration
Quota limits and premium plan slug are configuration rather than secrets. Keep server and browser display values synchronized when both exist.

## Required verification
After changing environment configuration, run the release checks and perform a deployed smoke test. Missing provider keys should produce a controlled failure rather than leaking internal errors.

## Source of truth
`.env.example` is the sanitized variable-name template. `docs/CONFIGURATION_REGISTRY.md` records the configuration surfaces. Deployment-specific secret values belong in the platform's secret manager.
