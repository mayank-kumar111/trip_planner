# Operations Documentation

## Executive view
Operations documentation explains how to configure, deploy, verify, recover, and safely operate Trip Planner.

## Documents
- `DEPLOYMENT.md` — release and deployment procedure.
- `ENVIRONMENT_VARIABLES.md` — environment contract and secret ownership.
- `RUNBOOK.md` — incident diagnosis and recovery.

## Operating principle
A green build is necessary but not sufficient. Production/beta release requires configuration validation, CI success on the exact commit, deployed smoke tests, authorization checks, quota checks, and provider sanity checks.
