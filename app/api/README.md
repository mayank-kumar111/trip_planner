# `app/api`

HTTP API boundaries for authentication-aware application and provider operations.

## Responsibilities
- Parse and bound requests.
- Authenticate with Clerk.
- Apply Arcjet where required.
- Enforce quota/ownership.
- Delegate business logic to `lib/` and Convex.
- Return safe HTTP responses and request-correlated logs.

See `docs/API_SPECIFICATION.md` for the canonical API contract.
