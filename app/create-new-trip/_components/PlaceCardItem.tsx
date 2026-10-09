"use client";

import { Button } from "@/components/ui/button";
import { Car, Clock, ExternalLinkIcon, MapPin, Ticket, Timer } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Activity } from "./ChatBox";
import Image from "next/image";

type Props = {
  activity: Activity;
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

function PlaceCardItem({ activity }: Props) {
  const sourceUrl = activity?.place_image_url || "";
  const safeInitialUrl = isSupportedImageUrl(sourceUrl) ? sourceUrl : "/placeholder.svg";
  const [imageUrl, setImageUrl] = useState(safeInitialUrl);

  useEffect(() => {
    setImageUrl(isSupportedImageUrl(sourceUrl) ? sourceUrl : "/placeholder.svg");
  }, [sourceUrl]);

  return (
    <div className="flex flex-col gap-1">
      <Image
        src={imageUrl}
        alt={activity?.place_name || "Place Image"}
        width={400}
        height={200}
        className="mb-2 h-[200px] w-full rounded-xl object-cover shadow-md"
        unoptimized={imageUrl.startsWith("/api/")}
        onError={() => setImageUrl("/placeholder.svg")}
      />
      <h2 className="text-lg font-semibold">Place: {activity?.place_name || "Recommended place"}</h2>
      <p className="line-clamp-2 text-gray-500">
        Details: {activity?.place_details || "Details unavailable"}
      </p>

      <h2 className="flex gap-2 text-blue-500">
        <MapPin /> Location: {activity?.place_address || "Location unavailable"}
      </h2>
      <div className="flex items-center justify-between gap-3">
        <p className="flex gap-2 text-green-600">
          <Ticket /> Pricing: {activity?.ticket_pricing || "Estimate unavailable"}
        </p>
        <p className="flex gap-2 text-orange-500">
          <Clock /> Travel Time: {activity?.time_travel_each_location || "Unavailable"}
        </p>
      </div>
      {activity?.road_distance && activity?.road_travel_time && (
        <p className="flex gap-2 text-indigo-600">
          <Car /> {activity.road_distance} · {activity.road_travel_time} drive
        </p>
      )}
      <p className="flex gap-2 text-yellow-500">
        <Timer /> Best Time to Visit: {activity?.best_time_to_visit || "Flexible"}
      </p>

      <Link
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${activity.place_name}, ${activity.place_address}`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" className="mt-1 w-full">
          View <ExternalLinkIcon />
        </Button>
      </Link>
    </div>
  );
}

export default PlaceCardItem;
