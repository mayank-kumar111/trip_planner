# `api/aimodel`

Server-side AI trip-generation endpoint. It extracts conversation context, reserves quota, calls Gemini, validates the structured plan, and persists the initial generation state.

Inputs are authenticated conversation payloads; output is a validated raw trip plan or a safe error. Quota reservation/finalization is server-owned.
