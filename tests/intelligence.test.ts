import assert from "node:assert/strict";
import test from "node:test";

import { optimizeTripIntelligence } from "../lib/trip/intelligence.ts";

function activity(name: string, latitude: number, longitude: number, placeVerified = true) {
  return {
    place_name: name,
    place_address: "Delhi",
    geo_coordinates: { latitude, longitude },
    place_verified: placeVerified,
  };
}

test("does not reorder activities using unverified AI coordinates", () => {
  const result = optimizeTripIntelligence({
    tripPlan: {
      duration: "1 day",
      group_size: "2",
      budget: "medium",
      hotels: [
        {
          hotel_name: "AI Hotel",
          geo_coordinates: { latitude: 28.6139, longitude: 77.209 },
          place_verified: false,
        },
      ],
      itinerary: [
        {
          day: 1,
          activities: [
            activity("Far", 28.70, 77.30, false),
            activity("Near", 28.60, 77.20, false),
            activity("Middle", 28.65, 77.25, false),
          ],
        },
      ],
    },
  });

  assert.deepEqual(
    result.itinerary[0]?.activities?.map((item) => item.place_name),
    ["Far", "Near", "Middle"],
  );
  assert.equal(result.itinerary[0]?.route_optimized, undefined);
});

test("allows optimization when all activity coordinates are verified", () => {
  const result = optimizeTripIntelligence({
    tripPlan: {
      duration: "1 day",
      group_size: "2",
      budget: "medium",
      hotels: [
        {
          hotel_name: "Verified Hotel",
          geo_coordinates: { latitude: 28.6139, longitude: 77.209 },
          place_verified: true,
        },
      ],
      itinerary: [
        {
          day: 1,
          activities: [
            activity("Far", 28.70, 77.30),
            activity("Near", 28.60, 77.20),
            activity("Middle", 28.65, 77.25),
          ],
        },
      ],
    },
  });

  assert.equal(result.itinerary[0]?.route_optimized, true);
  assert.deepEqual(
    result.itinerary[0]?.activities?.map((item) => item.place_name),
    ["Near", "Middle", "Far"],
  );
});
