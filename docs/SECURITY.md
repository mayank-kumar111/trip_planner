# Security Guide

## Executive view
Trip Planner treats authentication, ownership, quota, provider access, and secret handling as server responsibilities. The goal is to prevent unauthorized trip access, quota manipulation, provider abuse, accidental secret exposure, and unsafe trust of AI output.

## Trust boundaries
```text
Browser
  │ untrusted input
  ▼
Next.js API boundary
  │ Clerk identity + validation + Arcjet + quota
  ├──────────► Gemini
  ├──────────► Google Places / Routes
  └──────────► Convex persistence
```

## Identity and authorization
- Clerk is the authentication boundary.
- The stable Clerk user ID is the canonical current identity.
- Trip/job reads and mutations must verify ownership server-side.
- Legacy email fallback exists only for compatibility with older records; new authorization logic should not use email as the primary identity.
- Never accept a user ID from the browser as proof of ownership.

## Abuse controls
- AI quota reservation is server-owned and finalized after successful AI generation.
- Reservations are atomic, expiring, and idempotently confirmed/released.
- Expensive provider endpoints use Arcjet and bounded request validation where implemented.
- Provider calls have timeouts and concurrency controls.
- Places and route lookups use bounded process-local caches and in-flight deduplication.

## Input and output validation
- Request bodies are size-bounded.
- JSON parsing failures are returned as client errors.
- Trip plans use runtime semantic validation for dates, duration, coordinates, ratings, itinerary continuity, and activity limits.
- AI-generated place names are not treated as geographic truth until provider enrichment resolves factual place identity.

## Dependency audit policy
The blocking security gate audits runtime dependencies with:

`npm audit --omit=dev --audit-level=high`

The current runtime graph reports zero vulnerabilities. A separate `npm run audit:full` check remains visible for developer tooling dependencies.

At the current release baseline, the full audit reports the high-severity `braces` advisory GHSA-vfj7-8cjw-p6xm through the development-only lint chain:
`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`.

The advisory currently has no upstream patched `braces` release. Do not downgrade the Next.js 15 toolchain with `npm audit fix --force` to clear this finding. Track the item in GitHub Issue #4 and revisit when the upstream dependency path is patched or removed.

## Secrets
Never commit real values for Clerk secret keys, Gemini keys, Arcjet keys, Google Places keys, Google Routes keys, or other credentials. Public `NEXT_PUBLIC_*` variables are still reviewed carefully because they are intentionally browser-visible.

If a credential is exposed: revoke/rotate it immediately, investigate use, remove the secret from source/history as appropriate, and redeploy with the replacement.

## Logging and privacy
Logs should contain request IDs and safe operational metadata such as duration, counts, and provider failure totals. Do not log authentication tokens, provider keys, raw secrets, or unnecessary personal/trip content.

## Incident response
1. Identify the affected endpoint/resource.
2. Preserve request ID and timestamp evidence.
3. Revoke exposed credentials if applicable.
4. Disable or rate-limit the affected path when necessary.
5. Patch and verify locally and in CI.
6. Deploy the smallest safe fix.
7. Confirm authorization, quota, provider, and generation smoke tests.
8. Record the incident and preventive action.

## Security limitations before scale
The application is suitable for controlled beta with production configuration and smoke evidence, but aggressive scale remains blocked by process-lifetime background execution and process-local provider caches. A durable queue/worker and shared cache are required before broad scale-out.
