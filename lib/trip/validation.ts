const MAX_TEXT_LENGTH = 1_000;
const MAX_HOTELS = 12;
const MAX_ITINERARY_DAYS = 30;
const MAX_ACTIVITIES_PER_DAY = 12;

export type TripValidationResult = {
  valid: boolean;
  errors: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_TEXT_LENGTH;
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function hasValidCoordinates(value: unknown) {
  if (!isObject(value)) return false;
  const latitude = value.latitude;
  const longitude = value.longitude;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function hasValidRating(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5;
}

function validateDuration(value: unknown) {
  if (!isSafeText(value)) return null;
  const match = value.match(/\b(\d+(?:\.\d+)?)\b/);
  if (!match) return null;
  const days = Number(match[1]);
  return Number.isFinite(days) && days >= 1 && days <= MAX_ITINERARY_DAYS ? Math.round(days) : null;
}

export function validateTripPlan(value: unknown): TripValidationResult {
  const errors: string[] = [];
  if (!isObject(value)) return { valid: false, errors: ["trip_plan must be an object"] };
  const plan = value;
  for (const key of ["destination", "origin", "duration", "budget", "group_size"]) if (!isSafeText(plan[key])) errors.push(`${key} must be a non-empty string within ${MAX_TEXT_LENGTH} characters`);
  if (!isSafeText(plan.travel_dates)) errors.push("travel_dates must be a non-empty string");
  if (!isValidDateOnly(plan.start_date)) errors.push("start_date must be a valid YYYY-MM-DD date");
  if (!isValidDateOnly(plan.end_date)) errors.push("end_date must be a valid YYYY-MM-DD date");

  let durationDays: number | null = null;
  if (isValidDateOnly(plan.start_date) && isValidDateOnly(plan.end_date)) {
    const start = new Date(`${plan.start_date}T00:00:00Z`).getTime();
    const end = new Date(`${plan.end_date}T00:00:00Z`).getTime();
    if (end < start) errors.push("end_date must be on or after start_date");
    durationDays = validateDuration(plan.duration);
    if (durationDays) {
      const expectedEnd = addDays(plan.start_date, durationDays - 1);
      if (expectedEnd !== plan.end_date) errors.push("start_date, end_date and duration describe different trip lengths");
    }
  }

  const hotels = plan.hotels;
  if (!Array.isArray(hotels) || hotels.length > MAX_HOTELS) errors.push(`hotels must be an array with at most ${MAX_HOTELS} items`);
  else hotels.forEach((hotel, index) => {
    if (!isObject(hotel)) { errors.push(`hotel ${index + 1} must be an object`); return; }
    for (const key of ["hotel_name", "hotel_address", "price_per_night", "hotel_image_url", "description"]) if (!isSafeText(hotel[key])) errors.push(`hotel ${index + 1}: ${key} is invalid`);
    if (!hasValidCoordinates(hotel.geo_coordinates)) errors.push(`hotel ${index + 1}: invalid coordinates`);
    if (!hasValidRating(hotel.rating)) errors.push(`hotel ${index + 1}: rating must be between 0 and 5`);
  });

  const itinerary = plan.itinerary;
  if (!Array.isArray(itinerary) || itinerary.length > MAX_ITINERARY_DAYS) errors.push(`itinerary must be an array with at most ${MAX_ITINERARY_DAYS} days`);
  else {
    if (durationDays && itinerary.length !== durationDays) errors.push(`itinerary must contain exactly ${durationDays} days to match the trip duration`);
    itinerary.forEach((day, index) => {
      const expectedDay = index + 1;
      if (!isObject(day)) { errors.push(`itinerary day ${expectedDay} must be an object`); return; }
      if (day.day !== expectedDay) errors.push(`itinerary day ${expectedDay}: day must be ${expectedDay}`);
      if (!isValidDateOnly(day.date)) errors.push(`itinerary day ${expectedDay}: invalid date`);
      if (isValidDateOnly(plan.start_date) && isValidDateOnly(day.date)) {
        const expectedDate = addDays(plan.start_date, index);
        if (day.date !== expectedDate) errors.push(`itinerary day ${expectedDay}: date must be ${expectedDate}`);
      }
      if (!isSafeText(day.day_plan)) errors.push(`itinerary day ${expectedDay}: day_plan is invalid`);
      if (!isSafeText(day.best_time_to_visit_day)) errors.push(`itinerary day ${expectedDay}: best_time_to_visit_day is invalid`);
      const activities = day.activities;
      if (!Array.isArray(activities) || activities.length > MAX_ACTIVITIES_PER_DAY) { errors.push(`itinerary day ${expectedDay}: activities must contain at most ${MAX_ACTIVITIES_PER_DAY} items`); return; }
      activities.forEach((activity, activityIndex) => {
        if (!isObject(activity)) { errors.push(`day ${expectedDay}, activity ${activityIndex + 1} must be an object`); return; }
        for (const key of ["place_name", "place_details", "place_image_url", "place_address", "ticket_pricing", "time_travel_each_location", "best_time_to_visit"]) if (!isSafeText(activity[key])) errors.push(`day ${expectedDay}, activity ${activityIndex + 1}: ${key} is invalid`);
        if (!hasValidCoordinates(activity.geo_coordinates)) errors.push(`day ${expectedDay}, activity ${activityIndex + 1}: invalid coordinates`);
      });
    });
  }
  return { valid: errors.length === 0, errors };
}
