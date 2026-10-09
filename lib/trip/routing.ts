import { computeDrivingRouteSequence, formatRouteDistance, formatRouteDuration } from "@/lib/maps/routes";
import type { Coordinates, TripActivity, TripDay, TripHotel } from "@/lib/trip/intelligence";

type DayRouteResult = {
  day: TripDay;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  segmentCount: number;
  routeRequests: number;
  routeCacheHits: number;
  providerFailures: number;
};

export type RouteResult = {
  itinerary: TripDay[];
  enabled: boolean;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  segmentCount: number;
  routeRequests: number;
  routeCacheHits: number;
  providerFailures: number;
};

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const point = value as Record<string, unknown>;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function isVerifiedPlace(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).place_verified === true,
  );
}

export function hasVerifiedRoutingCoordinates(value: unknown): value is { geo_coordinates: Coordinates } {
  if (!isVerifiedPlace(value)) return false;
  return isCoordinates((value as Record<string, unknown>).geo_coordinates);
}

export function buildRoutePoints(activities: TripActivity[], hotel?: TripHotel) {
  const points: Coordinates[] = [];

  if (hotel && hasVerifiedRoutingCoordinates(hotel)) {
    points.push(hotel.geo_coordinates);
  }

  for (const activity of activities) {
    if (hasVerifiedRoutingCoordinates(activity)) {
      points.push(activity.geo_coordinates);
    }
  }

  return points;
}

export async function addRoadRoutes(
  itinerary: TripDay[],
  hotel?: TripHotel,
): Promise<RouteResult> {
  if (!process.env.GOOGLE_ROUTES_API_KEY?.trim()) {
    return {
      itinerary,
      enabled: false,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      segmentCount: 0,
      routeRequests: 0,
      routeCacheHits: 0,
      providerFailures: 0,
    };
  }

  const routedDays = await Promise.all(
    itinerary.map(async (day): Promise<DayRouteResult> => {
      const activities = Array.isArray(day.activities) ? day.activities : [];
      const points = buildRoutePoints(activities, hotel);
      const routedActivities = [...activities];
      const routeSegments: Array<Record<string, unknown>> = [];

      if (points.length < 2) {
        return {
          day: {
            ...day,
            activities: routedActivities,
            route_segments: routeSegments,
            route_data_source: "unavailable",
          },
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          segmentCount: 0,
          routeRequests: 0,
          routeCacheHits: 0,
          providerFailures: 0,
        };
      }

      try {
        const routeResult = await computeDrivingRouteSequence(points);

        if (!routeResult) {
          return {
            day: {
              ...day,
              activities: routedActivities,
              route_segments: routeSegments,
              route_data_source: "unavailable",
            },
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            segmentCount: 0,
            routeRequests: 1,
            routeCacheHits: 0,
            providerFailures: 0,
          };
        }

        const segments = routeResult.segments ?? [];
        let previous: Coordinates | undefined =
          hotel && hasVerifiedRoutingCoordinates(hotel)
            ? hotel.geo_coordinates
            : undefined;
        let segmentIndex = 0;
        let totalDistanceMeters = 0;
        let totalDurationSeconds = 0;

        for (let activityIndex = 0; activityIndex < routedActivities.length; activityIndex += 1) {
          const activity = routedActivities[activityIndex];
          if (!hasVerifiedRoutingCoordinates(activity)) continue;

          const current = activity.geo_coordinates;

          if (previous && segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            const distance = formatRouteDistance(segment.distanceMeters);
            const duration = formatRouteDuration(segment.durationSeconds);

            totalDistanceMeters += segment.distanceMeters;
            totalDurationSeconds += segment.durationSeconds;

            routeSegments.push({
              from: previous,
              to: current,
              distance_meters: segment.distanceMeters,
              distance,
              duration_seconds: segment.durationSeconds,
              duration,
              encoded_polyline: segment.encodedPolyline ?? null,
            });

            routedActivities[activityIndex] = {
              ...activity,
              road_distance: distance,
              road_distance_meters: segment.distanceMeters,
              road_travel_time: duration,
              road_travel_time_seconds: segment.durationSeconds,
              route_data_source: "Google Routes API",
            };

            segmentIndex += 1;
          }

          previous = current;
        }

        return {
          day: {
            ...day,
            activities: routedActivities,
            route_segments: routeSegments,
            route_data_source: routeSegments.length ? "Google Routes API" : "unavailable",
          },
          totalDistanceMeters,
          totalDurationSeconds,
          segmentCount: routeSegments.length,
          routeRequests: routeResult.providerRequest ? 1 : 0,
          routeCacheHits: routeResult.cacheHit ? 1 : 0,
          providerFailures: 0,
        };
      } catch (error) {
        console.warn("Google Routes sequence lookup skipped:", error);

        return {
          day: {
            ...day,
            activities: routedActivities,
            route_segments: routeSegments,
            route_data_source: "unavailable",
          },
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          segmentCount: 0,
          routeRequests: 1,
          routeCacheHits: 0,
          providerFailures: 1,
        };
      }
    }),
  );

  const totals = routedDays.reduce(
    (accumulator, result) => ({
      totalDistanceMeters: accumulator.totalDistanceMeters + result.totalDistanceMeters,
      totalDurationSeconds: accumulator.totalDurationSeconds + result.totalDurationSeconds,
      segmentCount: accumulator.segmentCount + result.segmentCount,
      routeRequests: accumulator.routeRequests + result.routeRequests,
      routeCacheHits: accumulator.routeCacheHits + result.routeCacheHits,
      providerFailures: accumulator.providerFailures + result.providerFailures,
    }),
    {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      segmentCount: 0,
      routeRequests: 0,
      routeCacheHits: 0,
      providerFailures: 0,
    },
  );

  return {
    itinerary: routedDays.map((result) => result.day),
    enabled: totals.segmentCount > 0,
    ...totals,
  };
}
