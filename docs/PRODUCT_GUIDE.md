# Product Guide

## 1. What is Trip Planner?

Trip Planner is a conversational travel-planning application. A user can describe a trip in natural language, answer only the questions that are still missing, and receive a structured itinerary with hotels, attractions, food places, and travel information.

The product is intended to reduce the effort of planning a trip manually across many websites.

## 2. What the user experiences

```text
Landing page
  ↓
Sign in / Sign up
  ↓
Describe the trip in chat
  ↓
Answer missing details
  ↓
Review generated trip
  ↓
Places are verified/enriched
  ↓
Trip is saved
  ↓
Open it later from My Trips
```

The conversation can already contain useful facts. The application is designed so the AI should use information already supplied by the user instead of repeatedly asking for the same destination, duration, group size, interests, or preferences.

## 3. Example

A user might say:

> Plan a 3-day trip to Jaipur for 2 people. Include hotels, major tourist attractions, and food places. Avoid repeating places.

The system should recognize the information already present and ask only for genuinely missing information, such as origin or exact travel dates.

## 4. What the AI does

AI is responsible for generating candidate trip structure and recommendations from the conversation.

AI is **not** treated as the final authority for geographic identity.

The application subsequently uses Google Places to resolve and enrich real places. This creates the following product rule:

```text
AI recommendation
      ↓
Provider resolution
      ↓
Canonical place identity
      ↓
Verified/enriched trip data
```

## 5. Dates

Travel dates are important product data, not just display text.

- Exact selected start/end dates are authoritative.
- Duration is consistent with those dates.
- A trip from September 11 through September 13 is three inclusive calendar days.
- Generated itinerary days must be consecutive.
- Conflicting AI date/duration data is rejected by validation.

## 6. Trip processing

Trip generation is intentionally split into stages so a long provider workflow does not need to stay inside the initial browser request.

The user-visible stages are conceptually:

```text
Generating
   ↓
Preparing places
   ↓
Improving itinerary
   ↓
Calculating routes (when enabled)
   ↓
Saving
   ↓
Completed
```

A persistent generation job records progress. Failed or stale jobs can expose a retry path.

## 7. Quota

AI generations are usage-controlled. The quota is enforced by the server.

The browser does not get to decide whether a generation should be counted as successful. The server reserves usage, performs generation, and confirms or releases the reservation according to the generation result.

## 8. Maps and routes

There are two different Google Maps concerns:

- **Server-side Places/Routes:** used for factual place enrichment and route calculation.
- **Browser map display:** optional and controlled by `NEXT_PUBLIC_ENABLE_GOOGLE_MAPS`.

A Google Cloud Map ID is optional in the current browser map implementation.

## 9. What is not promised yet

The product is suitable for a controlled beta, but the following should not be described as solved at internet-scale:

- Durable background workers are not yet implemented.
- Provider caches are process-local, not distributed.
- Production SLOs have not yet been established from sufficient traffic.
- Current engineering tests do not prove production availability or cost behavior.

## 10. Glossary

| Term | Meaning |
|---|---|
| AI generation | Creating a structured candidate trip from user input |
| Enrichment | Resolving and adding factual information about places |
| Canonical place identity | Stable provider place identity, preferably a Google `place_id` |
| Generation job | Persistent record tracking one trip-generation workflow |
| Quota | Number of AI generations available to a user/plan |
| Route enrichment | Adding route/travel information to an itinerary |
| Controlled beta | Small, observable release before broad growth |
| Durable worker | Future background execution system that survives web-process termination |
