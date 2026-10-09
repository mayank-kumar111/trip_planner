# Operations & Incident Runbook

## 1. Generation failures
**Symptoms:** job becomes `failed`, processing stalls, or provider failures increase.

1. Capture timestamp and request/job ID.
2. Inspect server logs for stage and provider failure counts.
3. Confirm provider credentials and quotas.
4. Check whether the job is stale/retryable.
5. Use the application retry path for a failed/stale job.
6. If failures are systemic, pause beta traffic and investigate before retrying at scale.

## 2. Unauthorized trip access
Treat as a security incident. Verify Clerk identity and Convex ownership checks. Do not bypass authorization to reproduce the issue. Rotate credentials only if exposure is suspected.

## 3. Provider outage or quota exhaustion
Expected behavior is bounded failure, not indefinite retries. Check provider status/limits, preserve the job failure state, and avoid manual request loops that can amplify cost.

## 4. Secret exposure
1. Revoke/rotate immediately.
2. Determine where it appeared (Git, logs, screenshots, CI output).
3. Remove exposed material from source/history where required.
4. Update deployment secret.
5. Verify the affected integration with a smoke test.

## 5. Bad deployment
If health or smoke tests fail after deployment, roll back to the last known-good commit and preserve evidence. Re-run the complete release gate before redeploying.

## 6. Observability baseline
Use request IDs, job IDs, stage/status, duration, Places request/cache counts, route request/cache counts, and provider failure counts. Do not log secrets or unnecessary personal data.

## Escalation rule
If ownership, quota integrity, secret confidentiality, or persistent data integrity is uncertain, treat the release as **NO-GO** until the boundary is verified.
