# `convex`

Persistent backend and data model.

## Responsibilities
- Define schema and validators in `schema.ts`.
- Implement authenticated queries/mutations for users, trips, and generation jobs.
- Enforce ownership and persistent job lifecycle rules.
- Provide generated bindings under `_generated/`.

## Inputs/outputs
Authenticated application requests enter through Convex functions; durable records and typed query/mutation results leave through the Convex API.

## Impact
Schema or mutation changes can affect all persisted trips and generation recovery. Treat migrations/compatibility carefully. Never manually edit `_generated/` files.
