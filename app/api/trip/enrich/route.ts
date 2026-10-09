import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { googlePhotoProxyUrl } from "@/lib/places/google";
import { lookupGooglePlace } from "@/lib/places/cache";
import { formatRouteDistance, formatRouteDuration } from "@/lib/maps/routes";
import { optimizeTripIntelligence, type Coordinates, type TripActivity, type TripDay, type TripHotel } from "@/lib/trip/intelligence";
import { addRoadRoutes } from "@/lib/trip/routing";
import { dedupeTripPlaces } from "@/lib/trip/place-identity";
import { aj } from "@/lib/security/arcjet";
import { getRequestId, withRequestId } from "@/lib/security/request-id";
import { RequestBodyError, readJsonBody } from "@/lib/security/request-body";

const MAX_HOTELS = 12;
const MAX_ITINERARY_DAYS = 30;
const MAX_ACTIVITIES_PER_DAY = 12;
const MAX_TEXT_LENGTH = 1_000;
const MAX_REQUEST_BYTES = 512 * 1024;
const PROVIDER_ITEMS_PER_RATE_UNIT = 20;

type TripPlan = {
  destination: string;
  duration: string;
  origin: string;
  budget: string;
  group_size: string;
  hotels: TripHotel[];
  itinerary: TripDay[];
  [key: string]: unknown;
};

function cleanText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function addUnverifiedMetadata<T extends Record<string, unknown>>(item: T) { return { ...item, place_verified: false, data_source: "AI estimate" }; }
function hasCoordinates(value: unknown): value is { geo_coordinates: Coordinates } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinates = (value as Record<string, unknown>).geo_coordinates;
  if (!coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) return false;
  const record = coordinates as Record<string, unknown>;
  return Number.isFinite(record.latitude) && Number.isFinite(record.longitude);
}
function isSafeText(value: unknown) { return typeof value === "string" && value.trim().length <= MAX_TEXT_LENGTH; }
function validateTripPlan(value: unknown): value is TripPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const plan = value as Record<string, unknown>;
  if (!["destination", "duration", "origin", "budget", "group_size"].every((key) => isSafeText(plan[key]))) return false;
  const hotels = plan.hotels; const itinerary = plan.itinerary;
  if (!Array.isArray(hotels) || hotels.length > MAX_HOTELS) return false;
  if (!Array.isArray(itinerary) || itinerary.length > MAX_ITINERARY_DAYS) return false;
  for (const hotel of hotels) {
    if (!hotel || typeof hotel !== "object" || Array.isArray(hotel)) return false;
    const item = hotel as Record<string, unknown>;
    if (!isSafeText(item.hotel_name) || !isSafeText(item.hotel_address)) return false;
    if (item.geo_coordinates !== undefined && !hasCoordinates(item)) return false;
  }
  for (const day of itinerary) {
    if (!day || typeof day !== "object" || Array.isArray(day)) return false;
    const item = day as Record<string, unknown>;
    if (!Number.isInteger(item.day) || !isSafeText(item.day_plan) || !isSafeText(item.best_time_to_visit_day)) return false;
    const activities = item.activities;
    if (!Array.isArray(activities) || activities.length > MAX_ACTIVITIES_PER_DAY) return false;
    for (const activity of activities) {
      if (!activity || typeof activity !== "object" || Array.isArray(activity)) return false;
      const place = activity as Record<string, unknown>;
      if (!isSafeText(place.place_name) || !isSafeText(place.place_address)) return false;
      if (place.geo_coordinates !== undefined && !hasCoordinates(place)) return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req); const startedAt = Date.now(); let authenticatedUserId: string | undefined;
  try {
    const { userId } = await auth(); authenticatedUserId = userId ?? undefined;
    if (!userId) return withRequestId(NextResponse.json({ error: "Authentication required" }, { status: 401 }), requestId);
    const body = await readJsonBody(req, MAX_REQUEST_BYTES);
    const tripPlan = (body as { trip_plan?: unknown } | null)?.trip_plan;
    if (!validateTripPlan(tripPlan)) return withRequestId(NextResponse.json({ error: "Invalid trip_plan payload or payload exceeds enrichment limits" }, { status: 400 }), requestId);
    const skipRoutes = new URL(req.url).searchParams.get("routes") === "false";
    const hotels = tripPlan.hotels; const itinerary = tripPlan.itinerary;
    const totalActivities = itinerary.reduce((count, day) => count + (day.activities?.length ?? 0), 0);
    const providerItems = hotels.length + totalActivities;
    const requestedRateUnits = Math.max(1, Math.ceil(providerItems / PROVIDER_ITEMS_PER_RATE_UNIT));
    const decision = await aj.protect(req, { userId, requested: requestedRateUnits });
    if (decision.isDenied()) return withRequestId(NextResponse.json({ error: "Too Many Requests", reason: decision.reason }, { status: 429 }), requestId);
    const enrichedHotels = await Promise.all(hotels.map(async (hotel: TripHotel) => {
      const name = cleanText(hotel.hotel_name); if (!name) return addUnverifiedMetadata(hotel);
      try {
        const address = cleanText(hotel.hotel_address); const place = await lookupGooglePlace({ name, address: address || undefined }); if (!place) return addUnverifiedMetadata(hotel);
        return { ...hotel, hotel_name: place.displayName ?? hotel.hotel_name, hotel_address: place.formattedAddress ?? hotel.hotel_address, hotel_image_url: googlePhotoProxyUrl(place.photoName) ?? hotel.hotel_image_url, geo_coordinates: place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : hotel.geo_coordinates, rating: place.rating ?? hotel.rating, place_id: place.placeId, place_verified: true, rating_verified: place.rating !== null, data_source: "Google Places" };
      } catch (error) { console.warn(`Hotel enrichment skipped for ${name}:`, error); return addUnverifiedMetadata(hotel); }
    }));
    const enrichedItinerary = await Promise.all(itinerary.map(async (day: TripDay) => {
      const activities = Array.isArray(day.activities) ? day.activities : [];
      const enrichedActivities = await Promise.all(activities.map(async (activity: TripActivity) => {
        const name = cleanText(activity.place_name); if (!name) return addUnverifiedMetadata(activity);
        try {
          const address = cleanText(activity.place_address); const place = await lookupGooglePlace({ name, address: address || undefined }); if (!place) return addUnverifiedMetadata(activity);
          return { ...activity, place_name: place.displayName ?? activity.place_name, place_address: place.formattedAddress ?? activity.place_address, place_image_url: googlePhotoProxyUrl(place.photoName) ?? activity.place_image_url, geo_coordinates: place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : activity.geo_coordinates, place_id: place.placeId, place_verified: true, rating_verified: place.rating !== null, data_source: "Google Places" };
        } catch (error) { console.warn(`Activity enrichment skipped for ${name}:`, error); return addUnverifiedMetadata(activity); }
      }));
      return { ...day, activities: enrichedActivities };
    }));
    const deduped = dedupeTripPlaces({ hotels: enrichedHotels, itinerary: enrichedItinerary });
    const enrichedPlan = { ...tripPlan, hotels: deduped.hotels, itinerary: deduped.itinerary };
    const intelligence = optimizeTripIntelligence({ tripPlan: enrichedPlan });
    const routeResult = skipRoutes
      ? { itinerary: intelligence.itinerary, enabled: false, totalDistanceMeters: 0, totalDurationSeconds: 0, segmentCount: 0 }
      : await addRoadRoutes(intelligence.itinerary, deduped.hotels[0]?.geo_coordinates);
    const verifiedHotels = deduped.hotels.filter((hotel) => hotel.place_verified).length;
    const totalPlaces = deduped.itinerary.reduce((count, day) => count + (day.activities?.length ?? 0), 0);
    const verifiedPlaces = deduped.itinerary.reduce((count, day) => count + (day.activities?.filter((activity) => activity.place_verified).length ?? 0), 0);
    console.info("Trip enrichment completed", { requestId, userId, durationMs: Date.now() - startedAt, routesIncluded: !skipRoutes, verifiedHotels, totalHotels: deduped.hotels.length, verifiedPlaces, totalPlaces, duplicateHotelsRemoved: deduped.stats.duplicateHotelsRemoved, duplicateActivitiesRemoved: deduped.stats.duplicateActivitiesRemoved, routeSegments: routeResult.segmentCount });
    return withRequestId(NextResponse.json({ trip_plan: { ...enrichedPlan, itinerary: routeResult.itinerary, trip_intelligence: { ...intelligence.summary, optimization_strategy: intelligence.optimization.strategy, optimization_note: routeResult.enabled ? "Activities are ordered using geographic distance and enriched with Google road distance and driving time." : intelligence.optimization.note, route_data_source: routeResult.enabled ? "Google Routes API" : "unavailable", total_route_distance: routeResult.enabled ? formatRouteDistance(routeResult.totalDistanceMeters) : "Not available", total_route_duration: routeResult.enabled ? formatRouteDuration(routeResult.totalDurationSeconds) : "Not available", route_segment_count: routeResult.segmentCount, verified_hotels: verifiedHotels, total_hotels: deduped.hotels.length, verified_places: verifiedPlaces, total_places: totalPlaces, duplicate_hotels_removed: deduped.stats.duplicateHotelsRemoved, duplicate_activities_removed: deduped.stats.duplicateActivitiesRemoved } } }), requestId);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return withRequestId(NextResponse.json({ error: error.message }, { status: error.status }), requestId);
    }
    console.error("Trip enrichment error", { requestId, userId: authenticatedUserId, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "Unknown error" });
    return withRequestId(NextResponse.json({ error: "Unable to enrich trip data" }, { status: 502 }), requestId);
  }
}
