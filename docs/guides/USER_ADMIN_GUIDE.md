# User & Admin Guide

## For travelers
1. Sign in.
2. Describe the trip naturally, including destination, duration/dates, travelers, origin, budget, and preferences when known.
3. The assistant asks only for missing information when the conversation contains enough context.
4. Review the generated itinerary.
5. Reopen saved trips from My Trips.
6. Retry a failed/stale generation when the UI offers that action.

## What the system guarantees
- Exact selected dates are treated as authoritative.
- Itinerary dates are validated for continuity.
- Duplicate resolved places are removed using canonical place identity where available.
- Google provider data is used to enrich factual place information.

## For support/admin staff
Use the operations runbook for failures. Do not request or handle users' provider secrets. For authorization issues, preserve the affected trip/job identifier and timestamp and escalate rather than bypassing ownership checks.

## Beta expectations
The product is designed for controlled beta. A provider outage, missing credential, or background-process interruption can result in a retryable failed/stale job. This is preferable to silently presenting unverified or partially persisted data.
