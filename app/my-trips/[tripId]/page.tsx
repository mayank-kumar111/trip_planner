"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTripDetail } from "@/app/provider";
import Itinerary from "@/app/create-new-trip/_components/Itinerary";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripInfo } from "@/app/create-new-trip/_components/ChatBox";
import EditTripPreferences from "./_components/EditTripPreferences";
import RegenerateTrip from "./_components/RegenerateTrip";
import ShareTrip from "./_components/ShareTrip";

const ACTIVE_STATUSES = new Set(["generated", "enriching", "enriched", "routing"]);

type TripQueryArgs = { tripId: string } | "skip";

export default function SavedTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = React.use(params);
  const { isLoaded, isSignedIn } = useAuth();
  const queryArgs: TripQueryArgs = isLoaded && isSignedIn ? { tripId } : "skip";
  const trip = useQuery(api.tripDetail.GetTripById, queryArgs);
  const generationJob = useQuery(api.tripDetail.GetTripGenerationJob, queryArgs);
  const retryGenerationJob = useMutation(api.tripDetail.RetryTripGenerationJob);
  const { setTripDetailInfo } = useTripDetail() ?? {};
  const [localTripDetail, setLocalTripDetail] = useState<TripInfo | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (trip?.tripDetail) {
      const nextTrip = trip.tripDetail as TripInfo;
      setLocalTripDetail(nextTrip);
      setTripDetailInfo?.(nextTrip);
    }

    if (isLoaded && !isSignedIn) {
      setLocalTripDetail(null);
      setTripDetailInfo?.(null);
    }

    return () => {
      setTripDetailInfo?.(null);
    };
  }, [trip, isLoaded, isSignedIn, setTripDetailInfo]);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryGenerationJob({ tripId });
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Unable to restart trip processing");
    } finally {
      setRetrying(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Loading…</h1>
          <p className="mt-2 text-sm text-gray-500">Checking your sign-in status.</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-gray-500">
            Please sign in to view this saved trip.
          </p>
          <Link href="/sign-in" className="mt-5 inline-block">
            <Button>Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (trip === undefined) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Loading trip…</h1>
          <p className="mt-2 text-sm text-gray-500">
            Fetching your saved itinerary securely from Convex.
          </p>
        </div>
      </div>
    );
  }

  if (!trip || !localTripDetail) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Trip not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            This trip may have been deleted or you may not have access to it.
          </p>
          <Link href="/my-trips" className="mt-5 inline-block">
            <Button>
              <ArrowLeft className="mr-2" size={16} />
              Back to My Trips
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const jobActive = generationJob && ACTIVE_STATUSES.has(generationJob.status);
  const jobNeedsRetry = generationJob?.canRetry === true;
  const jobCompleted = generationJob?.status === "completed";
  const retryCount = generationJob?.retryCount ?? 0;
  const maxRetries = generationJob?.maxRetries ?? 3;
  const retriesExhausted = retryCount >= maxRetries;
  const showJobCard = Boolean(generationJob && (!jobCompleted || jobActive));

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/my-trips">
            <Button variant="outline">
              <ArrowLeft className="mr-2" size={16} />
              My Trips
            </Button>
          </Link>
          <div className="text-right">
            <h1 className="text-xl font-semibold md:text-2xl">
              {localTripDetail.destination || "Saved Trip"}
            </h1>
            <p className="text-sm text-gray-500">Trip ID: {trip.tripId}</p>
          </div>
        </div>

        {showJobCard && generationJob && (
          <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {jobNeedsRetry ? (
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                ) : jobCompleted ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                )}
                <div>
                  <p className="font-semibold">
                    {jobNeedsRetry ? "Trip processing needs a retry" : jobCompleted ? "Trip processing complete" : "Trip processing in progress"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{generationJob.stage}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Processing retries used: {retryCount} / {maxRetries}
                  </p>
                  {generationJob.error && (
                    <p className="mt-1 text-sm text-gray-500">{generationJob.error}</p>
                  )}
                  {generationJob.isStale && !jobNeedsRetry && (
                    <p className="mt-1 text-sm text-gray-500">Processing appears to have stopped and can be restarted.</p>
                  )}
                  {retriesExhausted && (
                    <p className="mt-1 text-sm text-gray-500">
                      The retry limit has been reached. Start a new trip instead of repeatedly retrying this job.
                    </p>
                  )}
                </div>
              </div>

              {jobNeedsRetry && (
                <Button onClick={handleRetry} disabled={retrying || retriesExhausted} className="shrink-0">
                  {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {retrying ? "Restarting…" : retriesExhausted ? "Retry limit reached" : "Retry processing"}
                </Button>
              )}
            </div>
            {retryError && <p className="mt-3 text-sm text-red-600">{retryError}</p>}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EditTripPreferences
            tripId={tripId}
            tripDetail={localTripDetail}
            onSaved={(updatedTrip) => {
              setLocalTripDetail(updatedTrip);
              setTripDetailInfo?.(updatedTrip);
            }}
          />

          <RegenerateTrip
            tripId={tripId}
            tripDetail={localTripDetail}
            onRegenerated={(updatedTrip) => {
              setLocalTripDetail(updatedTrip);
              setTripDetailInfo?.(updatedTrip);
            }}
          />
        </div>

        <ShareTrip tripId={tripId} shareToken={trip.shareToken ?? null} />

        <Itinerary />
      </div>
    </div>
  );
}
