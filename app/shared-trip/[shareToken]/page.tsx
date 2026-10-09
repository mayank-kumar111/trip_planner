"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Itinerary from "@/app/create-new-trip/_components/Itinerary";
import { TripInfo } from "@/app/create-new-trip/_components/ChatBox";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPinned } from "lucide-react";
import { useTripDetail } from "@/app/provider";

export default function SharedTripPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = React.use(params);
  const sharedTrip = useQuery(api.tripDetail.GetTripByShareToken, { shareToken });
  const { setTripDetailInfo } = useTripDetail() ?? {};

  React.useEffect(() => {
    if (sharedTrip?.tripDetail) {
      setTripDetailInfo?.(sharedTrip.tripDetail as TripInfo);
    }

    return () => {
      setTripDetailInfo?.(null);
    };
  }, [sharedTrip, setTripDetailInfo]);

  if (sharedTrip === undefined) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <MapPinned className="mx-auto mb-3" size={32} />
          <h1 className="text-xl font-semibold">Loading shared trip…</h1>
          <p className="mt-2 text-sm text-gray-500">Fetching the shared itinerary.</p>
        </div>
      </div>
    );
  }

  if (!sharedTrip) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Shared trip unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            This share link may have been revoked or is no longer valid.
          </p>
          <Link href="/" className="mt-5 inline-block">
            <Button>
              <ArrowLeft className="mr-2" size={16} />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const destination = (sharedTrip.tripDetail as TripInfo)?.destination || "Shared Trip";

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2" size={16} />
              Home
            </Button>
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Shared Trip</p>
            <h1 className="text-2xl font-semibold">{destination}</h1>
          </div>
        </div>
        <Itinerary />
      </div>
    </div>
  );
}
