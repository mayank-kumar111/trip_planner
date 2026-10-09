export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TripHotel = {
  hotel_name?: string;
  price_per_night?: string;
  geo_coordinates?: Coordinates;
  [key: string]: unknown;
};

export type TripActivity = {
  place_name?: string;
  place_address?: string;
  ticket_pricing?: string;
  time_travel_each_location?: string;
  geo_coordinates?: Coordinates;
  [key: string]: unknown;
};

export type TripDay = {
  day?: number;
  day_plan?: string;
  best_time_to_visit_day?: string;
  activities?: TripActivity[];
  [key: string]: unknown;
};

export type TripIntelligenceResult = {
  summary: {
    estimated_hotel_min: number;
    estimated_hotel_max: number;
    estimated_food: number;
    estimated_local_transport: number;
    estimated_activities_min: number;
    estimated_activities_max: number;
    estimated_total_min: number;
    estimated_total_max: number;
    estimated_per_person_min: number;
    estimated_per_person_max: number;
    currency: "INR";
    budget_level: string;
    budget_status: "within" | "near_limit" | "above" | "unknown";
  };
  itinerary: TripDay[];
  optimization: {
    strategy: "distance_greedy";
    note: string;
  };
};

function parseRange(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { min: value, max: value };
  }

  if (typeof value !== "string") return null;

  const normalized = value.replace(/,/g, "");
  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  if (!numbers.length) return null;
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };

  return {
    min: Math.min(numbers[0], numbers[1]),
    max: Math.max(numbers[0], numbers[1]),
  };
}

function parseDays(duration: unknown) {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return Math.max(1, Math.round(duration));
  }

  const match = String(duration ?? "").match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

function parseGroupSize(groupSize: unknown) {
  const value = String(groupSize ?? "").toLowerCase();
  const range = value.match(/(\d+)\s*[-to]+\s*(\d+)/);

  if (range) {
    return Math.max(1, Math.round((Number(range[1]) + Number(range[2])) / 2));
  }

  const one = value.match(/\d+/);
  if (one) return Math.max(1, Number(one[0]));
  if (value.includes("solo") || value.includes("1 person")) return 1;
  if (value.includes("couple")) return 2;
  if (value.includes("family")) return 4;
  if (value.includes("friends")) return 4;
  return 1;
}

function budgetPerPersonPerDay(level: unknown) {
  const value = String(level ?? "").toLowerCase();
  if (value.includes("low") || value.includes("cheap")) return 1500;
  if (value.includes("high") || value.includes("luxury")) return 6500;
  if (value.includes("medium") || value.includes("moderate")) return 3000;
  return null;
}

function haversineKm(a?: Coordinates, b?: Coordinates) {
  if (!a || !b) return null;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function hasVerifiedCoordinates(value: unknown): value is { geo_coordinates: Coordinates; place_verified: true } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const coordinates = record.geo_coordinates;
  if (record.place_verified !== true || !coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) {
    return false;
  }
  const point = coordinates as Record<string, unknown>;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function optimizeDayActivities(day: TripDay, start?: Coordinates): TripDay {
  const activities = Array.isArray(day.activities) ? day.activities : [];
  if (activities.length < 3) return day;

  if (!activities.every(hasVerifiedCoordinates)) return day;

  const remaining = activities.map((activity, index) => ({ activity, index }));
  const ordered: typeof remaining = [];
  let current = start;

  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    if (!current) {
      bestIndex = 0;
    } else {
      remaining.forEach((candidate, index) => {
        const distance = haversineKm(current, candidate.activity.geo_coordinates);
        if (distance !== null && distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
    }

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next.activity.geo_coordinates;
  }

  const reordered = ordered.map(({ activity }) => activity);
  const changed = reordered.some((activity, index) => activity !== activities[index]);

  return changed
    ? {
        ...day,
        activities: reordered,
        route_optimized: true,
      }
    : day;
}

export function optimizeTripIntelligence({
  tripPlan,
}: {
  tripPlan: {
    duration?: string;
    group_size?: string;
    budget?: string;
    hotels?: TripHotel[];
    itinerary?: TripDay[];
  };
}): TripIntelligenceResult {
  const days = parseDays(tripPlan.duration);
  const groupSize = parseGroupSize(tripPlan.group_size);
  const budgetLevel = String(tripPlan.budget ?? "Unknown");

  const hotelRanges = (tripPlan.hotels ?? [])
    .map((hotel) => parseRange(hotel.price_per_night))
    .filter((range): range is { min: number; max: number } => Boolean(range));

  const selectedHotel = hotelRanges[0];
  const hotelMin = selectedHotel ? selectedHotel.min * Math.max(1, days - 1) : 0;
  const hotelMax = selectedHotel ? selectedHotel.max * Math.max(1, days - 1) : 0;

  const activities = (tripPlan.itinerary ?? []).flatMap((day) => day.activities ?? []);
  const activityRanges = activities
    .map((activity) => parseRange(activity.ticket_pricing))
    .filter((range): range is { min: number; max: number } => Boolean(range));

  const activityMin = activityRanges.reduce((total, range) => total + range.min * groupSize, 0);
  const activityMax = activityRanges.reduce((total, range) => total + range.max * groupSize, 0);

  const basePerPersonPerDay = budgetPerPersonPerDay(budgetLevel);
  const estimatedDailyNonHotel = basePerPersonPerDay ?? 0;
  const estimatedFood = estimatedDailyNonHotel * days * groupSize * 0.55;
  const estimatedTransport = estimatedDailyNonHotel * days * groupSize * 0.25;
  const totalMin = hotelMin + activityMin + estimatedFood + estimatedTransport;
  const totalMax = hotelMax + activityMax + estimatedFood + estimatedTransport;
  const perPersonMin = totalMin / groupSize;
  const perPersonMax = totalMax / groupSize;

  let budgetStatus: "within" | "near_limit" | "above" | "unknown" = "unknown";
  if (basePerPersonPerDay) {
    const targetTotal = basePerPersonPerDay * days * groupSize;
    const ratio = totalMax / Math.max(1, targetTotal);
    budgetStatus = ratio <= 1 ? "within" : ratio <= 1.2 ? "near_limit" : "above";
  }

  const firstHotel = tripPlan.hotels?.[0];
  const firstHotelCoordinates = firstHotel?.place_verified === true ? firstHotel.geo_coordinates : undefined;
  const optimizedItinerary = (tripPlan.itinerary ?? []).map((day) =>
    optimizeDayActivities(day, firstHotelCoordinates),
  );

  return {
    summary: {
      estimated_hotel_min: Math.round(hotelMin),
      estimated_hotel_max: Math.round(hotelMax),
      estimated_food: Math.round(estimatedFood),
      estimated_local_transport: Math.round(estimatedTransport),
      estimated_activities_min: Math.round(activityMin),
      estimated_activities_max: Math.round(activityMax),
      estimated_total_min: Math.round(totalMin),
      estimated_total_max: Math.round(totalMax),
      estimated_per_person_min: Math.round(perPersonMin),
      estimated_per_person_max: Math.round(perPersonMax),
      currency: "INR",
      budget_level: budgetLevel,
      budget_status: budgetStatus,
    },
    itinerary: optimizedItinerary,
    optimization: {
      strategy: "distance_greedy",
      note: "Activities are ordered using straight-line geographic distance. Road routing is not claimed until a routing provider is integrated.",
    },
  };
}
