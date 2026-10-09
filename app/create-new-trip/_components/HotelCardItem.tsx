"use client";

import React, { useEffect, useState } from "react";
import { Hotel } from "./ChatBox";
import { MapPin, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type Props = {
  hotel: Hotel;
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

function HotelCardItem({ hotel }: Props) {
  const sourceUrl = hotel?.hotel_image_url || "";
  const safeInitialUrl = isSupportedImageUrl(sourceUrl) ? sourceUrl : "/placeholder.svg";
  const [imageUrl, setImageUrl] = useState(safeInitialUrl);

  useEffect(() => {
    setImageUrl(isSupportedImageUrl(sourceUrl) ? sourceUrl : "/placeholder.svg");
  }, [sourceUrl]);

  const rating = Number.isFinite(Number(hotel?.rating)) ? Number(hotel.rating) : null;

  return (
    <div className="flex flex-col gap-1">
      <Image
        src={imageUrl}
        alt={hotel?.hotel_name || "Hotel Image"}
        width={400}
        height={200}
        className="mb-2 h-[200px] w-full rounded-xl object-cover shadow-md"
        unoptimized={imageUrl.startsWith("/api/")}
        onError={() => setImageUrl("/placeholder.svg")}
      />
      <h2 className="text-lg font-semibold">Name: {hotel?.hotel_name || "Recommended hotel"}</h2>
      <h2 className="flex gap-2 text-blue-500">
        <MapPin /> Location: {hotel?.hotel_address || "Location unavailable"}
      </h2>
      <div className="flex items-center justify-between gap-3">
        <p className="flex gap-2 text-green-600">
          <Wallet /> Price: {hotel?.price_per_night || "Estimate unavailable"}
        </p>
        <p className="flex gap-2 text-yellow-500">
          <Star /> Rating: {rating === null ? "Unavailable" : `${rating} / 5`}
        </p>
      </div>

      <Link
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${hotel.hotel_name}, ${hotel.hotel_address}`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" className="mt-1 w-full">
          View Details
        </Button>
      </Link>
    </div>
  );
}

export default HotelCardItem;
