import assert from "node:assert/strict";
import test from "node:test";

import { dedupeTripPlaces } from "../lib/trip/place-identity.ts";

function getDayActivities(result: ReturnType<typeof dedupeTripPlaces>, index: number) {
  const day = result.itinerary[index];
  if (!day) {
    throw new Error(`expected itinerary day at index ${index}`);
  }
  return day.activities ?? [];
}

test("dedupes activities by canonical Google place_id", () => {
  const result = dedupeTripPlaces({
    hotels: [
      { hotel_name: "Hotel A", hotel_address: "Address A", place_id: "hotel-1" },
      { hotel_name: "Hotel A duplicate", hotel_address: "Address A", place_id: "hotel-1" },
    ],
    itinerary: [
      {
        day: 1,
        date: "2027-04-10",
        activities: [
          { place_name: "Louvre", place_address: "Paris", place_id: "place-1" },
          { place_name: "Louvre copy", place_address: "Paris", place_id: "place-1" },
        ],
      },
      {
        day: 2,
        date: "2027-04-11",
        activities: [
          { place_name: "Louvre again", place_address: "Paris", place_id: "place-1" },
        ],
      },
    ],
  });

  assert.equal(result.hotels.length, 1);
  assert.equal(result.stats.duplicateHotelsRemoved, 1);
  assert.equal(getDayActivities(result, 0).length, 1);
  assert.equal(getDayActivities(result, 1).length, 0);
  assert.equal(result.stats.duplicateActivitiesRemoved, 2);
});

test("falls back to normalized name and address when place_id is absent", () => {
  const result = dedupeTripPlaces({
    hotels: [
      { hotel_name: "  Hotel One ", hotel_address: "  Main Street " },
      { hotel_name: "hotel one", hotel_address: "main street" },
    ],
    itinerary: [
      {
        day: 1,
        date: "2027-04-10",
        activities: [
          { place_name: "Museum", place_address: "Center Road" },
          { place_name: " museum ", place_address: "center road" },
        ],
      },
    ],
  });

  assert.equal(result.hotels.length, 1);
  assert.equal(result.stats.duplicateHotelsRemoved, 1);
  assert.equal(getDayActivities(result, 0).length, 1);
  assert.equal(result.stats.duplicateActivitiesRemoved, 1);
});

test("keeps activities without enough identity data", () => {
  const result = dedupeTripPlaces({
    hotels: [],
    itinerary: [
      {
        day: 1,
        date: "2027-04-10",
        activities: [
          { place_name: "Known place", place_address: "Known address" },
          { place_name: "", place_address: "" },
          { place_name: "Known place", place_address: "Known address" },
        ],
      },
    ],
  });

  assert.equal(getDayActivities(result, 0).length, 2);
  assert.equal(result.stats.duplicateActivitiesRemoved, 1);
});
