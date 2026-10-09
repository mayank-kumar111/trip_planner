import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const checks = {
    clerk: configured("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && configured("CLERK_SECRET_KEY"),
    convex: configured("NEXT_PUBLIC_CONVEX_URL"),
    gemini: configured("GEMINI_API_KEY"),
    googleRoutes: configured("GOOGLE_ROUTES_API_KEY"),
    googlePlaces: configured("GOOGLE_PLACE_API_KEY"),
  };

  const required = checks.clerk && checks.convex && checks.gemini;

  return NextResponse.json(
    {
      status: required ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      service: "trip-planner",
      checks,
    },
    { status: required ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
