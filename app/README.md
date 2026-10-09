# `app`

Next.js application layer: pages, layouts, client components, and HTTP API routes.

## Inputs/outputs
Browser actions and authenticated session state enter here; rendered UI and HTTP responses leave here.

## Key areas
- `(auth)/` authentication pages.
- `api/` server request boundaries.
- `create-new-trip/` trip creation experience.
- `my-trips/` saved-trip experience.
- `shared-trip/` shareable trip view.
- `_components/` app-level UI components.

## Impact
Changes can affect routing, authentication, browser behavior, or API contracts. Keep server trust decisions on the server.
