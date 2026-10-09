import assert from "node:assert/strict";
import test from "node:test";
import { extractExplicitTravelDates, getInclusiveTripDays, normalizeTripDateFields } from "../lib/trip/date-rules.ts";

test("calculates inclusive calendar days from exact dates", () => {
  assert.equal(getInclusiveTripDays("2026-09-11", "2026-09-15"), 5);
});

test("exact start and end dates override conflicting duration", () => {
  const normalized = normalizeTripDateFields({ start_date: "2026-09-11", end_date: "2026-09-15", duration: "3 days" });
  assert.equal(normalized.duration, "5 days");
});

test("extracts the exact travel dates selected by the date UI", () => {
  const dates = extractExplicitTravelDates([
    { role: "user", content: "Travel dates: 11 Sept 2026 to 15 Sept 2026 (2026-09-11 to 2026-09-15)" },
  ]);
  assert.deepEqual(dates, { start_date: "2026-09-11", end_date: "2026-09-15", days: 5 });
});

test("derives an end date when only start date and duration exist", () => {
  const normalized = normalizeTripDateFields({ start_date: "2026-09-11", duration: "3 days" });
  assert.equal(normalized.end_date, "2026-09-13");
});
