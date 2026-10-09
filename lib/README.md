# `lib`

Reusable domain, provider, security, and orchestration logic shared by API routes and application code.

## Subsystems
- `ai/` — AI-facing helpers.
- `maps/` — route provider/cache.
- `places/` — Places provider/cache.
- `security/` — request/security helpers.
- `trip/` — dates, validation, identity, routing, generation pipeline, and processing.

## Design rule
Keep HTTP transport thin and put reusable business behavior here. Inputs should be validated at boundaries; outputs should use explicit types and safe provider errors.
