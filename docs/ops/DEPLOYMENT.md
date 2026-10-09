# Deployment Procedure

## Executive view
Deploy only a commit that passes local quality checks and the GitHub Actions quality gate. Then verify production configuration and run the beta smoke checklist.

## Release sequence
1. Pull the intended release commit.
2. Install with `npm ci`.
3. Run `npm run docs:check`.
4. Run `npm run audit` for runtime dependencies.
5. Review `npm run audit:full` for development-only findings and tracked exceptions.
6. Run `npm run typecheck`.
7. Run `npm test`.
8. Run `npm run build`.
9. Confirm CI is green on the exact commit.
10. Configure production secrets and service integrations.
11. Deploy the Next.js application.
12. Verify Clerk, Convex, Gemini, Arcjet, Places, and Routes configuration.
13. Run `docs/BETA_LAUNCH_GATE.md` smoke tests.

## Environment matrix
| Environment | Purpose | Secrets |
|---|---|---|
| Local | developer validation | `.env.local`, never committed |
| CI | reproducible quality gate | non-production placeholders/required CI vars |
| Beta/production | real service operation | platform secret manager |

## Rollback
Rollback to the last known-good application commit using the hosting platform's deployment controls. If a credential is compromised, rotate the credential independently of application rollback.

## Scale warning
The generation trigger is durably scheduled through Convex, but the worker still executes inside the Next.js runtime and provider caches remain process-local. This deployment model is acceptable for controlled beta; dedicated worker infrastructure and shared caching remain scale milestones.
