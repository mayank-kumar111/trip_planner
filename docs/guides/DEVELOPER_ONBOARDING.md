# Developer Onboarding

## Executive view
Trip Planner is a TypeScript Next.js application backed by Convex, Clerk, Gemini, Google Maps Platform, and Arcjet. Work from the smallest layer that solves the problem and preserve server-side trust boundaries.

## First day
```bash
npm ci
cp .env.example .env.local
npm run audit
npm run typecheck
npm test
npm run build
```

Then run `npm run dev` and exercise sign-in, trip generation, trip ownership, and the itinerary flow.

## Where to work
- `app/` — pages and HTTP boundaries.
- `components/`, `context/`, `hooks/` — reusable UI/client state.
- `lib/trip/` — trip domain rules, identity, pipeline, routing decisions.
- `lib/places/` — Places provider integration/cache.
- `lib/maps/` — route provider integration/cache.
- `lib/security/` — request/security helpers.
- `convex/` — persistent data model and server functions.
- `tests/` — regression coverage.

## Safe change workflow
1. Read the relevant directory README.
2. Identify the trust boundary and source of truth.
3. Change the smallest appropriate module.
4. Add a regression test for a new invariant.
5. Run `npm run docs:check` and all quality commands.
6. Verify CI on the exact commit.

## Important invariants
- Server owns authorization and AI quota.
- Exact selected travel dates are authoritative.
- AI places are candidates until factual provider enrichment.
- Place identity prefers canonical `place_id`.
- Generation jobs prevent duplicate fresh processing and support stale recovery.
- Background execution is not yet a durable queue.
