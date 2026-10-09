import assert from "node:assert/strict";
import test from "node:test";

import { buildRoutePoints, hasVerifiedRoutingCoordinates } from "../lib/trip/routing.ts";

test("routing accepts only verified hotel and activity coordinates", () => {
  const hotel = {
    hotel_name: "Verified Hotel",
    geo_coordinates: { latitude: 26.9124, longitude: 75.7873 },
    place_verified: true,
  };

  const activities = [
    {
      place_name: "Verified Activity",
      geo_coordinates: { latitude: 26.9855, longitude: 75.8513 },
      place_verified: true,
    },
    {
      place_name: "AI Estimate",
      geo_coordinates: { latitude: 28.6139, longitude: 77.209 },
      place_verified: false,
    },
    {
      place_name: "Missing Verification",
      geo_coordinates: { latitude: 26.9, longitude: 75.8 },
    },
  ];

  assert.equal(hasVerifiedRoutingCoordinates(hotel), true);
  assert.equal(hasVerifiedRoutingCoordinates(activities[0]), true);
  assert.equal(hasVerifiedRoutingCoordinates(activities[1]), false);
  assert.equal(hasVerifiedRoutingCoordinates(activities[2]), false);

  assert.deepEqual(buildRoutePoints(activities, hotel), [
    { latitude: 26.9124, longitude: 75.7873 },
    { latitude: 26.9855, longitude: 75.8513 },
  ]);
});

test("routing does not use fallback coordinates when the hotel is unverified", () => {
  const hotel = {
    hotel_name: "AI Hotel",
    geo_coordinates: { latitude: 28.6139, longitude: 77.209 },
    place_verified: false,
  };

  const activities = [
    {
      place_name: "Verified Activity",
      geo_coordinates: { latitude: 26.9855, longitude: 75.8513 },
      place_verified: true,
    },
  ];

  assert.deepEqual(buildRoutePoints(activities, hotel), [
    { latitude: 26.9855, longitude: 75.8513 },
  ]);
});
