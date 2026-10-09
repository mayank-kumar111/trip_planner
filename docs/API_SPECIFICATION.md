# API Specification

## Executive view
The API layer is the controlled boundary between the browser, authentication, AI/provider services, and persistent trip state. Protected endpoints authenticate first, validate input, enforce abuse controls where applicable, and return bounded responses.

## Endpoint contract

| Endpoint | Method | Purpose | Primary controls |
|---|---|---|---|
| `/api/aimodel` | POST | Generate and validate an AI trip plan | Clerk, quota reservation, validation, request ID, request-body limit |
| `/api/ai-usage` | GET | Read current AI quota state | Clerk |
| `/api/google-place-detail` | POST | Resolve a place detail | Clerk, Arcjet, body/field bounds, shared cache |
| `/api/google-place-photo` | GET | Resolve a place photo for public/shared-trip views | Public route, IP rate limit (60/min), photo-reference validation, upstream timeout, 5 MB response bound, image-type validation, cache headers |
| `/api/trip/enrich` | POST | Legacy/direct trip enrichment boundary | Clerk, Arcjet, request bounds, validation |
| `/api/trip/process` | POST | Claim and start persistent background generation | Clerk, Arcjet, request bounds, ownership, atomic claim |
| `/api/trip/routes` | POST | Calculate optional road routes | Clerk, Arcjet, request bounds, validation |
| `/api/health` | GET | Basic service health signal | intentionally lightweight |

## Common request rules
- JSON request bodies are required where applicable.
- Malformed JSON returns `400`.
- Oversized request bodies are rejected with `413` where bounded processing endpoints implement the shared request limit.
- Protected operations require an authenticated Clerk user.
- Trip operations must operate only on resources owned by the authenticated user.
- The Google place photo proxy is intentionally public because shared-trip pages must load photos without an authenticated session; it is rate-limited to 60 requests per minute per client IP, independently validates the photo reference, and bounds the upstream image response.
- External-provider failures are normalized rather than leaking provider internals.
- Request IDs are included in structured server logs for correlation.

## Generation API lifecycle
```text
POST /api/aimodel
  → authenticate
  → reserve quota
  → Gemini generation
  → runtime validation
  → persist raw trip/job
  → persist raw trip/job
  → Convex scheduler dispatch
  → secured trip worker
  → background Places/intelligence/Routes/persistence
```

## Error semantics
Clients should treat `400` as invalid client input, `401` as missing authentication, `403` as authorization denial where exposed, `413` as request-size violation, `429` as protection/quota throttling, and `5xx` as a server/provider failure. Exact endpoint behavior remains authoritative in the route implementation.

## API design rules
1. Never trust browser-supplied ownership or quota state.
2. Never expose provider secrets to client code.
3. Validate AI output before treating it as a trip plan.
4. Keep long-running work out of the initial request path where the persistent job architecture supports it.
5. Keep provider calls bounded with timeouts, concurrency limits, caches, and canonical place identity.
6. Keep public provider proxies narrowly scoped: validate identifiers, cap upstream response size, allow only expected content types, rate-limit abuse, and avoid forwarding provider error details.

For implementation-level examples and endpoint history, see `docs/API_REFERENCE.md`.
