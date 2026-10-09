import assert from "node:assert/strict";
import test from "node:test";

import { validateTripPlan } from "../lib/trip/validation.ts";

function buildValidTripPlan() {
  return {
    destination: "Paris",
    origin: "Delhi",
    duration: "3 days",
    budget: "150000 INR",
    group_size: "2 adults",
    travel_dates: "2027-04-10 to 2027-04-12",
    start_date: "2027-04-10",
    end_date: "2027-04-12",
    hotels: [
      {
        hotel_name: "Example Hotel",
        hotel_address: "1 Example Street",
        price_per_night: "10000 INR",
        hotel_image_url: "https://example.com/hotel.jpg",
        description: "Central hotel",
        geo_coordinates: { latitude: 48.8566, longitude: 2.3522 },
        rating: 4.5,
      },
    ],
    itinerary: [1, 2, 3].map((dayNumber) => ({
      day: dayNumber,
      date: `2027-04-${String(9 + dayNumber).padStart(2, "0")}`,
      day_plan: `Day ${dayNumber} plan`,
      best_time_to_visit_day: "Morning",
      activities: [
        {
          place_name: `Place ${dayNumber}`,
          place_details: "Interesting place",
          place_image_url: "https://example.com/place.jpg",
          place_address: "Example address",
          ticket_pricing: "Free",
          time_travel_each_location: "20 minutes",
          best_time_to_visit: "Morning",
          geo_coordinates: { latitude: 48.85, longitude: 2.35 },
        },
      ],
    })),
  };
}

test("accepts a valid trip plan", () => {
  const result = validateTripPlan(buildValidTripPlan());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects inconsistent duration and dates", () => {
  const plan = buildValidTripPlan();
  plan.duration = "4 days";

  const result = validateTripPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("start_date, end_date and duration describe different trip lengths"));
});

test("rejects non-consecutive itinerary dates", () => {
  const plan = buildValidTripPlan();
  plan.itinerary[1].date = "2027-04-13";

  const result = validateTripPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("itinerary day 2: date must be 2027-04-11"));
});

test("rejects invalid coordinates and ratings", () => {
  const plan = buildValidTripPlan();
  plan.hotels[0].geo_coordinates = { latitude: 95, longitude: 2.3522 };
  plan.hotels[0].rating = 5.5;

  const result = validateTripPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("hotel 1: invalid coordinates"));
  assert.ok(result.errors.includes("hotel 1: rating must be between 0 and 5"));
});

test("rejects too many activities in one day", () => {
  const plan = buildValidTripPlan();
  plan.itinerary[0].activities = Array.from({ length: 13 }, (_, index) => ({
    place_name: `Place ${index + 1}`,
    place_details: "Interesting place",
    place_image_url: "https://example.com/place.jpg",
    place_address: "Example address",
    ticket_pricing: "Free",
    time_travel_each_location: "20 minutes",
    best_time_to_visit: "Morning",
    geo_coordinates: { latitude: 48.85, longitude: 2.35 },
  }));

  const result = validateTripPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("itinerary day 1: activities must contain at most 12 items"));
});
