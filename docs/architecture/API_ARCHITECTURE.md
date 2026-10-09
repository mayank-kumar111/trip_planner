# API Architecture

## Executive view
API routes are intentionally thin. They authenticate the caller, validate bounded input, enforce security/quota controls, delegate business work, and return a stable HTTP result.

## Boundary pattern
```text
HTTP request
 → Clerk identity
 → request-size / JSON validation
 → Arcjet where required
 → ownership/quota checks
 → domain service
 → Convex/provider
 → safe response + request ID
```

## Provider boundaries
- Gemini is called only from server-side AI generation.
- Places calls are centralized through the Places domain/cache where possible.
- Routes calls are centralized through the routing domain/cache.
- Provider keys are never browser-owned.

## Long-running generation
Trip generation is coordinated through a persistent Convex generation job. Job creation and retry schedule the secured `/api/trip/process-worker` route, which claims a worker lease and runs the reusable background processor. The processing service is independent of the HTTP transport.

## API and microservice evolution
Current architecture is a modular monolith, not a fleet of microservices. That is intentional for the controlled beta. Before aggressive scale, the background processor should become a durable worker and shared provider caching should move to a distributed store.

## Contract ownership
Endpoint-specific behavior is documented in `docs/API_SPECIFICATION.md` and `docs/API_REFERENCE.md`; implementation code remains authoritative for exact status/error details.
