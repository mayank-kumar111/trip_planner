"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import { TripInfo } from "@/app/create-new-trip/_components/ChatBox";

type Props = { tripId: string; tripDetail: TripInfo; onSaved: (tripDetail: TripInfo) => void };

type FormState = {
  origin: string;
  destination: string;
  duration: string;
  group_size: string;
  budget: string;
  travel_dates: string;
  start_date: string;
  end_date: string;
  interests: string;
  special_requirements: string;
};

function parseDurationDays(value: string) {
  const match = value.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const days = Math.round(Number(match[0]));
  return Number.isFinite(days) && days > 0 ? days : null;
}

function parseISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function addDays(value: string, daysToAdd: number) {
  const date = parseISODate(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function diffInclusiveDays(start: string, end: string) {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  if (!startDate || !endDate) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return diff > 0 ? diff : null;
}

function formatTravelDates(start: string, end: string) {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  if (!startDate || !endDate || endDate < startDate) return "";

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
}

function normalizeDates(start: string, end: string, duration: string, preferredSource: "duration" | "end" = "duration") {
  const durationDays = parseDurationDays(duration);
  const validStart = parseISODate(start);
  const validEnd = parseISODate(end);

  if (validStart && durationDays && preferredSource === "duration") {
    const normalizedEnd = addDays(start, durationDays - 1);
    return {
      start_date: start,
      end_date: normalizedEnd,
      duration: `${durationDays} days`,
      travel_dates: normalizedEnd ? formatTravelDates(start, normalizedEnd) : "",
    };
  }

  if (validStart && validEnd && validEnd >= validStart) {
    const calculatedDuration = diffInclusiveDays(start, end);
    return {
      start_date: start,
      end_date: end,
      duration: calculatedDuration ? `${calculatedDuration} days` : duration,
      travel_dates: formatTravelDates(start, end),
    };
  }

  if (validStart && durationDays) {
    const normalizedEnd = addDays(start, durationDays - 1);
    return {
      start_date: start,
      end_date: normalizedEnd,
      duration: `${durationDays} days`,
      travel_dates: normalizedEnd ? formatTravelDates(start, normalizedEnd) : "",
    };
  }

  return {
    start_date: start,
    end_date: end,
    duration,
    travel_dates: validStart && validEnd ? formatTravelDates(start, end) : "",
  };
}

function getForm(tripDetail: TripInfo): FormState {
  const normalized = normalizeDates(
    tripDetail.start_date ?? "",
    tripDetail.end_date ?? "",
    tripDetail.duration ?? "",
    "duration",
  );

  return {
    origin: tripDetail.origin ?? "",
    destination: tripDetail.destination ?? "",
    duration: normalized.duration,
    group_size: tripDetail.group_size ?? "",
    budget: tripDetail.budget ?? "",
    travel_dates: normalized.travel_dates,
    start_date: normalized.start_date,
    end_date: normalized.end_date,
    interests: tripDetail.interests ?? "",
    special_requirements: tripDetail.special_requirements ?? "",
  };
}

export default function EditTripPreferences({ tripId, tripDetail, onSaved }: Props) {
  const updateTrip = useMutation(api.tripDetail.UpdateTripPreferences);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(() => getForm(tripDetail));

  useEffect(() => {
    setForm(getForm(tripDetail));
  }, [tripDetail]);

  const displayTravelDates = useMemo(
    () => formatTravelDates(form.start_date, form.end_date),
    [form.start_date, form.end_date],
  );

  const updateField = (field: keyof FormState, value: string) => {
    setError("");
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "duration") {
        const normalized = normalizeDates(current.start_date, current.end_date, value, "duration");
        return { ...next, ...normalized };
      }

      if (field === "start_date") {
        const normalized = normalizeDates(value, current.end_date, current.duration, "duration");
        return { ...next, ...normalized };
      }

      if (field === "end_date") {
        const normalized = normalizeDates(current.start_date, value, current.duration, "end");
        return { ...next, ...normalized };
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!form.origin.trim() || !form.destination.trim()) {
      setError("Origin and destination are required.");
      return;
    }

    const start = parseISODate(form.start_date);
    const end = parseISODate(form.end_date);
    const durationDays = parseDurationDays(form.duration);

    if (form.start_date && !start) {
      setError("Please choose a valid start date.");
      return;
    }
    if (form.end_date && !end) {
      setError("Please choose a valid end date.");
      return;
    }
    if (start && (!durationDays || durationDays < 1)) {
      setError("Duration must be a positive number of days.");
      return;
    }

    const normalizedDates = normalizeDates(form.start_date, form.end_date, form.duration, "duration");
    if (normalizedDates.start_date && normalizedDates.end_date && normalizedDates.end_date < normalizedDates.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await updateTrip({
        tripId,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        duration: normalizedDates.duration.trim(),
        group_size: form.group_size.trim(),
        budget: form.budget.trim(),
        travel_dates: normalizedDates.travel_dates,
        start_date: normalizedDates.start_date,
        end_date: normalizedDates.end_date,
        interests: form.interests.trim(),
        special_requirements: form.special_requirements.trim(),
      });
      onSaved(result.tripDetail as TripInfo);
      setEditing(false);
    } catch (err) {
      console.error("Trip preference update failed:", err);
      setError(err instanceof Error ? err.message : "Unable to save trip preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="mr-2" size={16} />
          Edit Trip
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Edit Trip</h2>
          <p className="text-sm text-gray-500">Change any planning preference. Dates and duration stay synchronized automatically.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={() => { setError(""); setEditing(false); }}>
          <X size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Origin
          <Input className="mt-1" value={form.origin} onChange={(e) => updateField("origin", e.target.value)} />
        </label>
        <label className="text-sm font-medium">Destination
          <Input className="mt-1" value={form.destination} onChange={(e) => updateField("destination", e.target.value)} />
        </label>
        <label className="text-sm font-medium">Duration (days)
          <Input className="mt-1" inputMode="numeric" value={form.duration} onChange={(e) => updateField("duration", e.target.value)} />
        </label>
        <label className="text-sm font-medium">Travelers
          <Input className="mt-1" value={form.group_size} onChange={(e) => updateField("group_size", e.target.value)} />
        </label>
        <label className="text-sm font-medium">Budget
          <Input className="mt-1" value={form.budget} onChange={(e) => updateField("budget", e.target.value)} />
        </label>
        <label className="text-sm font-medium">Travel dates
          <Input className="mt-1" value={displayTravelDates} readOnly aria-readonly="true" />
        </label>
        <label className="text-sm font-medium">Start date
          <Input className="mt-1" value={form.start_date} onChange={(e) => updateField("start_date", e.target.value)} type="date" />
        </label>
        <label className="text-sm font-medium">End date
          <Input className="mt-1" value={form.end_date} onChange={(e) => updateField("end_date", e.target.value)} type="date" />
        </label>
        <label className="text-sm font-medium md:col-span-2">Interests
          <Textarea className="mt-1 min-h-20" value={form.interests} onChange={(e) => updateField("interests", e.target.value)} placeholder="Culture, food, beaches, adventure..." />
        </label>
        <label className="text-sm font-medium md:col-span-2">Special requirements
          <Textarea className="mt-1 min-h-20" value={form.special_requirements} onChange={(e) => updateField("special_requirements", e.target.value)} placeholder="Accessibility, dietary needs, pace, places to avoid..." />
        </label>
      </div>

      <p className="mt-3 text-xs text-gray-500">Dates use inclusive trip days: 1 day starting 1 Sep ends 1 Sep; 5 days starting 1 Sep ends 5 Sep.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2" size={16} />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
