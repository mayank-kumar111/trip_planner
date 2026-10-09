"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

const FREE_AI_GENERATIONS = Number(process.env.NEXT_PUBLIC_FREE_AI_GENERATIONS ?? 5);
const PAID_AI_GENERATIONS = Number(process.env.NEXT_PUBLIC_PAID_AI_GENERATIONS ?? 100);
const PAID_PLAN_SLUG = process.env.NEXT_PUBLIC_CLERK_PREMIUM_PLAN_SLUG ?? "monthly";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function UsageCard() {
  const { isLoaded, isSignedIn, has } = useAuth();
  const period = getCurrentPeriod();

  const usage = useQuery(
    api.aiUsage.getAiUsage,
    isLoaded && isSignedIn ? { period } : "skip",
  );

  if (!isLoaded || !isSignedIn || usage === undefined) return null;

  const isPaid = has({ plan: PAID_PLAN_SLUG });
  const limit = isPaid ? PAID_AI_GENERATIONS : FREE_AI_GENERATIONS;
  const used = Math.max(0, Number(usage.used ?? 0));
  const remaining = Math.max(0, limit - used);
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <section className="mb-7 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">AI trip usage</p>
              <p className="text-xl font-bold capitalize">
                {isPaid ? PAID_PLAN_SLUG : "free"} plan
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {used} / {limit} used
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-black transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {remaining > 0
              ? `${remaining} AI trip generation${remaining === 1 ? "" : "s"} remaining this month.`
              : "You have reached your monthly AI trip-generation limit."}
          </p>
        </div>

        {!isPaid && (
          <Link href="/pricing">
            <Button>Upgrade Plan</Button>
          </Link>
        )}
      </div>
    </section>
  );
}
