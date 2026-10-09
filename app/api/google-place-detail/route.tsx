import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aj } from "@/lib/security/arcjet";
import { getRequestId, withRequestId } from "@/lib/security/request-id";
import { googlePhotoProxyUrl } from "@/lib/places/google";
import { lookupGooglePlace } from "@/lib/places/cache";
import { RequestBodyError, readJsonBody } from "@/lib/security/request-body";

const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_PLACE_NAME_LENGTH = 200;

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  let authenticatedUserId: string | undefined;
  try {
    const { userId } = await auth();
    authenticatedUserId = userId ?? undefined;
    if (!userId) return withRequestId(NextResponse.json({ error: "Authentication required" }, { status: 401 }), requestId);
    const decision = await aj.protect(req, { userId, requested: 1 });
    if (decision.isDenied()) return withRequestId(NextResponse.json({ error: "Too Many Requests", reason: decision.reason }, { status: 429 }), requestId);
    const body = await readJsonBody(req, MAX_REQUEST_BYTES);
    const placeName = (body as { placeName?: unknown } | null)?.placeName;
    if (typeof placeName !== "string" || !placeName.trim()) return withRequestId(NextResponse.json({ error: "placeName is required" }, { status: 400 }), requestId);
    const normalizedPlaceName = placeName.trim();
    if (normalizedPlaceName.length > MAX_PLACE_NAME_LENGTH) return withRequestId(NextResponse.json({ error: "placeName is too long" }, { status: 400 }), requestId);
    const place = await lookupGooglePlace(normalizedPlaceName);
    if (!place) return withRequestId(NextResponse.json({ error: "Place not found" }, { status: 404 }), requestId);
    console.info("Place detail lookup completed", { requestId, userId, durationMs: Date.now() - startedAt, placeId: place.placeId });
    return withRequestId(NextResponse.json({ ...place, photoUrl: googlePhotoProxyUrl(place.photoName) }), requestId);
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return withRequestId(NextResponse.json({ error: error.message }, { status: error.status }), requestId);
    }
    const providerError = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
    const response = providerError.response && typeof providerError.response === "object" ? (providerError.response as Record<string, unknown>) : {};
    const responseData = response.data && typeof response.data === "object" ? (response.data as Record<string, unknown>) : {};
    const nestedError = responseData.error && typeof responseData.error === "object" ? (responseData.error as Record<string, unknown>) : {};
    const rawStatus = response.status;
    const status = typeof rawStatus === "number" ? rawStatus : 502;
    const messageFromNested = nestedError.message;
    const messageFromData = responseData.error_message;
    const messageFromError = providerError.message;
    const providerMessage = (typeof messageFromNested === "string" && messageFromNested) || (typeof messageFromData === "string" && messageFromData) || (typeof messageFromError === "string" && messageFromError) || "Unable to fetch place details";
    console.error("Google Places API error", { requestId, userId: authenticatedUserId, durationMs: Date.now() - startedAt, status, message: providerMessage });
    return withRequestId(NextResponse.json({ error: "Unable to fetch place details", provider_status: status, provider_message: process.env.NODE_ENV === "development" ? providerMessage : undefined }, { status: status >= 400 && status < 600 ? status : 502 }), requestId);
  }
}
