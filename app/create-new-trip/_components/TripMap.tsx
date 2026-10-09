"use client";

import { APIProvider, AdvancedMarker, Map, Polyline } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import React, { useMemo } from "react";
import { TripInfo } from "./ChatBox";

type Props = {
  tripData: TripInfo;
};

type MarkerPoint = {
  id: string;
  title: string;
  position: { lat: number; lng: number };
  kind: "hotel" | "activity";
  day?: number;
};

const routeColors = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
];

function validCoordinates(value: unknown): value is { latitude: number; longitude: number } {
  if (!value || typeof value !== "object") return false;
  const point = value as { latitude?: unknown; longitude?: unknown };
  return (
    typeof point.latitude === "number" &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.longitude)
  );
}

export default function TripMap({ tripData }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_MAPS === "true";

  const markers = useMemo<MarkerPoint[]>(() => {
    const points: MarkerPoint[] = [];

    (tripData.hotels ?? []).forEach((hotel, index) => {
      if (!validCoordinates(hotel.geo_coordinates)) return;
      points.push({
        id: `hotel-${index}`,
        title: `Hotel: ${hotel.hotel_name}`,
        position: {
          lat: hotel.geo_coordinates.latitude,
          lng: hotel.geo_coordinates.longitude,
        },
        kind: "hotel",
      });
    });

    (tripData.itinerary ?? []).forEach((day) => {
      (day.activities ?? []).forEach((activity, index) => {
        if (!validCoordinates(activity.geo_coordinates)) return;
        points.push({
          id: `day-${day.day}-activity-${index}`,
          title: `Day ${day.day}: ${activity.place_name}`,
          position: {
            lat: activity.geo_coordinates.latitude,
            lng: activity.geo_coordinates.longitude,
          },
          kind: "activity",
          day: day.day,
        });
      });
    });

    return points;
  }, [tripData]);

  const routePolylines = useMemo(() => {
    return (tripData.itinerary ?? []).flatMap((day, dayIndex) =>
      (day.route_segments ?? [])
        .filter(
          (segment) =>
            typeof segment.encoded_polyline === "string" &&
            segment.encoded_polyline.length > 0,
        )
        .map((segment, segmentIndex) => ({
          id: `day-${day.day}-route-${segmentIndex}`,
          encodedPath: segment.encoded_polyline as string,
          day: day.day,
          color: routeColors[dayIndex % routeColors.length],
        })),
    );
  }, [tripData]);

  const center = useMemo(() => {
    if (!markers.length) return { lat: 20.5937, lng: 78.9629 };

    return {
      lat: markers.reduce((sum, point) => sum + point.position.lat, 0) / markers.length,
      lng: markers.reduce((sum, point) => sum + point.position.lng, 0) / markers.length,
    };
  }, [markers]);

  const zoom = useMemo(() => {
    if (markers.length <= 2) return 12;

    const latitudes = markers.map((point) => point.position.lat);
    const longitudes = markers.map((point) => point.position.lng);
    const span = Math.max(
      Math.max(...latitudes) - Math.min(...latitudes),
      Math.max(...longitudes) - Math.min(...longitudes),
    );

    if (span > 5) return 6;
    if (span > 1) return 8;
    if (span > 0.2) return 10;
    return 12;
  }, [markers]);

  // Keep Google Maps completely disabled until the project's billing is active.
  // This prevents BillingNotEnabledMapError from polluting development and CI.
  if (!mapsEnabled) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-5 text-sm text-gray-600">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-medium text-gray-900">Trip map temporarily unavailable</p>
            <p className="mt-1">
              Your trip locations and Google Routes data are still available. The interactive Google map will be enabled after Google Maps billing is activated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-medium text-gray-900">Map is not configured</p>
        <p className="mt-1">
          Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment before enabling the interactive map.
        </p>
      </div>
    );
  }

  if (!markers.length) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-medium text-gray-900">Map data unavailable</p>
        <p className="mt-1">Verified location coordinates are required to plot this trip.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div>
          <h3 className="font-semibold">Trip Map</h3>
          <p className="text-xs text-gray-500">{markers.length} mapped locations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Hotels</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Activities</span>
          {routePolylines.length > 0 && <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 bg-gray-800" /> Road routes</span>}
        </div>
      </div>
      <div className="h-[420px] w-full">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={zoom}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {routePolylines.map((route) => (
              <Polyline
                key={route.id}
                encodedPath={route.encodedPath}
                strokeColor={route.color}
                strokeOpacity={0.85}
                strokeWeight={5}
              />
            ))}

            {markers.map((marker) => (
              <AdvancedMarker key={marker.id} position={marker.position} title={marker.title}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg ${
                    marker.kind === "hotel" ? "bg-blue-600" : "bg-red-500"
                  }`}
                  aria-label={marker.title}
                >
                  {marker.kind === "hotel" ? (
                    <MapPin size={16} className="text-white" />
                  ) : (
                    <span className="text-xs font-bold text-white">{marker.day ?? "•"}</span>
                  )}
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
