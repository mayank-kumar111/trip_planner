# Configuration Registry

## Executive view
This is the single inventory for configuration that changes application behavior, builds, security controls, or deployment requirements.

## Environment
See `.env.example` for the sanitized variable contract. Secrets must be supplied through the deployment environment, never committed.

| Variable group | Scope | Purpose |
|---|---|---|
| Convex | server/deployment | database and backend connection |
| Clerk | server + public auth config | authentication and stable identity |
| Gemini | server | AI generation |
| Arcjet | server | abuse/rate protection |
| Google Places | server | factual place enrichment |
| Google Routes | server | route calculation |
| Google Maps public | browser | optional map rendering |
| quota/plan | server + public display | AI generation limits |
| support | application | support contact configuration |

## Build/runtime configuration
- `package.json`: scripts and dependency policy.
- `package-lock.json`: exact dependency resolution; regenerate with npm rather than hand-editing.
- `tsconfig.json`: TypeScript strictness and path aliases.
- `next.config.ts`: Next.js configuration.
- `postcss.config.mjs`: CSS processing.
- `components.json`: component generator/tooling settings.
- `.github/workflows/ci.yml`: release quality gate.

## Data configuration
- `convex/schema.ts` defines persisted entities and validators.
- `convex/_generated/` is generated output and must not be manually edited.

## Change policy
Configuration changes require the same review discipline as code. Security-sensitive changes must document scope, secret handling, rollback, and verification steps in the relevant operations/security documentation.
