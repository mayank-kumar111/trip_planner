# API Reference

This document describes the application's current Next.js API boundaries. It is intentionally written as a practical reference rather than a generated OpenAPI specification.

## General rules

Most trip-generation and provider operations are authenticated. Requests should be bounded and validated before expensive work. Provider secrets are never supplied by the browser.

## `POST /api/aimodel`

### Purpose
Generate a structured candidate trip from the conversation.

### Security
- Requires authenticated user context.
- AI quota reservation is owned by the server.
- Expensive generation is protected by the application's security controls.

### Input
The request contains the conversation/messages needed to infer trip requirements. The server is expected to extract information already present in the conversation and avoid unnecessarily repeating questions.

### Processing
```text
conversation
  ↓
trip requirement extraction
  ↓
quota reservation
  ↓
Gemini
  ↓
structured JSON
  ↓
runtime validation
  ↓
quota confirmation/release
```

### Important behavior
A generated plan that fails runtime validation does not receive successful quota confirmation.

## `GET /api/ai-usage`

### Purpose
Return the authenticated user's AI usage/remaining quota information.

### Security
Requires authentication. Remaining availability accounts for active reservations so concurrent requests cannot simply spend the same visible remaining quota.

## `POST /api/google-place-detail`

### Purpose
Resolve/enrich a named place using Google Places.

### Security/input limits
- Clerk authentication required.
- Arcjet protection applied.
- Request body is bounded.
- `placeName` is required and length-limited.
- Malformed JSON is rejected.

Expected validation classes include:

```text
401 → unauthenticated
413 → oversized payload
400 → malformed/invalid input
429 → Arcjet protection/rate-limit rejection when applicable
```

## `POST /api/google-place-photo`

### Purpose
Retrieve a browser-usable place photo through the server-side provider boundary.

Do not expose provider credentials in client requests.

## `POST /api/trip/enrich`

### Purpose
Legacy/direct enrichment boundary retained for controlled workflows and compatibility. The primary generation architecture uses the persistent background-processing flow.

### Controls
- authentication;
- Arcjet protection;
- bounded request body;
- trip-plan validation;
- Places cache and concurrency controls;
- place identity/deduplication;
- shared intelligence/routing logic where used.

## `POST /api/trip/routes`

### Purpose
Perform route enrichment separately from the main generation request when a route operation is requested.

### Controls
Authentication, Arcjet protection, bounded payload, trip-plan validation, shared routing logic.

## `GET /api/health`

### Purpose
Provide a lightweight health endpoint for deployment/operational checks.

Do not interpret a simple HTTP health response as proof that every external provider is healthy.

## Error-handling principle

API responses should expose a useful safe error message to the client while detailed credentials, tokens, private payloads, and provider secrets remain out of logs and responses.

## Adding/changing an endpoint

Update this document when an endpoint's:

- path changes;
- authentication requirement changes;
- request contract changes;
- provider dependency changes;
- rate-limit/security boundary changes;
- response semantics change.

Add or update regression tests at the same time.
