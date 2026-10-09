import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { v4 as uuidv4 } from "uuid";
import { canRetryGenerationJob, canTransitionGenerationJob, GENERATION_JOB_STALE_MS, getGenerationJobState, MAX_GENERATION_JOB_RETRIES } from "../lib/trip/generation-job";

const MAX_TRIP_DETAIL_CHARS = 512 * 1024;

function isSafeTripDetail(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === "string" && serialized.length <= MAX_TRIP_DETAIL_CHARS;
    } catch {
        return false;
    }
}

async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject?.trim();
    const email = identity?.email?.trim().toLowerCase();
    if (!clerkId) throw new Error("Authentication required");

    let user = await ctx.db.query("UserTable").withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId)).unique();
    if (!user && email) {
        const legacyUsers = await ctx.db.query("UserTable").withIndex("by_email", (q) => q.eq("email", email)).collect();
        const legacyMatches = legacyUsers.filter((candidate) => !candidate.clerkId);
        if (legacyMatches.length === 1) user = legacyMatches[0];
    }
    if (!user) throw new Error("User profile not found");
    return user;
}

async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx) {
    return (await getAuthenticatedUser(ctx))._id;
}

async function getOwnedTrip(ctx: QueryCtx | MutationCtx, tripId: string) {
    const authenticatedUserId = await getAuthenticatedUserId(ctx);
    const trip = await ctx.db.query("TripDetailTable").withIndex("by_uid_tripId", (q) => q.eq("uid", authenticatedUserId).eq("tripId", tripId)).unique();
    if (!trip) throw new Error("Trip not found");
    return trip;
}

async function getOwnedTripByTripId(ctx: QueryCtx, tripId: string) {
    const user = await getAuthenticatedUser(ctx);
    const directTrip = await ctx.db.query("TripDetailTable").withIndex("by_uid_tripId", (q) => q.eq("uid", user._id).eq("tripId", tripId)).unique();
    if (directTrip) return directTrip;
    const candidate = await ctx.db.query("TripDetailTable").withIndex("by_tripId", (q) => q.eq("tripId", tripId)).first();
    if (!candidate || candidate.uid === user._id) return candidate ?? null;
    const owner = await ctx.db.get(candidate.uid);
    const ownerClerkId = typeof owner?.clerkId === "string" ? owner.clerkId.trim() : "";
    return ownerClerkId && ownerClerkId === user.clerkId ? candidate : null;
}

async function getOwnedGenerationJob(ctx: QueryCtx | MutationCtx, tripId: string) {
    const authenticatedUserId = await getAuthenticatedUserId(ctx);
    const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", tripId)).unique();
    if (!job) return null;
    if (job.uid !== authenticatedUserId) throw new Error("Trip generation job not found");
    return job;
}

const WORKER_DISPATCH_MAX_ATTEMPTS = 5;
const WORKER_DISPATCH_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

function getTripWorkerSecret() {
    const secret = process.env.TRIP_WORKER_SECRET?.trim();
    if (!secret) throw new Error("TRIP_WORKER_SECRET is not configured");
    return secret;
}

export const dispatchTripProcessing = internalAction({
    args: { tripId: v.string(), attempt: v.number() },
    handler: async (ctx, args) => {
        const workerUrl = process.env.TRIP_PROCESS_WORKER_URL?.trim();
        if (!workerUrl) throw new Error("TRIP_PROCESS_WORKER_URL is not configured");
        const secret = getTripWorkerSecret();
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Trip-Worker-Secret": secret,
            },
            body: JSON.stringify({ tripId: args.tripId }),
        });
        if (response.ok) return { dispatched: true };
        if (args.attempt >= WORKER_DISPATCH_MAX_ATTEMPTS) {
            throw new Error(`Trip worker dispatch failed after ${args.attempt + 1} attempts (HTTP ${response.status})`);
        }
        const delay = WORKER_DISPATCH_DELAYS_MS[Math.min(args.attempt, WORKER_DISPATCH_DELAYS_MS.length - 1)];
        await ctx.scheduler.runAfter(delay, internal.tripDetail.dispatchTripProcessing, {
            tripId: args.tripId,
            attempt: args.attempt + 1,
        });
        return { dispatched: false, retryScheduled: true, delay };
    },
});

export const GetTripForWorker = query({
    args: { tripId: v.string(), secret: v.string() },
    handler: async (ctx, args) => {
        if (args.secret !== getTripWorkerSecret()) throw new Error("Unauthorized trip worker");
        const trip = await ctx.db.query("TripDetailTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!trip) return null;
        const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!job) return null;
        return { tripId: trip.tripId, uid: String(trip.uid), tripDetail: trip.tripDetail, job: { ...job } };
    },
});

export const ClaimTripGenerationJobForWorker = mutation({
    args: { tripId: v.string(), secret: v.string() },
    handler: async (ctx, args) => {
        if (args.secret !== getTripWorkerSecret()) throw new Error("Unauthorized trip worker");
        const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!job) throw new Error("Trip generation job not found");
        const state = getGenerationJobState(job);
        if (state.canRetry) {
            return { claimed: false, status: job.status, stage: job.stage, isStale: true };
        }
        if (job.status !== "generated") {
            return { claimed: false, status: job.status, stage: job.stage, isStale: false };
        }
        const processingStartedAt = Date.now();
        await ctx.db.patch(job._id, {
            status: "enriching",
            stage: "Enriching trip with place details",
            updatedAt: processingStartedAt,
            processingStartedAt,
            completedAt: undefined,
            durationMs: undefined,
            error: undefined,
            placesRequests: 0,
            placesCacheHits: 0,
            routeRequests: 0,
            routeCacheHits: 0,
            providerFailures: 0,
        });
        const workerToken = uuidv4();
        await ctx.db.patch(job._id, { workerToken });
        return { claimed: true, status: "enriching" as const, stage: "Enriching trip with place details", isStale: false, workerToken };
    },
});

export const UpdateTripDetailForWorker = mutation({
    args: { tripId: v.string(), secret: v.string(), workerToken: v.string(), tripDetail: v.any() },
    handler: async (ctx, args) => {
        if (args.secret !== getTripWorkerSecret()) throw new Error("Unauthorized trip worker");
        const trip = await ctx.db.query("TripDetailTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!trip) throw new Error("Trip not found");
        const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!job || job.workerToken !== args.workerToken) throw new Error("Trip worker lease is no longer valid");
        if (!isSafeTripDetail(args.tripDetail)) throw new Error("Trip detail payload is invalid or too large");
        await ctx.db.patch(trip._id, { tripDetail: args.tripDetail });
        return { tripId: trip.tripId };
    },
});

export const FailTripGenerationJobForWorker = mutation({
    args: { tripId: v.string(), secret: v.string(), error: v.string() },
    handler: async (ctx, args) => {
        if (args.secret !== getTripWorkerSecret()) throw new Error("Unauthorized trip worker");
        const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!job) throw new Error("Trip generation job not found");
        const now = Date.now();
        await ctx.db.patch(job._id, { status: "failed", stage: "Trip validation failed", error: args.error.trim().slice(0, 1000), updatedAt: now, completedAt: now, durationMs: job.processingStartedAt ? Math.max(0, now - job.processingStartedAt) : undefined, workerToken: undefined });
        return { tripId: job.tripId, status: "failed" as const };
    },
});

export const UpdateTripGenerationJobForWorker = mutation({
    args: { tripId: v.string(), secret: v.string(), workerToken: v.string(), status: v.union(v.literal("generated"), v.literal("enriching"), v.literal("enriched"), v.literal("routing"), v.literal("completed"), v.literal("failed")), stage: v.string(), error: v.optional(v.string()), placesRequests: v.optional(v.number()), placesCacheHits: v.optional(v.number()), routeRequests: v.optional(v.number()), routeCacheHits: v.optional(v.number()), providerFailures: v.optional(v.number()) },
    handler: async (ctx, args) => {
        if (args.secret !== getTripWorkerSecret()) throw new Error("Unauthorized trip worker");
        const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        if (!job) throw new Error("Trip generation job not found");
        if (job.workerToken !== args.workerToken) throw new Error("Trip worker lease is no longer valid");
        if (!canTransitionGenerationJob(job.status, args.status)) throw new Error(`Invalid trip generation job transition: ${job.status} -> ${args.status}`);
        const now = Date.now();
        const isTerminal = args.status === "completed" || args.status === "failed";
        const completedAt = isTerminal ? now : undefined;
        const durationMs = isTerminal && job.processingStartedAt ? Math.max(0, now - job.processingStartedAt) : undefined;
        await ctx.db.patch(job._id, {
            status: args.status,
            stage: args.stage.trim(),
            error: args.error?.trim() || undefined,
            updatedAt: now,
            ...(completedAt !== undefined ? { completedAt } : {}),
            ...(durationMs !== undefined ? { durationMs } : {}),
            ...(args.placesRequests !== undefined ? { placesRequests: args.placesRequests } : {}),
            ...(args.placesCacheHits !== undefined ? { placesCacheHits: args.placesCacheHits } : {}),
            ...(args.routeRequests !== undefined ? { routeRequests: args.routeRequests } : {}),
            ...(args.routeCacheHits !== undefined ? { routeCacheHits: args.routeCacheHits } : {}),
            ...(args.providerFailures !== undefined ? { providerFailures: args.providerFailures } : {}),
            ...(isTerminal ? { workerToken: undefined } : {}),
        });
        return { tripId: job.tripId, status: args.status, stage: args.stage.trim() };
    },
});

async function getVisibleGenerationJob(ctx: QueryCtx, tripId: string) {
    const authenticatedUserId = await getAuthenticatedUserId(ctx);
    const job = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", tripId)).unique();
    if (!job || job.uid !== authenticatedUserId) return null;
    return job;
}

export const CreateTripDetail = mutation({
    args: { tripId: v.string(), uid: v.id("UserTable"), tripDetail: v.any() },
    handler: async (ctx, args) => {
        const authenticatedUserId = await getAuthenticatedUserId(ctx);
        if (authenticatedUserId !== args.uid) throw new Error("You can only create trips for your own account");
        if (!isSafeTripDetail(args.tripDetail)) throw new Error("Trip detail payload is invalid or too large");
        const existingTrip = await ctx.db.query("TripDetailTable").withIndex("by_uid_tripId", (q) => q.eq("uid", authenticatedUserId).eq("tripId", args.tripId)).unique();
        if (existingTrip) return existingTrip._id;
        return await ctx.db.insert("TripDetailTable", { tripDetail: args.tripDetail, tripId: args.tripId, uid: authenticatedUserId });
    },
});

export const GetUserTrips = query({ args: { uid: v.id("UserTable") }, handler: async (ctx, args) => { const authenticatedUserId = await getAuthenticatedUserId(ctx); if (authenticatedUserId !== args.uid) throw new Error("You can only access your own trips"); return await ctx.db.query("TripDetailTable").withIndex("by_uid", (q) => q.eq("uid", authenticatedUserId)).order("desc").collect(); } });
export const GetLatestUserTrip = query({ args: { uid: v.id("UserTable") }, handler: async (ctx, args) => { const authenticatedUserId = await getAuthenticatedUserId(ctx); if (authenticatedUserId !== args.uid) throw new Error("You can only access your own trips"); return await ctx.db.query("TripDetailTable").withIndex("by_uid", (q) => q.eq("uid", authenticatedUserId)).order("desc").first(); } });
export const GetTripById = query({ args: { tripId: v.string() }, handler: async (ctx, args) => getOwnedTripByTripId(ctx, args.tripId) });

export const GetTripGenerationJob = query({
    args: { tripId: v.string() },
    handler: async (ctx, args) => {
        const job = await getVisibleGenerationJob(ctx, args.tripId);
        if (!job) return null;
        return { ...job, ...getGenerationJobState(job), maxRetries: MAX_GENERATION_JOB_RETRIES };
    },
});

export const CreateTripGenerationJob = mutation({
    args: { tripId: v.string() },
    handler: async (ctx, args) => {
        const uid = await getAuthenticatedUserId(ctx);
        const trip = await ctx.db.query("TripDetailTable").withIndex("by_uid_tripId", (q) => q.eq("uid", uid).eq("tripId", args.tripId)).unique();
        if (!trip) throw new Error("Trip not found");
        const existing = await ctx.db.query("TripGenerationJobTable").withIndex("by_tripId", (q) => q.eq("tripId", args.tripId)).unique();
        const now = Date.now();
        if (existing) {
            if (existing.uid !== uid) throw new Error("Trip generation job not found");
            throw new Error("Trip generation job already exists; use the retry flow for failed or stale jobs");
        }
        const jobId = await ctx.db.insert("TripGenerationJobTable", { tripId: args.tripId, uid, status: "generated", stage: "AI trip plan generated", createdAt: now, updatedAt: now, retryCount: 0, processingStartedAt: undefined, completedAt: undefined, durationMs: undefined, workerToken: undefined, placesRequests: undefined, placesCacheHits: undefined, routeRequests: undefined, routeCacheHits: undefined, providerFailures: undefined });
        await ctx.scheduler.runAfter(0, internal.tripDetail.dispatchTripProcessing, { tripId: args.tripId, attempt: 0 });
        return jobId;
    },
});

export const RetryTripGenerationJob = mutation({
    args: { tripId: v.string() },
    handler: async (ctx, args) => {
        const job = await getOwnedGenerationJob(ctx, args.tripId);
        if (!job) throw new Error("Trip generation job not found");
        const retryCount = job.retryCount ?? 0;
        if (!canRetryGenerationJob(job, retryCount)) {
            if (retryCount >= MAX_GENERATION_JOB_RETRIES) throw new Error("Maximum trip generation retries reached");
            throw new Error("Trip generation is still in progress");
        }
        const now = Date.now();
        await ctx.db.patch(job._id, { status: "generated", stage: "Retrying trip processing", error: undefined, updatedAt: now, retryCount: retryCount + 1, processingStartedAt: undefined, completedAt: undefined, durationMs: undefined, workerToken: undefined, placesRequests: undefined, placesCacheHits: undefined, routeRequests: undefined, routeCacheHits: undefined, providerFailures: undefined });
        await ctx.scheduler.runAfter(0, internal.tripDetail.dispatchTripProcessing, { tripId: job.tripId, attempt: 0 });
        return { tripId: job.tripId, status: "generated" as const, stage: "Retrying trip processing", retryCount: retryCount + 1, maxRetries: MAX_GENERATION_JOB_RETRIES };
    },
});
export const UpdateTripGenerationJob = mutation({
    args: { tripId: v.string(), status: v.union(v.literal("generated"), v.literal("enriching"), v.literal("enriched"), v.literal("routing"), v.literal("completed"), v.literal("failed")), stage: v.string(), error: v.optional(v.string()), placesRequests: v.optional(v.number()), placesCacheHits: v.optional(v.number()), routeRequests: v.optional(v.number()), routeCacheHits: v.optional(v.number()), providerFailures: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const job = await getOwnedGenerationJob(ctx, args.tripId);
        if (!job) throw new Error("Trip generation job not found");
        const now = Date.now();
        if (!canTransitionGenerationJob(job.status, args.status)) {
            throw new Error(`Invalid trip generation job transition: ${job.status} -> ${args.status}`);
        }
        const isTerminal = args.status === "completed" || args.status === "failed";
        const completedAt = isTerminal ? now : undefined;
        const durationMs = isTerminal && job.processingStartedAt ? Math.max(0, now - job.processingStartedAt) : undefined;
        await ctx.db.patch(job._id, { status: args.status, stage: args.stage.trim(), error: args.error?.trim() || undefined, updatedAt: now, ...(completedAt !== undefined ? { completedAt } : {}), ...(durationMs !== undefined ? { durationMs } : {}), ...(args.placesRequests !== undefined ? { placesRequests: args.placesRequests } : {}), ...(args.placesCacheHits !== undefined ? { placesCacheHits: args.placesCacheHits } : {}), ...(args.routeRequests !== undefined ? { routeRequests: args.routeRequests } : {}), ...(args.routeCacheHits !== undefined ? { routeCacheHits: args.routeCacheHits } : {}), ...(args.providerFailures !== undefined ? { providerFailures: args.providerFailures } : {}) });
        return { tripId: job.tripId, status: args.status, stage: args.stage.trim() };
    },
});



export const recoverStaleTripGenerationJobs = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let recovered = 0;
        let failed = 0;
        for (const status of ["generated", "enriching", "enriched", "routing"] as const) {
            const jobs = await ctx.db.query("TripGenerationJobTable").withIndex("by_status_updatedAt", (q) => q.eq("status", status)).collect();
            for (const job of jobs) {
                if (now - job.updatedAt <= GENERATION_JOB_STALE_MS) continue;
                const retryCount = job.retryCount ?? 0;
                if (retryCount >= MAX_GENERATION_JOB_RETRIES) {
                    await ctx.db.patch(job._id, { status: "failed", stage: "Automatic recovery exhausted", error: "Trip generation became stale and exceeded the automatic retry budget", updatedAt: now, completedAt: now, durationMs: job.processingStartedAt ? Math.max(0, now - job.processingStartedAt) : undefined });
                    failed += 1;
                    continue;
                }
                await ctx.db.patch(job._id, { status: "generated", stage: "Recovering stale trip generation", error: undefined, updatedAt: now, retryCount: retryCount + 1, processingStartedAt: undefined, completedAt: undefined, durationMs: undefined, workerToken: undefined, placesRequests: undefined, placesCacheHits: undefined, routeRequests: undefined, routeCacheHits: undefined, providerFailures: undefined });
                await ctx.scheduler.runAfter(0, internal.tripDetail.dispatchTripProcessing, { tripId: job.tripId, attempt: 0 });
                recovered += 1;
            }
        }
        return { recovered, failed };
    },
});

export const GetUserGenerationJobs = query({ args: {}, handler: async (ctx) => { const uid = await getAuthenticatedUserId(ctx); return await ctx.db.query("TripGenerationJobTable").withIndex("by_uid", (q) => q.eq("uid", uid)).order("desc").collect(); } });
export const GetTripByShareToken = query({ args: { shareToken: v.string() }, handler: async (ctx, args) => { const token = args.shareToken.trim(); if (!token) return null; const trip = await ctx.db.query("TripDetailTable").withIndex("by_shareToken", (q) => q.eq("shareToken", token)).unique(); if (!trip || !trip.shareToken) return null; return { tripId: trip.tripId, tripDetail: trip.tripDetail, sharedAt: trip.sharedAt ?? null }; } });
export const CreateTripShareLink = mutation({ args: { tripId: v.string() }, handler: async (ctx, args) => { const trip = await getOwnedTrip(ctx, args.tripId); if (trip.shareToken) return { tripId: trip.tripId, shareToken: trip.shareToken, sharedAt: trip.sharedAt ?? null }; let shareToken = uuidv4(); while (await ctx.db.query("TripDetailTable").withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken)).unique()) shareToken = uuidv4(); const sharedAt = Date.now(); await ctx.db.patch(trip._id, { shareToken, sharedAt }); return { tripId: trip.tripId, shareToken, sharedAt }; } });
export const RevokeTripShareLink = mutation({ args: { tripId: v.string() }, handler: async (ctx, args) => { const trip = await getOwnedTrip(ctx, args.tripId); await ctx.db.patch(trip._id, { shareToken: undefined, sharedAt: undefined }); return { revoked: true, tripId: trip.tripId }; } });
export const UpdateTripPreferences = mutation({ args: { tripId: v.string(), origin: v.string(), destination: v.string(), duration: v.string(), group_size: v.string(), budget: v.string(), travel_dates: v.optional(v.string()), start_date: v.optional(v.string()), end_date: v.optional(v.string()), interests: v.optional(v.string()), special_requirements: v.optional(v.string()) }, handler: async (ctx, args) => { const trip = await getOwnedTrip(ctx, args.tripId); const existing = trip.tripDetail && typeof trip.tripDetail === "object" ? trip.tripDetail : {}; const updatedTripDetail = { ...existing, origin: args.origin.trim(), destination: args.destination.trim(), duration: args.duration.trim(), group_size: args.group_size.trim(), budget: args.budget.trim(), ...(args.travel_dates?.trim() ? { travel_dates: args.travel_dates.trim() } : {}), ...(args.start_date?.trim() ? { start_date: args.start_date.trim() } : {}), ...(args.end_date?.trim() ? { end_date: args.end_date.trim() } : {}), ...(args.interests?.trim() ? { interests: args.interests.trim() } : {}), ...(args.special_requirements?.trim() ? { special_requirements: args.special_requirements.trim() } : {}) }; if (!isSafeTripDetail(updatedTripDetail)) throw new Error("Trip detail payload is invalid or too large"); await ctx.db.patch(trip._id, { tripDetail: updatedTripDetail }); return { tripId: trip.tripId, tripDetail: updatedTripDetail }; } });
export const UpdateTripDetail = mutation({ args: { tripId: v.string(), tripDetail: v.any() }, handler: async (ctx, args) => { const trip = await getOwnedTrip(ctx, args.tripId); if (!isSafeTripDetail(args.tripDetail)) throw new Error("Trip detail payload is invalid or too large"); await ctx.db.patch(trip._id, { tripDetail: args.tripDetail }); return { tripId: trip.tripId, tripDetail: args.tripDetail }; } });
export const DeleteTrip = mutation({ args: { tripId: v.string() }, handler: async (ctx, args) => { const trip = await getOwnedTrip(ctx, args.tripId); await ctx.db.delete(trip._id); return { deleted: true, tripId: trip.tripId }; } });
