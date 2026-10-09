import axios from "axios";

import {
  selectBestPlaceCandidate,
  type PlaceSearchInput,
  type PlaceSearchCandidate,
} from "./matching";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_FORBIDDEN_TTL_MS = 10 * 60 * 1000;
let googlePlacesForbiddenUntil = 0;
let googlePlacesForbiddenLogged = false;

export type GooglePlaceMatch = PlaceSearchCandidate;

function getApiKey() {
  const apiKey = process.env.GOOGLE_PLACE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACE_API_KEY is not configured");
  }
  return apiKey;
}

function normalizeSearchInput(input: string | PlaceSearchInput): PlaceSearchInput {
  if (typeof input === "string") {
    const name = input.trim();
    return { name };
  }

  return {
    name: input.name.trim(),
    address: input.address?.trim() || undefined,
  };
}

function buildTextQuery(input: PlaceSearchInput) {
  return [input.name, input.address].filter(Boolean).join(", ");
}

function mapPlace(place: Record<string, unknown>): GooglePlaceMatch {
  const displayName = place.displayName as { text?: unknown } | undefined;
  const location = place.location as { latitude?: unknown; longitude?: unknown } | undefined;
  const photos = Array.isArray(place.photos) ? place.photos : [];

  return {
    placeId: typeof place.id === "string" ? place.id : null,
    displayName: typeof displayName?.text === "string" ? displayName.text : null,
    formattedAddress: typeof place.formattedAddress === "string" ? place.formattedAddress : null,
    latitude: typeof location?.latitude === "number" ? location.latitude : null,
    longitude: typeof location?.longitude === "number" ? location.longitude : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    photoName:
      photos[0] &&
      typeof photos[0] === "object" &&
      typeof (photos[0] as { name?: unknown }).name === "string"
        ? (photos[0] as { name: string }).name
        : null,
  };
}

export async function searchGooglePlace(
  searchInput: string | PlaceSearchInput,
): Promise<GooglePlaceMatch | null> {
  const input = normalizeSearchInput(searchInput);
  if (!input.name) return null;

  const query = buildTextQuery(input);
  if (googlePlacesForbiddenUntil > Date.now()) return null;
  const apiKey = getApiKey();

  let response;
  try {
    response = await axios.post(
      GOOGLE_PLACES_URL,
      { textQuery: query, pageSize: 5 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos",
        },
        timeout: 10000,
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? null;
      const providerMessage =
        typeof error.response?.data === "object" && error.response?.data
          ? ((error.response.data as { error?: { message?: unknown } }).error?.message ?? null)
          : null;

      if (status === 403) {
        googlePlacesForbiddenUntil = Date.now() + GOOGLE_PLACES_FORBIDDEN_TTL_MS;
        if (!googlePlacesForbiddenLogged) {
          googlePlacesForbiddenLogged = true;
          console.warn("Google Places is unavailable; using AI estimates for this process", {
            status,
            message: providerMessage ?? error.message,
          });
        }
        return null;
      }

      console.warn("Google Places request failed; using AI fallback", {
        status,
        code: error.code ?? null,
        message: providerMessage ?? error.message,
      });
    } else {
      console.warn("Google Places request failed; using AI fallback", {
        status: null,
        code: null,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }

  const places = Array.isArray(response.data?.places) ? response.data.places : [];
  const candidates = places.map((place: Record<string, unknown>) => mapPlace(place));
  return selectBestPlaceCandidate(input, candidates);
}

export function googlePhotoProxyUrl(photoName: string | null) {
  return photoName
    ? `/api/google-place-photo?name=${encodeURIComponent(photoName)}`
    : null;
}
