export const GENERATION_JOB_STALE_MS = 3 * 60 * 1000;
export const MAX_GENERATION_JOB_RETRIES = 3;

export type GenerationJobStatus =
  | "generated"
  | "enriching"
  | "enriched"
  | "routing"
  | "completed"
  | "failed";

export type GenerationJobSnapshot = {
  status: GenerationJobStatus;
  updatedAt: number;
};

const ALLOWED_GENERATION_JOB_TRANSITIONS: Record<GenerationJobStatus, readonly GenerationJobStatus[]> = {
  generated: ["generated", "enriching", "failed"],
  enriching: ["enriching", "enriched", "failed"],
  enriched: ["enriched", "routing", "failed"],
  routing: ["routing", "completed", "failed"],
  completed: ["completed"],
  failed: ["failed"],
};

export function canTransitionGenerationJob(
  from: GenerationJobStatus,
  to: GenerationJobStatus,
) {
  return ALLOWED_GENERATION_JOB_TRANSITIONS[from].includes(to);
}

export function getGenerationJobState(
  job: GenerationJobSnapshot,
  now = Date.now(),
) {
  const isStale =
    job.status !== "completed" && now - job.updatedAt > GENERATION_JOB_STALE_MS;
  const canRetry = job.status === "failed" || isStale;

  return { isStale, canRetry };
}

export function canRetryGenerationJob(
  job: GenerationJobSnapshot,
  retryCount = 0,
  now = Date.now(),
) {
  if (retryCount >= MAX_GENERATION_JOB_RETRIES) return false;
  return getGenerationJobState(job, now).canRetry;
}

export function canAutoRecoverGenerationJob(
  job: GenerationJobSnapshot,
  retryCount = 0,
  now = Date.now(),
) {
  if (!["generated", "enriching", "enriched", "routing"].includes(job.status)) return false;
  if (retryCount >= MAX_GENERATION_JOB_RETRIES) return false;
  return now - job.updatedAt > GENERATION_JOB_STALE_MS;
}

export function canCreateGenerationJob(job: GenerationJobSnapshot | null) {
  return job === null;
}

export function canClaimGenerationJob(
  job: GenerationJobSnapshot | null,
  now = Date.now(),
) {
  if (!job) return false;
  const { canRetry } = getGenerationJobState(job, now);
  return !canRetry && job.status === "generated";
}
