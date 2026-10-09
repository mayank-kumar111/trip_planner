import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERATION_JOB_STALE_MS,
  MAX_GENERATION_JOB_RETRIES,
  canClaimGenerationJob,
  canAutoRecoverGenerationJob,
  canCreateGenerationJob,
  canRetryGenerationJob,
  canTransitionGenerationJob,
  getGenerationJobState,
} from "../lib/trip/generation-job.ts";

const NOW = 1_000_000;

function job(status: Parameters<typeof getGenerationJobState>[0]["status"], updatedAt = NOW) {
  return { status, updatedAt };
}

test("failed jobs are retryable but cannot be recreated", () => {
  const state = getGenerationJobState(job("failed"), NOW);
  assert.equal(state.canRetry, true);
  assert.equal(state.isStale, false);
  assert.equal(canCreateGenerationJob(job("failed")), false);
  assert.equal(canRetryGenerationJob(job("failed"), 0, NOW), true);
});

test("stale in-progress jobs become retryable but cannot be recreated", () => {
  const staleAt = NOW - GENERATION_JOB_STALE_MS - 1;
  const state = getGenerationJobState(job("enriching", staleAt), NOW);
  assert.equal(state.isStale, true);
  assert.equal(state.canRetry, true);
  assert.equal(canCreateGenerationJob(job("enriching", staleAt)), false);
  assert.equal(canRetryGenerationJob(job("enriching", staleAt), 0, NOW), true);
});

test("retry budget blocks retries at the maximum", () => {
  assert.equal(canRetryGenerationJob(job("failed"), MAX_GENERATION_JOB_RETRIES - 1, NOW), true);
  assert.equal(canRetryGenerationJob(job("failed"), MAX_GENERATION_JOB_RETRIES, NOW), false);
  assert.equal(canRetryGenerationJob(job("failed"), MAX_GENERATION_JOB_RETRIES + 1, NOW), false);
});


test("automatic recovery only targets stale active jobs within the retry budget", () => {
  const staleAt = NOW - GENERATION_JOB_STALE_MS - 1;
  assert.equal(canAutoRecoverGenerationJob(job("generated", staleAt), 0, NOW), true);
  assert.equal(canAutoRecoverGenerationJob(job("enriching", staleAt), MAX_GENERATION_JOB_RETRIES - 1, NOW), true);
  assert.equal(canAutoRecoverGenerationJob(job("routing", staleAt), MAX_GENERATION_JOB_RETRIES, NOW), false);
  assert.equal(canAutoRecoverGenerationJob(job("failed", staleAt), 0, NOW), false);
  assert.equal(canAutoRecoverGenerationJob(job("completed", staleAt), 0, NOW), false);
  assert.equal(canAutoRecoverGenerationJob(job("enriching", NOW), 0, NOW), false);
});

test("fresh active jobs cannot be duplicated or claimed", () => {
  const active = job("enriching");
  assert.equal(canCreateGenerationJob(active), false);
  assert.equal(canClaimGenerationJob(active, NOW), false);
  assert.equal(canRetryGenerationJob(active, 0, NOW), false);
});

test("only a fresh generated job can be claimed", () => {
  assert.equal(canClaimGenerationJob(job("generated"), NOW), true);
  assert.equal(canClaimGenerationJob(job("completed"), NOW), false);
  assert.equal(canClaimGenerationJob(job("failed"), NOW), false);
  assert.equal(canClaimGenerationJob(job("generated", NOW - GENERATION_JOB_STALE_MS - 1), NOW), false);
});

test("existing jobs cannot start a new generation through creation", () => {
  assert.equal(canCreateGenerationJob(job("completed")), false);
  assert.equal(canCreateGenerationJob(job("failed")), false);
  assert.equal(canCreateGenerationJob(job("enriching")), false);
});

test("missing jobs can be created but cannot be claimed", () => {
  assert.equal(canClaimGenerationJob(null, NOW), false);
  assert.equal(canCreateGenerationJob(null), true);
});

test("generation job transitions allow only the production lifecycle", () => {
  assert.equal(canTransitionGenerationJob("generated", "enriching"), true);
  assert.equal(canTransitionGenerationJob("enriching", "enriched"), true);
  assert.equal(canTransitionGenerationJob("enriched", "routing"), true);
  assert.equal(canTransitionGenerationJob("routing", "completed"), true);
  assert.equal(canTransitionGenerationJob("enriching", "failed"), true);
  assert.equal(canTransitionGenerationJob("generated", "completed"), false);
  assert.equal(canTransitionGenerationJob("completed", "routing"), false);
  assert.equal(canTransitionGenerationJob("failed", "completed"), false);
});
