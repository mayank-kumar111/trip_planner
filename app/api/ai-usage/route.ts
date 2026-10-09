import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const FREE_AI_GENERATIONS = Number(process.env.FREE_AI_GENERATIONS ?? 5);
const PAID_AI_GENERATIONS = Number(process.env.PAID_AI_GENERATIONS ?? 100);
const PAID_PLAN_SLUG = process.env.CLERK_PREMIUM_PLAN_SLUG ?? "monthly";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const { userId, has, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Authentication token unavailable" }, { status: 401 });
    }

    const isPaid = has({ plan: PAID_PLAN_SLUG });
    const limit = isPaid ? PAID_AI_GENERATIONS : FREE_AI_GENERATIONS;

    if (!Number.isFinite(limit) || limit < 1) {
      return NextResponse.json({ error: "AI usage limits are misconfigured" }, { status: 503 });
    }

    const period = getCurrentPeriod();
    const usage = await fetchQuery(
      api.aiUsage.getAiUsage,
      { period },
      { token },
    );

    const used = Math.max(0, Number(usage?.used ?? 0));
    const reserved = Math.max(0, Number(usage?.reserved ?? 0));

    return NextResponse.json({
      plan: isPaid ? PAID_PLAN_SLUG : "free",
      used,
      reserved,
      limit,
      remaining: Math.max(0, limit - used - reserved),
      period,
    });
  } catch (error) {
    console.error("AI usage API error:", error);
    return NextResponse.json(
      { error: "Unable to load AI usage right now." },
      { status: 500 },
    );
  }
}
