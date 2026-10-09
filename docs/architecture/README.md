# Architecture Documentation

## Executive view
This directory explains how Trip Planner is assembled and how a user request moves through the system.

## Technical deep dive
- `C4_CONTEXT.md` — external actors and systems.
- `C4_CONTAINER.md` — major application containers/modules.
- `DATA_FLOW.md` — generation and persistence flow.
- `API_ARCHITECTURE.md` — API boundaries, provider boundaries, and ownership rules.

Start with `C4_CONTEXT.md`, then follow the request through `DATA_FLOW.md`.

## Design principles
- Browser is an untrusted client.
- Clerk supplies identity; Convex owns persistent application state.
- AI proposes; Google verifies geographic facts.
- Long generation work is represented by a persistent job.
- Provider calls are bounded and observable.
- Dates are governed by centralized date rules.
