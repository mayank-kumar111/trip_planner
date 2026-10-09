"use client";

import { CalendarDays, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  onSelectedOption: (value: string) => void;
};

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function TravelDatesUi({ onSelectedOption }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const valid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return endDate >= startDate;
  }, [startDate, endDate]);

  const applyDates = () => {
    if (!valid) return;
    onSelectedOption(`Travel dates: ${formatDate(startDate)} to ${formatDate(endDate)} (${startDate} to ${endDate})`);
  };

  return (
    <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Pick your travel dates</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Exact dates help us build a more useful day-by-day itinerary and seasonal plan.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block w-full rounded-xl border px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              End date
              <input
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block w-full rounded-xl border px-3 py-2 outline-none focus:border-primary"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!valid}
            onClick={applyDates}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Use these dates
          </button>
          <p className="mt-2 text-xs text-gray-400">
            This fills the message box only. Press Enter to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
