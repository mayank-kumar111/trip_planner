import type { TripActivity, TripDay, TripHotel } from "@/lib/trip/intelligence";

export type PlaceIdentityStats = {
  duplicateHotelsRemoved: number;
  duplicateActivitiesRemoved: number;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function getHotelIdentity(hotel: TripHotel) {
  const placeId = normalizeText(hotel.place_id);
  if (placeId) return `place:${placeId}`;

  const name = normalizeText(hotel.hotel_name);
  const address = normalizeText(hotel.hotel_address);
  return name && address ? `text:${name}|${address}` : null;
}

function getActivityIdentity(activity: TripActivity) {
  const placeId = normalizeText(activity.place_id);
  if (placeId) return `place:${placeId}`;

  const name = normalizeText(activity.place_name);
  const address = normalizeText(activity.place_address);
  return name && address ? `text:${name}|${address}` : null;
}

export function dedupeTripPlaces({
  hotels,
  itinerary,
}: {
  hotels: TripHotel[];
  itinerary: TripDay[];
}): {
  hotels: TripHotel[];
  itinerary: TripDay[];
  stats: PlaceIdentityStats;
} {
  const seenHotelIds = new Set<string>();
  const seenActivityIds = new Set<string>();
  let duplicateHotelsRemoved = 0;
  let duplicateActivitiesRemoved = 0;

  const uniqueHotels = hotels.filter((hotel) => {
    const identity = getHotelIdentity(hotel);
    if (!identity) return true;
    if (seenHotelIds.has(identity)) {
      duplicateHotelsRemoved += 1;
      return false;
    }
    seenHotelIds.add(identity);
    return true;
  });

  const uniqueItinerary = itinerary.map((day) => {
    const activities = Array.isArray(day.activities) ? day.activities : [];
    const uniqueActivities = activities.filter((activity) => {
      const identity = getActivityIdentity(activity);
      if (!identity) return true;
      if (seenActivityIds.has(identity)) {
        duplicateActivitiesRemoved += 1;
        return false;
      }
      seenActivityIds.add(identity);
      return true;
    });

    return uniqueActivities.length === activities.length
      ? day
      : { ...day, activities: uniqueActivities };
  });

  return {
    hotels: uniqueHotels,
    itinerary: uniqueItinerary,
    stats: {
      duplicateHotelsRemoved,
      duplicateActivitiesRemoved,
    },
  };
}
