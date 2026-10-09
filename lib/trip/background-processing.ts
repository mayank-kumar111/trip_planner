import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { lookupGooglePlaceWithStats } from "../places/cache";
import { googlePhotoProxyUrl } from "../places/google";
import { formatRouteDistance, formatRouteDuration } from "../maps/routes";
import { optimizeTripIntelligence, type TripActivity, type TripDay, type TripHotel, type TripIntelligenceResult } from "./intelligence";
import { addRoadRoutes, type RouteResult } from "./routing";
import { dedupeTripPlaces } from "./place-identity";
import { runGenerationPipeline, type GenerationPipelineMetrics } from "./generation-pipeline";

export type BackgroundTripPlan = {
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
function addUnverifiedMetadata<T extends Record<string, unknown>>(item: T) {
  const fallback = { ...item };
  delete fallback.hotel_image_url;
  delete fallback.place_image_url;
  return { ...fallback, place_verified: false, data_source: "AI estimate" };
}

async function enrichTripPlan(plan: BackgroundTripPlan, metrics: GenerationPipelineMetrics) {
  const enrichedHotels = await Promise.all(plan.hotels.map(async (hotel: TripHotel) => {
    const name = cleanText(hotel.hotel_name);
    if (!name) return addUnverifiedMetadata(hotel);
    try {
      const address = cleanText(hotel.hotel_address);
      const lookup = await lookupGooglePlaceWithStats({ name, address: address || undefined });
      metrics.placesRequests += lookup.stats.providerRequest ? 1 : 0;
      metrics.placesCacheHits += lookup.stats.cacheHit ? 1 : 0;
      const place = lookup.place;
      if (!place) return addUnverifiedMetadata(hotel);
      return { ...hotel, hotel_name: place.displayName ?? hotel.hotel_name, hotel_address: place.formattedAddress ?? hotel.hotel_address, hotel_image_url: googlePhotoProxyUrl(place.photoName) ?? hotel.hotel_image_url, geo_coordinates: place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : hotel.geo_coordinates, rating: place.rating ?? hotel.rating, place_id: place.placeId, place_verified: true, rating_verified: place.rating !== null, data_source: "Google Places" };
    } catch {
      metrics.providerFailures += 1;
      return addUnverifiedMetadata(hotel);
    }
  }));

  const enrichedItinerary = await Promise.all(plan.itinerary.map(async (day: TripDay) => {
    const activities = Array.isArray(day.activities) ? day.activities : [];
    const enrichedActivities = await Promise.all(activities.map(async (activity: TripActivity) => {
      const name = cleanText(activity.place_name);
      if (!name) return addUnverifiedMetadata(activity);
      try {
        const address = cleanText(activity.place_address);
        const lookup = await lookupGooglePlaceWithStats({ name, address: address || undefined });
        metrics.placesRequests += lookup.stats.providerRequest ? 1 : 0;
        metrics.placesCacheHits += lookup.stats.cacheHit ? 1 : 0;
        const place = lookup.place;
        if (!place) return addUnverifiedMetadata(activity);
        return { ...activity, place_name: place.displayName ?? activity.place_name, place_address: place.formattedAddress ?? activity.place_address, place_image_url: googlePhotoProxyUrl(place.photoName) ?? activity.place_image_url, geo_coordinates: place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : activity.geo_coordinates, place_id: place.placeId, place_verified: true, rating_verified: place.rating !== null, data_source: "Google Places" };
      } catch {
        metrics.providerFailures += 1;
        return addUnverifiedMetadata(activity);
      }
    }));
    return { ...day, activities: enrichedActivities };
  }));

  const deduped = dedupeTripPlaces({ hotels: enrichedHotels, itinerary: enrichedItinerary });
  return { ...plan, hotels: deduped.hotels, itinerary: deduped.itinerary };
}

function buildTripSummary(plan: BackgroundTripPlan, intelligence: TripIntelligenceResult, routeResult?: RouteResult) {
  return {
    ...intelligence.summary,
    optimization_strategy: intelligence.optimization.strategy,
    optimization_note: routeResult?.enabled ? "Activities are ordered using geographic distance and enriched with Google road distance and driving time." : intelligence.optimization.note,
    route_data_source: routeResult?.enabled ? "Google Routes API" : "unavailable",
    total_route_distance: routeResult?.enabled ? formatRouteDistance(routeResult.totalDistanceMeters) : "Not available",
    total_route_duration: routeResult?.enabled ? formatRouteDuration(routeResult.totalDurationSeconds) : "Not available",
    route_segment_count: routeResult?.segmentCount ?? 0,
    verified_hotels: plan.hotels.filter((hotel) => hotel.place_verified).length,
    total_hotels: plan.hotels.length,
    verified_places: plan.itinerary.reduce((count, day) => count + (day.activities?.filter((activity) => activity.place_verified).length ?? 0), 0),
    total_places: plan.itinerary.reduce((count, day) => count + (day.activities?.length ?? 0), 0),
  };
}

export function buildTripIntelligence(plan: BackgroundTripPlan, routeResult?: RouteResult) {
  const intelligence = optimizeTripIntelligence({ tripPlan: plan });
  return { intelligence, summary: buildTripSummary(plan, intelligence, routeResult) };
}

export type BackgroundProcessingServices = {
  enrich: (plan: BackgroundTripPlan, metrics: GenerationPipelineMetrics) => Promise<BackgroundTripPlan>;
  optimize: (plan: BackgroundTripPlan) => ReturnType<typeof buildTripIntelligence>;
  route: (intelligence: ReturnType<typeof buildTripIntelligence>["intelligence"], plan: BackgroundTripPlan, metrics: GenerationPipelineMetrics) => Promise<RouteResult>;
};

export type BackgroundProcessingPersistence = {
  updateTripDetail: (tripId: string, tripDetail: BackgroundTripPlan & { trip_intelligence: Record<string, unknown> }) => Promise<void>;
  updateJob: (tripId: string, payload: { status: "enriching" | "enriched" | "routing" | "completed" | "failed"; stage: string; error?: string; placesRequests?: number; placesCacheHits?: number; routeRequests?: number; routeCacheHits?: number; providerFailures?: number }) => Promise<void>;
};

const defaultBackgroundProcessingServices: BackgroundProcessingServices = {
  enrich: enrichTripPlan,
  optimize: (plan) => buildTripIntelligence(plan),
  route: async (intelligence, plan, metrics) => {
    const routeResult = await addRoadRoutes(intelligence.itinerary, plan.hotels[0]?.geo_coordinates);
    metrics.routeRequests += routeResult.routeRequests;
    metrics.routeCacheHits += routeResult.routeCacheHits;
    metrics.providerFailures += routeResult.providerFailures;
    return routeResult;
  },
};

function createConvexPersistence(convex: ConvexHttpClient): BackgroundProcessingPersistence {
  return {
    updateTripDetail: async (tripId, tripDetail) => {
      await convex.mutation(api.tripDetail.UpdateTripDetail, { tripId, tripDetail });
    },
    updateJob: async (tripId, payload) => {
      await convex.mutation(api.tripDetail.UpdateTripGenerationJob, { tripId, ...payload });
    },
  };
}

export async function processBackgroundTrip({ convex, tripId, tripPlan, requestId, userId, services = defaultBackgroundProcessingServices, persistence }: { convex: ConvexHttpClient; tripId: string; tripPlan: BackgroundTripPlan; requestId: string; userId: string; services?: BackgroundProcessingServices; persistence?: BackgroundProcessingPersistence }) {
  const startedAt = Date.now();
  const store = persistence ?? createConvexPersistence(convex);
  let currentStatus: "enriching" | "enriched" | "routing" = "enriching";
  let currentStage = "Enriching hotels and places";
  const heartbeat = setInterval(() => {
    void store.updateJob(tripId, { status: currentStatus, stage: currentStage }).catch((error) => {
      console.warn("Trip generation heartbeat failed:", error);
    });
  }, 60_000);
  const stopHeartbeat = () => clearInterval(heartbeat);
  return runGenerationPipeline({
    plan: tripPlan,
    hooks: {
      enrich: services.enrich,
      optimize: (plan) => services.optimize(plan).intelligence,
      saveEnriched: async (plan, intelligence) => {
        await store.updateTripDetail(tripId, { ...plan, trip_intelligence: buildTripSummary(plan, intelligence) });
      },
      setStage: async (status) => {
        currentStatus = status;
        currentStage = status === "enriching" ? "Enriching hotels and places" : status === "enriched" ? "Places enriched" : "Calculating road routes";
        await store.updateJob(tripId, { status, stage: currentStage });
      },
      route: services.route,
      saveRouted: async (plan, intelligence, routeResult) => {
        const routedPlan = { ...plan, itinerary: routeResult.itinerary };
        await store.updateTripDetail(tripId, { ...routedPlan, trip_intelligence: buildTripSummary(routedPlan, intelligence, routeResult) });
      },
      complete: async (metrics) => {
        stopHeartbeat();
        const deduped = dedupeTripPlaces({ hotels: tripPlan.hotels, itinerary: tripPlan.itinerary });
        await store.updateJob(tripId, { status: "completed", stage: "Trip ready", placesRequests: metrics.placesRequests, placesCacheHits: metrics.placesCacheHits, routeRequests: metrics.routeRequests, routeCacheHits: metrics.routeCacheHits, providerFailures: metrics.providerFailures });
        console.info("Background trip processing completed", { requestId, userId, tripId, durationMs: Date.now() - startedAt, ...metrics, duplicateHotelsRemoved: deduped.stats.duplicateHotelsRemoved, duplicateActivitiesRemoved: deduped.stats.duplicateActivitiesRemoved });
      },
      fail: async (metrics) => {
        stopHeartbeat();
        await store.updateJob(tripId, { status: "failed", stage: "Trip generation failed", error: "Trip generation failed", placesRequests: metrics.placesRequests, placesCacheHits: metrics.placesCacheHits, routeRequests: metrics.routeRequests, routeCacheHits: metrics.routeCacheHits, providerFailures: metrics.providerFailures });
      },
    },
  });
}
