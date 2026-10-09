import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { processBackgroundTrip, type BackgroundTripPlan } from "@/lib/trip/background-processing";
import { validateTripPlan } from "@/lib/trip/validation";
import { RequestBodyError, readJsonBody } from "@/lib/security/request-body";
import { getRequestId, withRequestId } from "@/lib/security/request-id";

const MAX_REQUEST_BYTES = 32 * 1024;

function getWorkerSecret() {
  const secret = process.env.TRIP_WORKER_SECRET?.trim();
  return secret || null;
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const workerSecret = getWorkerSecret();
  if (!workerSecret || req.headers.get("x-trip-worker-secret") !== workerSecret) {
    return withRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId);
  }

  try {
    const body = await readJsonBody<{ tripId?: unknown }>(req, MAX_REQUEST_BYTES);
    const tripId = typeof body?.tripId === "string" ? body.tripId.trim() : "";
    if (!tripId) return withRequestId(NextResponse.json({ error: "tripId is required" }, { status: 400 }), requestId);
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return withRequestId(NextResponse.json({ error: "Trip processing is temporarily unavailable" }, { status: 503 }), requestId);
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const secret = workerSecret;
    const record = await convex.query(api.tripDetail.GetTripForWorker, { tripId, secret });
    if (!record) return withRequestId(NextResponse.json({ error: "Trip generation job not found" }, { status: 404 }), requestId);
    if (!validateTripPlan(record.tripDetail).valid) {
      await convex.mutation(api.tripDetail.FailTripGenerationJobForWorker, { tripId, secret, error: "Persisted trip plan failed runtime validation" });
      return withRequestId(NextResponse.json({ accepted: false, tripId, status: "failed" }, { status: 200 }), requestId);
    }

    const claim = await convex.mutation(api.tripDetail.ClaimTripGenerationJobForWorker, { tripId, secret });
    if (!claim.claimed) {
      return withRequestId(NextResponse.json({ accepted: false, alreadyProcessing: true, tripId, status: claim.status, stage: claim.stage }, { status: 202 }), requestId);
    }

    if (!claim.workerToken) throw new Error("Trip worker lease was not issued");
    const workerToken = claim.workerToken;

    const persistence = {
      updateTripDetail: async (id: string, tripDetail: BackgroundTripPlan & { trip_intelligence: Record<string, unknown> }) => {
        await convex.mutation(api.tripDetail.UpdateTripDetailForWorker, { tripId: id, secret, workerToken, tripDetail });
      },
      updateJob: async (id: string, payload: { status: "enriching" | "enriched" | "routing" | "completed" | "failed"; stage: string; error?: string; placesRequests?: number; placesCacheHits?: number; routeRequests?: number; routeCacheHits?: number; providerFailures?: number }) => {
        await convex.mutation(api.tripDetail.UpdateTripGenerationJobForWorker, { tripId: id, secret, workerToken, ...payload });
      },
    };

    const result = await processBackgroundTrip({
      convex,
      tripId,
      tripPlan: record.tripDetail as BackgroundTripPlan,
      requestId,
      userId: record.uid,
      persistence,
    });

    return withRequestId(NextResponse.json({ accepted: true, tripId, status: result.status, metrics: result.metrics }, { status: 200 }), requestId);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return withRequestId(NextResponse.json({ error: error.message }, { status: error.status }), requestId);
    }
    console.error("Trip worker failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return withRequestId(NextResponse.json({ error: "Trip worker failed" }, { status: 500 }), requestId);
  }
}
