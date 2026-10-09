import assert from "node:assert/strict";
import test from "node:test";
import { buildTripIntelligence, processBackgroundTrip, type BackgroundProcessingPersistence, type BackgroundProcessingServices, type BackgroundTripPlan } from "../lib/trip/background-processing.ts";
import type { RouteResult } from "../lib/trip/routing.ts";

const plan: BackgroundTripPlan = {
  destination: "Delhi",
  duration: "1 day",
  origin: "Delhi",
  budget: "medium",
  group_size: "2",
  hotels: [{ hotel_name: "Test Hotel", hotel_address: "Delhi", geo_coordinates: { latitude: 28.6139, longitude: 77.209 } }],
  itinerary: [{ day: 1, date: "2026-09-10", activities: [{ place_name: "Test Place", place_address: "Delhi", geo_coordinates: { latitude: 28.6129, longitude: 77.2295 } }] }],
};

function createServices(routeFailure = false): BackgroundProcessingServices {
  return {
    enrich: async (tripPlan, metrics) => {
      metrics.placesRequests = 2;
      metrics.placesCacheHits = 3;
      return tripPlan;
    },
    optimize: (tripPlan) => buildTripIntelligence(tripPlan),
    route: async (_intelligence, tripPlan, metrics): Promise<RouteResult> => {
      metrics.routeRequests = 1;
      if (routeFailure) {
        metrics.providerFailures += 1;
        throw new Error("route provider failed");
      }
      metrics.routeCacheHits = 1;
      return { itinerary: tripPlan.itinerary, enabled: true, totalDistanceMeters: 1000, totalDurationSeconds: 120, segmentCount: 1, routeRequests: 1, routeCacheHits: 1, providerFailures: 0 };
    },
  };
}

function createPersistence(events: string[], jobs: Array<Record<string, unknown>>, tripSaves: Array<BackgroundTripPlan & { trip_intelligence: Record<string, unknown> }>): BackgroundProcessingPersistence {
  return {
    updateTripDetail: async (_tripId, tripDetail) => {
      events.push("save-enriched-or-routed");
      tripSaves.push(tripDetail);
    },
    updateJob: async (_tripId, payload) => {
      events.push(`job:${payload.status}`);
      jobs.push(payload);
    },
  };
}

const noopConvex = {} as Parameters<typeof processBackgroundTrip>[0]["convex"];

test("processBackgroundTrip executes production orchestration in order", async () => {
  const events: string[] = [];
  const jobs: Array<Record<string, unknown>> = [];
  const tripSaves: Array<BackgroundTripPlan & { trip_intelligence: Record<string, unknown> }> = [];
  const result = await processBackgroundTrip({ convex: noopConvex, tripId: "trip-1", tripPlan: plan, requestId: "req-1", userId: "user-1", services: createServices(), persistence: createPersistence(events, jobs, tripSaves) });

  assert.equal(result.status, "completed");
  assert.deepEqual(events, ["job:enriching", "save-enriched-or-routed", "job:enriched", "job:routing", "save-enriched-or-routed", "job:completed"]);
  assert.equal(jobs.at(-1)?.status, "completed");
  assert.equal(jobs.at(-1)?.placesRequests, 2);
  assert.equal(jobs.at(-1)?.placesCacheHits, 3);
  assert.equal(jobs.at(-1)?.routeRequests, 1);
  assert.equal(jobs.at(-1)?.routeCacheHits, 1);
  assert.equal(jobs.at(-1)?.providerFailures, 0);
  assert.equal(tripSaves.length, 2);
});

test("processBackgroundTrip persists a terminal failure after routing fails", async () => {
  const events: string[] = [];
  const jobs: Array<Record<string, unknown>> = [];
  const tripSaves: Array<BackgroundTripPlan & { trip_intelligence: Record<string, unknown> }> = [];
  const result = await processBackgroundTrip({ convex: noopConvex, tripId: "trip-2", tripPlan: plan, requestId: "req-2", userId: "user-1", services: createServices(true), persistence: createPersistence(events, jobs, tripSaves) });

  assert.equal(result.status, "failed");
  assert.deepEqual(events, ["job:enriching", "save-enriched-or-routed", "job:enriched", "job:routing", "job:failed"]);
  assert.equal(jobs.at(-1)?.status, "failed");
  assert.equal(jobs.at(-1)?.placesRequests, 2);
  assert.equal(jobs.at(-1)?.placesCacheHits, 3);
  assert.equal(jobs.at(-1)?.routeRequests, 1);
  assert.equal(jobs.at(-1)?.routeCacheHits, 0);
  assert.equal(jobs.at(-1)?.providerFailures, 2);
  assert.equal(tripSaves.length, 1);
});

test("background trip fixtures contain the production processing shape", () => {
  const [day] = plan.itinerary;
  const activities = day?.activities ?? [];
  const [activity] = activities;

  assert.equal(plan.hotels.length, 1);
  assert.equal(plan.itinerary.length, 1);
  assert.equal(activities.length, 1);
  assert.equal(typeof plan.hotels[0]?.hotel_name, "string");
  assert.equal(typeof activity?.place_name, "string");
});
