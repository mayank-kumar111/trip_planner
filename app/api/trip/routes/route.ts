import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addRoadRoutes } from "@/lib/trip/routing";
import type { Coordinates, TripActivity, TripDay } from "@/lib/trip/intelligence";
import { validateTripPlan } from "@/lib/trip/validation";
import { aj } from "@/lib/security/arcjet";
import { getRequestId, withRequestId } from "@/lib/security/request-id";
import { RequestBodyError, readJsonBody } from "@/lib/security/request-body";

type TripPlan = {
  itinerary: TripDay[];
  hotels: TripActivity[];
  trip_intelligence?: Record<string, unknown>;
  [key: string]: unknown;
};

const MAX_REQUEST_BYTES = 512 * 1024;

function hasCoordinates(value: unknown): value is { geo_coordinates: Coordinates } {
  if (!value || typeof value !== "object") return false;
  const coordinates = (value as Record<string, unknown>).geo_coordinates;
  if (!coordinates || typeof coordinates !== "object") return false;
  const candidate = coordinates as Record<string, unknown>;
  return Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude);
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  let authenticatedUserId: string | undefined;

  try {
    const { userId } = await auth();
    authenticatedUserId = userId ?? undefined;
    if (!userId) {
      return withRequestId(NextResponse.json({ error: "Authentication required" }, { status: 401 }), requestId);
    }

    let body: unknown;
    try {
      body = await readJsonBody(req, MAX_REQUEST_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return withRequestId(NextResponse.json({ error: error.message }, { status: error.status }), requestId);
      }
      throw error;
    }

    const candidateTripPlan = (body as { trip_plan?: unknown } | null)?.trip_plan;
    if (!validateTripPlan(candidateTripPlan)) {
      return withRequestId(NextResponse.json({ error: "Invalid trip_plan payload" }, { status: 400 }), requestId);
    }

    const tripPlan = candidateTripPlan as TripPlan;
    const routeRateUnits = Math.max(1, tripPlan.itinerary.length);
    const decision = await aj.protect(req, { userId, requested: routeRateUnits });
    if (decision.isDenied()) {
      return withRequestId(
        NextResponse.json({ error: "Too Many Requests", reason: decision.reason }, { status: 429 }),
        requestId,
      );
    }

    const hotelCoordinates = Array.isArray(tripPlan.hotels) && hasCoordinates(tripPlan.hotels[0])
      ? tripPlan.hotels[0].geo_coordinates
      : undefined;
    const routeResult = await addRoadRoutes(tripPlan.itinerary, hotelCoordinates);
    const routeItinerary = routeResult.itinerary.map((day) => ({ ...day, route_optimized: routeResult.enabled }));

    console.info("Trip route enrichment completed", {
      requestId,
      userId,
      durationMs: Date.now() - startedAt,
      routeSegments: routeResult.segmentCount,
    });

    return withRequestId(NextResponse.json({
      trip_plan: {
        ...tripPlan,
        itinerary: routeItinerary,
        trip_intelligence: {
          ...(tripPlan.trip_intelligence && typeof tripPlan.trip_intelligence === "object" ? tripPlan.trip_intelligence : {}),
          route_data_source: routeResult.enabled ? "Google Routes API" : "unavailable",
          total_route_distance: routeResult.enabled ? `${(routeResult.totalDistanceMeters / 1000).toFixed(1)} km` : "Not available",
          total_route_duration: routeResult.enabled ? `${Math.round(routeResult.totalDurationSeconds / 60)} min` : "Not available",
          route_segment_count: routeResult.segmentCount,
        },
      },
    }, { status: 200 }), requestId);
  } catch (error) {
    console.error("Trip route enrichment error", {
      requestId,
      userId: authenticatedUserId,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return withRequestId(NextResponse.json({ error: "Unable to calculate trip routes" }, { status: 502 }), requestId);
  }
}
