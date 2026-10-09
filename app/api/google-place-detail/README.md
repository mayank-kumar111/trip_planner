# `api/google-place-detail`

Authenticated Google Places detail boundary. Inputs are bounded place-name requests; output is provider-derived place detail with safe error handling. Clerk and Arcjet protect the expensive provider path and shared cache reduces duplicate calls.
