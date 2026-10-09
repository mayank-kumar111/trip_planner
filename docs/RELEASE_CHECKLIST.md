# Release Checklist

Use this checklist for every controlled-beta release.

## A. Code and repository

- [ ] Intended branch/commit confirmed.
- [ ] No accidental `.env.local` or secret files are committed.
- [ ] `npm ci` succeeds.
- [ ] `npm run audit` succeeds for runtime dependencies.
- [ ] `npm run audit:full` reviewed for development-only findings and tracked exceptions.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm test` succeeds.
- [ ] `npm run build` succeeds.
- [ ] GitHub Actions CI is green on the exact release commit.

## B. Configuration

- [ ] Convex production/beta deployment configured.
- [ ] Clerk production/beta keys configured.
- [ ] Clerk redirect URLs match the beta domain.
- [ ] Gemini configuration configured.
- [ ] Arcjet configuration configured.
- [ ] Google Places configured.
- [ ] Google Routes configured when enabled.
- [ ] Browser Maps configuration intentionally enabled/disabled.
- [ ] AI quota values reviewed.

## C. Security

- [ ] Signed-out access is blocked for protected operations.
- [ ] Cross-user trip access is denied.
- [ ] Provider endpoints reject malformed/oversized requests.
- [ ] Secrets are server-side only.
- [ ] No secret appears in browser code or logs.

## D. Functional smoke test

- [ ] User can sign in.
- [ ] User can describe a trip.
- [ ] Previously supplied details are reused instead of repeatedly requested.
- [ ] Exact selected dates remain correct.
- [ ] AI generation succeeds.
- [ ] Places resolve/enrich.
- [ ] No unnecessary duplicate places appear.
- [ ] Routes work when enabled.
- [ ] Trip saves successfully.
- [ ] Refresh preserves the saved trip.

## E. Recovery

- [ ] Failed/stale job behavior has a tested retry path.
- [ ] Duplicate processing is prevented.
- [ ] Rollback deployment is known and accessible.

## F. Operating readiness

- [ ] Initial beta cohort is small.
- [ ] Provider budgets/limits are reviewed.
- [ ] Error/request-ID logging is available.
- [ ] Someone is responsible for monitoring the beta.
- [ ] Stop/pause criteria are understood.

## Release evidence

Record:

```text
Release commit:
CI run:
Deployment:
Deployment URL:
Generation smoke-test result:
Generation duration:
Authorization result:
Recovery result:
Provider usage observation:
Rollback reference:
Release owner:
Date:
```

Never record secret values in this checklist.
