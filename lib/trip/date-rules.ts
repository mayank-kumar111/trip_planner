export type TripDateFields = {
  start_date?: string;
  end_date?: string;
  duration?: string;
  travel_dates?: string;
};

export function parseDurationDays(value?: string) {
  const match = value?.match(/\b(\d+(?:\.\d+)?)\b/);
  if (!match) return null;
  const days = Math.round(Number(match[1]));
  return Number.isFinite(days) && days > 0 ? days : null;
}

export function getInclusiveTripDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function isMatchingTripDuration(startDate: string, endDate: string, expectedDays?: number) {
  if (!expectedDays) return true;
  return getInclusiveTripDays(startDate, endDate) === expectedDays;
}

export function addDays(startDate: string, daysToAdd: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

export function formatTripDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

export function normalizeTripDateFields<T extends TripDateFields>(trip: T): T & TripDateFields {
  if (trip.start_date && trip.end_date) {
    const days = getInclusiveTripDays(trip.start_date, trip.end_date);
    if (days) return { ...trip, duration: `${days} days`, travel_dates: formatTripDates(trip.start_date, trip.end_date) };
  }

  const durationDays = parseDurationDays(trip.duration);
  if (trip.start_date && durationDays && !trip.end_date) {
    const endDate = addDays(trip.start_date, durationDays - 1);
    if (endDate) return { ...trip, end_date: endDate, travel_dates: formatTripDates(trip.start_date, endDate) };
  }

  return trip;
}

export function extractExplicitTravelDates(messages: Array<{ role: string; content: string }>) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const content = messages[index]?.content ?? "";
    const match = content.match(/\((\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})\)/i);
    if (match) return { start_date: match[1], end_date: match[2], days: getInclusiveTripDays(match[1], match[2]) };
  }
  return null;
}
