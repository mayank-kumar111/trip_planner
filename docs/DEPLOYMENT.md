# Deployment Guide

## 1. Purpose

This guide explains how to move the application from a verified local repository to a controlled beta deployment.

## 2. Release sequence

```text
Local changes
  ↓
npm audit / typecheck / test / build
  ↓
Commit + push
  ↓
CI green on exact commit
  ↓
Configure deployment environment variables
  ↓
Deploy
  ↓
Run beta smoke tests
  ↓
Observe before expanding the cohort
```

## 3. Hosting requirements

The host must support the Next.js application and its server-side API routes. The deployment must be able to reach Convex and the configured external providers.

## 4. Environment variables

Configure the deployment environment with the same **variable names** as `.env.example`, using deployment-specific values.

### Server-side integrations

```text
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
GEMINI_API_KEY
GEMINI_MODEL
ARCJET_KEY
GOOGLE_PLACE_API_KEY
GOOGLE_ROUTES_API_KEY
```

### Browser/public configuration

```text
NEXT_PUBLIC_ENABLE_GOOGLE_MAPS
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_MAP_ID   # optional
```

### Usage configuration

```text
FREE_AI_GENERATIONS
PAID_AI_GENERATIONS
CLERK_PREMIUM_PLAN_SLUG
NEXT_PUBLIC_FREE_AI_GENERATIONS
NEXT_PUBLIC_PAID_AI_GENERATIONS
NEXT_PUBLIC_CLERK_PREMIUM_PLAN_SLUG
NEXT_PUBLIC_SUPPORT_EMAIL
```

Do not copy development secrets blindly into production. Use production credentials and appropriate provider restrictions.

## 5. Clerk configuration

Configure the production/beta application in Clerk and ensure:

- the publishable key and secret key belong to the intended environment;
- sign-in/sign-up routes match the deployed application;
- redirect URLs use the real beta domain;
- Convex JWT issuer configuration points to the intended Clerk issuer.

## 6. Convex configuration

Deploy/connect the intended Convex deployment and verify `NEXT_PUBLIC_CONVEX_URL` points to it. The Convex environment must have the required Clerk JWT issuer configuration.

## 7. Google configuration

Use separate server-side keys for Places and Routes as appropriate. Restrict keys to the required APIs and deployment environment.

Browser Maps configuration is separate. Keep browser Maps disabled when it is not required or when billing/configuration is not ready.

## 8. Arcjet

Configure the production Arcjet key and confirm the deployed API routes are actually receiving protection decisions. A configured variable alone is not proof of runtime protection.

## 9. Deployment verification

After deployment:

1. Open the public/beta URL.
2. Verify signed-out protection.
3. Sign in.
4. Generate a small test trip.
5. Verify processing completes.
6. Refresh and verify the saved trip.
7. Test ownership with a second account when available.
8. Check safe logs for request IDs/errors without exposing secrets.

## 10. Rollback

Before onboarding beta users, know how to return to the previous known-good deployment. Keep the exact release commit and deployment identifier recorded in the release checklist.

## 11. Production caution

A successful deployment build does not prove production readiness. External provider credentials, authentication configuration, domain redirects, quotas, billing, provider availability, and runtime behavior must be verified in the deployed environment.
