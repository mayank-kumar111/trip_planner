"use client";

import React, { useEffect, useState } from "react";
import { Trip } from "../page";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    trip: Trip;
    onDelete?: (tripId: string) => Promise<void> | void;
};

function isSupportedImageUrl(url: string) {
    if (url.startsWith("/") && !url.startsWith("//")) return true;

    try {
        const hostname = new URL(url).hostname;
        return hostname === "images.unsplash.com" || hostname === "place.googleapis.com";
    } catch {
        return false;
    }
}

function MyTripCardItem({ trip, onDelete }: Props) {
    const savedImageUrl = trip?.tripDetail?.hotels?.[0]?.hotel_image_url || "";
    const [imageUrl, setImageUrl] = useState(
        isSupportedImageUrl(savedImageUrl) ? savedImageUrl : "/placeholder.svg",
    );
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setImageUrl(
            isSupportedImageUrl(savedImageUrl) ? savedImageUrl : "/placeholder.svg",
        );
    }, [savedImageUrl]);

    const tripTitle = trip?.tripDetail?.destination || "Saved Trip";

    const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!onDelete || deleting) return;
        const confirmed = window.confirm(`Delete your trip to ${tripTitle}?`);
        if (!confirmed) return;

        setDeleting(true);
        try {
            await onDelete(String(trip.tripId));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="border p-5 rounded-lg transition hover:-translate-y-1 hover:shadow-md">
            <Link href={`/my-trips/${trip.tripId}`} className="block">
                <Image
                    src={imageUrl}
                    alt={tripTitle}
                    width={400}
                    height={200}
                    className="rounded-xl mb-3 h-[200px] w-full object-cover"
                    unoptimized={imageUrl.startsWith("/api/")}
                    onError={() => setImageUrl("/placeholder.svg")}
                />
                <h2 className="text-xl font-semibold mb-2">{tripTitle}</h2>
                <p className="text-sm text-gray-600">
                    {trip?.tripDetail?.duration || "Duration unavailable"} · {trip?.tripDetail?.budget || "Budget unavailable"} budget
                </p>
            </Link>

            <div className="mt-3 flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${tripTitle}`}
                    onClick={handleDelete}
                    disabled={!onDelete || deleting}
                >
                    <Trash2 size={18} />
                </Button>
            </div>
        </div>
    );
}

export default MyTripCardItem;
