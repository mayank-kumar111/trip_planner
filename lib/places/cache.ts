import { searchGooglePlace, type GooglePlaceMatch } from "@/lib/places/google";

export type PlaceLookupInput = {
  name: string;
  address?: string;
};

type Place = GooglePlaceMatch | null;
type CacheEntry = { promise: Promise<Place>; expiresAt: number };

const PLACE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PLACE_CACHE_ENTRIES = 500;
const MAX_CONCURRENT_PLACE_LOOKUPS = 3;

const placeCache = new Map<string, CacheEntry>();
let activeLookups = 0;
const waitQueue: Array<() => void> = [];

export type PlaceLookupStats = {
  cacheHit: boolean;
  providerRequest: boolean;
};

export function normalizePlaceQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLookupInput(input: string | PlaceLookupInput) {
  if (typeof input === "string") {
    return { name: normalizePlaceQuery(input) };
  }

  return {
    name: normalizePlaceQuery(input.name),
    address: normalizePlaceQuery(input.address ?? ""),
  };
}

function getCacheKey(input: string | PlaceLookupInput) {
  const normalized = normalizeLookupInput(input);
  return JSON.stringify(normalized);
}

function prunePlaceCache(now = Date.now()) {
  for (const [key, entry] of placeCache) {
    if (entry.expiresAt <= now) placeCache.delete(key);
  }

  while (placeCache.size > MAX_PLACE_CACHE_ENTRIES) {
    const oldestKey = placeCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    placeCache.delete(oldestKey);
  }
}

async function acquireLookupSlot() {
  if (activeLookups < MAX_CONCURRENT_PLACE_LOOKUPS) {
    activeLookups += 1;
    return;
  }

  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeLookups += 1;
}

function releaseLookupSlot() {
  activeLookups = Math.max(0, activeLookups - 1);
  waitQueue.shift()?.();
}

export async function lookupGooglePlaceWithStats(
  input: string | PlaceLookupInput,
): Promise<{ place: Place; stats: PlaceLookupStats }> {
  const key = getCacheKey(input);
  const normalizedInput = normalizeLookupInput(input);
  if (!normalizedInput.name) {
    return { place: null, stats: { cacheHit: false, providerRequest: false } };
  }

  prunePlaceCache();

  const cached = placeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { place: await cached.promise, stats: { cacheHit: true, providerRequest: false } };
  }
  if (cached) placeCache.delete(key);

  const searchInput =
    typeof input === "string"
      ? input
      : {
          name: input.name,
          address: input.address,
        };

  const promise = (async () => {
    await acquireLookupSlot();
    try {
      return await searchGooglePlace(searchInput);
    } finally {
      releaseLookupSlot();
    }
  })();

  placeCache.set(key, {
    promise,
    expiresAt: Date.now() + PLACE_CACHE_TTL_MS,
  });

  void promise.catch(() => {
    const current = placeCache.get(key);
    if (current?.promise === promise) placeCache.delete(key);
  });

  return { place: await promise, stats: { cacheHit: false, providerRequest: true } };
}

export async function lookupGooglePlace(
  input: string | PlaceLookupInput,
): Promise<Place> {
  const result = await lookupGooglePlaceWithStats(input);
  return result.place;
}
