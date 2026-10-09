# Manifest & Configuration Registry

## Executive view
This registry tells reviewers which repository artifacts behave like manifests, environment templates, build configuration, CI configuration, or generated metadata.

## Java/JVM manifests
**Status: none found.** The repository contains no `.mf` / `MANIFEST.MF` files. No fake manifest documentation is created for absent files.

## Actual manifest-like/configuration surfaces
| Artifact | Purpose | Owner | Notes |
|---|---|---|---|
| `package.json` | application scripts and dependency declarations | application | source of npm scripts/dependencies |
| `package-lock.json` | reproducible npm dependency graph | npm | generated; do not hand-edit |
| `.env.example` | sanitized environment contract | application/platform | never place real secrets here |
| `tsconfig.json` | TypeScript compiler policy | application | keep aligned with CI typecheck |
| `next.config.ts` | Next.js runtime/build configuration | application | review on framework upgrades |
| `postcss.config.mjs` | CSS processing configuration | frontend | build-time config |
| `.github/workflows/ci.yml` | continuous integration quality gate | engineering | runs audit, typecheck, tests, build |
| `convex/schema.ts` | persistent application data model | backend | source for Convex schema |
| `convex/_generated/*` | generated Convex bindings | Convex | generated; do not edit manually |
| `components.json` | UI/component tooling configuration | frontend | tool-specific configuration |

## Non-manifest files
There is currently no `Dockerfile`, Kubernetes manifest, Terraform module, or checked-in container deployment manifest. Production deployment is therefore documented as a managed Next.js + Convex + third-party-provider deployment rather than a repository-owned container platform.

## Documentation rule
Any new `.mf`, deployment manifest, workflow, environment template, or build configuration must be added to this registry and documented before production release.
