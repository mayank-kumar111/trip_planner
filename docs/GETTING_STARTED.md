# Getting Started

This guide gets a new person from a fresh checkout to a working local Trip Planner.

## 1. Prerequisites

Install:

- Git
- Node.js 22 (recommended; CI uses Node 22)
- npm
- A code editor such as VS Code
- Access to the required managed services for development

You need credentials/configuration for the integrations enabled by the project: Clerk, Convex, Gemini, Arcjet, Google Places, and Google Routes when route enrichment is used.

## 2. Clone and enter the project

```bash
git clone https://github.com/mayank-kumar111/trip_planner-master.git
cd trip_planner-master
```

## 3. Install dependencies

Use the lockfile so the local dependency tree matches the repository:

```bash
npm ci
```

## 4. Configure environment variables

Copy the safe template:

```bash
cp .env.example .env.local
```

Fill the placeholders with your development configuration.

Never commit `.env.local` and never paste secret values into GitHub, documentation, screenshots, or chat.

### Variable categories

| Category | Variables | Purpose |
|---|---|---|
| Convex | `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` | Database/backend connection |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, redirect settings | Authentication |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | AI generation |
| Security | `ARCJET_KEY` | API protection |
| Places | `GOOGLE_PLACE_API_KEY` | Place lookup/enrichment |
| Routes | `GOOGLE_ROUTES_API_KEY` | Route calculation |
| Browser maps | `NEXT_PUBLIC_ENABLE_GOOGLE_MAPS`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, optional Map ID | Interactive map display |
| Quotas | free/paid generation variables | Usage enforcement/display |

The exact safe template is `.env.example`.

## 5. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## 6. First manual test

1. Open the app.
2. Sign in or create a development account.
3. Open **Create New Trip**.
4. Enter a simple test trip.
5. Confirm the application does not repeatedly ask for information already present in the conversation.
6. Generate the trip.
7. Wait for processing to finish.
8. Open **My Trips**.
9. Refresh and verify the saved trip is still visible.

## 7. Production-like local test

Run the same build commands used by CI:

```bash
npm run audit
npm run typecheck
npm test
npm run build
npm start
```

If the development server has a stale Next.js cache and produces a module-not-found error, stop the server, remove `.next`, and restart the development server. Do not delete source code or dependencies as a first response to a stale build-cache error.

## 8. Common mistakes

### Missing environment variable

Check `.env.local`, then restart the Next.js server. Environment variables are loaded when the process starts.

### Google browser map disabled

`NEXT_PUBLIC_ENABLE_GOOGLE_MAPS=false` intentionally disables the browser map feature. Server-side Places/Routes configuration is a separate concern.

### Missing Map ID

`NEXT_PUBLIC_GOOGLE_MAP_ID` is optional in the current implementation. Do not invent a value.

### AI generation fails

Check server logs for the request ID and safe provider error information. Do not log or share provider secrets.

### Cross-user trip access

A signed-in user should only see their own trip data. If a test account can access another user's trip, stop beta testing and investigate authorization before continuing.

## 9. Where to go next

After the first successful local run:

- Developers → `DEVELOPER_GUIDE.md`
- Architecture/review → `ARCHITECTURE.md`
- API work → `API_REFERENCE.md`
- Testing → `TESTING.md`
- Security → `SECURITY.md`
- Deployment → `DEPLOYMENT.md`
