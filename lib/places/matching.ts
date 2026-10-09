export type PlaceSearchCandidate = {
  placeId: string | null;
  displayName: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  photoName: string | null;
};

export type PlaceSearchInput = {
  name: string;
  address?: string;
};

function normalizePlaceText(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
    : "";
}

function tokenize(value: string) {
  return normalizePlaceText(value)
    .split(" ")
    .filter(Boolean);
}

function tokenOverlap(expected: string, candidate: string) {
  const expectedTokens = new Set(tokenize(expected));
  const candidateTokens = new Set(tokenize(candidate));
  if (!expectedTokens.size || !candidateTokens.size) return 0;

  let intersection = 0;
  for (const token of expectedTokens) {
    if (candidateTokens.has(token)) intersection += 1;
  }

  return intersection / Math.max(expectedTokens.size, candidateTokens.size);
}

function addressTokenOverlap(expected: string, candidate: string) {
  const expectedTokens = new Set(tokenize(expected));
  const candidateTokens = new Set(tokenize(candidate));
  if (!expectedTokens.size || !candidateTokens.size) return 0;

  let intersection = 0;
  for (const token of expectedTokens) {
    if (candidateTokens.has(token)) intersection += 1;
  }

  return intersection / Math.max(expectedTokens.size, candidateTokens.size);
}

function characterDiceSimilarity(expected: string, candidate: string) {
  const a = normalizePlaceText(expected);
  const b = normalizePlaceText(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const grams = (value: string) => {
    const set = new Set<string>();
    for (let index = 0; index < value.length - 1; index += 1) {
      set.add(value.slice(index, index + 2));
    }
    return set;
  };

  const left = grams(a);
  const right = grams(b);
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  for (const gram of left) {
    if (right.has(gram)) intersection += 1;
  }

  return (2 * intersection) / (left.size + right.size);
}

function textScore(expected: string, candidate: string) {
  const normalizedExpected = normalizePlaceText(expected);
  const normalizedCandidate = normalizePlaceText(candidate);
  if (!normalizedExpected || !normalizedCandidate) return 0;
  if (normalizedExpected === normalizedCandidate) return 1;

  const containment =
    normalizedExpected.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedExpected);

  const overlap = tokenOverlap(normalizedExpected, normalizedCandidate);
  const dice = characterDiceSimilarity(normalizedExpected, normalizedCandidate);

  return Math.max(
    containment ? 0.9 : 0,
    overlap * 0.65 + dice * 0.35,
  );
}

export function scorePlaceCandidate(
  input: PlaceSearchInput,
  candidate: PlaceSearchCandidate,
) {
  const nameScore = textScore(input.name, candidate.displayName ?? "");
  const addressScore = input.address?.trim()
    ? textScore(input.address, candidate.formattedAddress ?? "")
    : 0;

  const combinedScore = input.address?.trim()
    ? nameScore * 0.75 + addressScore * 0.25
    : nameScore;

  const addressOverlap = input.address?.trim()
    ? addressTokenOverlap(input.address, candidate.formattedAddress ?? "")
    : 0;

  return {
    nameScore,
    addressScore,
    addressOverlap,
    combinedScore,
  };
}

export function selectBestPlaceCandidate(
  input: PlaceSearchInput,
  candidates: PlaceSearchCandidate[],
) {
  if (!candidates.length) return null;

  const scored = candidates
    .map((candidate) => ({
      candidate,
      ...scorePlaceCandidate(input, candidate),
    }))
    .sort((left, right) => right.combinedScore - left.combinedScore);

  const best = scored[0];
  if (!best) return null;

  const hasAddress = Boolean(input.address?.trim());
  const minimumScore = hasAddress ? 0.72 : 0.82;
  const minimumNameScore = hasAddress ? 0.55 : 0.82;

  if (
    best.combinedScore < minimumScore ||
    best.nameScore < minimumNameScore ||
    (hasAddress && best.addressOverlap < 0.6)
  ) {
    return null;
  }

  const second = scored[1];
  if (second && best.combinedScore - second.combinedScore < 0.04) {
    return null;
  }

  return best.candidate;
}
