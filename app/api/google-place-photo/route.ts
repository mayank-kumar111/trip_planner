import { NextRequest, NextResponse } from "next/server";
import { publicPhotoAj } from "@/lib/security/arcjet";

const MAX_PHOTO_NAME_LENGTH = 512;
const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9._~:%-]+(?:\/[A-Za-z0-9._~:%-]+)*$/;
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(req: NextRequest) {
  const photoName = req.nextUrl.searchParams.get("name");

  if (
    !photoName ||
    photoName.length > MAX_PHOTO_NAME_LENGTH ||
    !PHOTO_NAME_PATTERN.test(photoName) ||
    photoName.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(photoName)
  ) {
    return NextResponse.json({ error: "Invalid photo reference" }, { status: 400 });
  }

  const decision = await publicPhotoAj.protect(req, { requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json({ error: "Too Many Requests", reason: decision.reason }, { status: 429 });
  }

  const apiKey = process.env.GOOGLE_PLACE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Places service is not configured" },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxwidthPx=1000&maxheightPx=1000&key=${encodeURIComponent(apiKey)}`,
      {
        cache: "force-cache",
        signal: controller.signal,
      },
    );

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Unable to fetch place photo" },
        { status: response.status || 502 },
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
    const contentLength = Number(response.headers.get("content-length"));

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unexpected photo format" }, { status: 502 });
    }

    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Photo is too large" }, { status: 502 });
    }

    const image = await response.arrayBuffer();
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Photo is too large" }, { status: 502 });
    }

    return new NextResponse(image, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    if (!isTimeout) {
      console.error("Google Places photo proxy error");
    }

    return NextResponse.json(
      { error: isTimeout ? "Photo request timed out" : "Unable to fetch place photo" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
