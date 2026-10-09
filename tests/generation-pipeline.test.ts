import assert from "node:assert/strict";
import test from "node:test";

import { runGenerationPipeline } from "../lib/trip/generation-pipeline.ts";

function createHooks(options?: { failAt?: "enrich" | "saveEnriched" | "route" | "saveRouted" }) {
  const events: string[] = [];

  const hooks = {
    setStage: async (status: "enriching" | "enriched" | "routing") => {
      events.push(status);
    },
    enrich: async (plan: string, metrics: { placesRequests: number; placesCacheHits: number; routeRequests: number; routeCacheHits: number; providerFailures: number }) => {
      events.push("enrich");
      if (options?.failAt === "enrich") throw new Error("places provider failed");
      metrics.placesRequests += 2;
      metrics.placesCacheHits += 1;
      return `${plan}-enriched`;
    },
    optimize: (plan: string) => {
      events.push("optimize");
      return `${plan}-optimized`;
    },
    saveEnriched: async () => {
      events.push("saveEnriched");
      if (options?.failAt === "saveEnriched") throw new Error("save failed");
    },
    route: async (_intelligence: string, _plan: string, metrics: { placesRequests: number; placesCacheHits: number; routeRequests: number; routeCacheHits: number; providerFailures: number }) => {
      events.push("route");
      if (options?.failAt === "route") throw new Error("routes provider failed");
      metrics.routeRequests += 1;
      metrics.routeCacheHits += 1;
      return { routed: true };
    },
    saveRouted: async () => {
      events.push("saveRouted");
      if (options?.failAt === "saveRouted") throw new Error("route save failed");
    },
    complete: async () => {
      events.push("completed");
    },
    fail: async () => {
      events.push("failed");
    },
  };

  return { hooks, events };
}

test("runs the full generation pipeline in order and preserves metrics", async () => {
  const { hooks, events } = createHooks();
  const result = await runGenerationPipeline({ plan: "trip", hooks });

  assert.equal(result.status, "completed");
  assert.deepEqual(events, [
    "enriching",
    "enrich",
    "optimize",
    "saveEnriched",
    "enriched",
    "routing",
    "route",
    "saveRouted",
    "completed",
  ]);
  assert.deepEqual(result.metrics, {
    placesRequests: 2,
    placesCacheHits: 1,
    routeRequests: 1,
    routeCacheHits: 1,
    providerFailures: 0,
  });
});

test("records a terminal failure when enrichment fails", async () => {
  const { hooks, events } = createHooks({ failAt: "enrich" });
  const result = await runGenerationPipeline({ plan: "trip", hooks });

  assert.equal(result.status, "failed");
  assert.deepEqual(events, ["enriching", "enrich", "failed"]);
  assert.equal(result.metrics.providerFailures, 1);
});

test("records a terminal failure when routing fails after enrichment is saved", async () => {
  const { hooks, events } = createHooks({ failAt: "route" });
  const result = await runGenerationPipeline({ plan: "trip", hooks });

  assert.equal(result.status, "failed");
  assert.deepEqual(events, [
    "enriching",
    "enrich",
    "optimize",
    "saveEnriched",
    "enriched",
    "routing",
    "route",
    "failed",
  ]);
  assert.equal(result.metrics.placesRequests, 2);
  assert.equal(result.metrics.providerFailures, 1);
});
