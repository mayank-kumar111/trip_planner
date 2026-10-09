import assert from "node:assert/strict";
import test from "node:test";

import {
  selectBestPlaceCandidate,
  type PlaceSearchCandidate,
} from "../lib/places/matching.ts";

function candidate(
  displayName: string,
  formattedAddress: string,
): PlaceSearchCandidate {
  return {
    placeId: displayName,
    displayName,
    formattedAddress,
    latitude: null,
    longitude: null,
    rating: null,
    photoName: null,
  };
}

test("does not blindly select the first Google result", () => {
  const result = selectBestPlaceCandidate(
    {
      name: "City Palace",
      address: "Udaipur, Rajasthan",
    },
    [
      candidate("City Palace", "Jaipur, Rajasthan"),
      candidate("City Palace", "Udaipur, Rajasthan"),
    ],
  );

  assert.equal(result?.formattedAddress, "Udaipur, Rajasthan");
});

test("rejects an unrelated result", () => {
  const result = selectBestPlaceCandidate(
    {
      name: "Amber Fort",
      address: "Jaipur, Rajasthan",
    },
    [candidate("Hawa Mahal", "Jaipur, Rajasthan")],
  );

  assert.equal(result, null);
});

test("accepts case and punctuation differences", () => {
  const result = selectBestPlaceCandidate(
    {
      name: "Taj-Mahal Palace",
      address: "Mumbai",
    },
    [candidate("Taj Mahal Palace", "Mumbai")],
  );

  assert.equal(result?.displayName, "Taj Mahal Palace");
});

test("can match by exact name when no address is supplied", () => {
  const result = selectBestPlaceCandidate(
    { name: "Louvre Museum" },
    [candidate("Louvre Museum", "Paris, France")],
  );

  assert.equal(result?.displayName, "Louvre Museum");
});

test("rejects ambiguous near-ties instead of inventing confidence", () => {
  const result = selectBestPlaceCandidate(
    { name: "Royal Palace", address: "Delhi" },
    [
      { ...candidate("Royal Palace", "Delhi"), placeId: "royal-palace-1" },
      { ...candidate("Royal Palace", "Delhi"), placeId: "royal-palace-2" },
    ],
  );

  assert.equal(result, null);
});

test("rejects an exact-name match in the wrong location", () => {
  const result = selectBestPlaceCandidate(
    {
      name: "City Palace",
      address: "Udaipur, Rajasthan",
    },
    [candidate("City Palace", "Jaipur, Rajasthan")],
  );

  assert.equal(result, null);
});
