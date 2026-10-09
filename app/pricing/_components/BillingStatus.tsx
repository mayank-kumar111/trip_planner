"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAID_PLAN_SLUG = process.env.NEXT_PUBLIC_CLERK_PREMIUM_PLAN_SLUG ?? "monthly";

export default function BillingStatus() {
  const { isLoaded, isSignedIn, has } = useAuth();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPaymentSuccess(params.get("payment") === "success");
  }, []);

  if (!isLoaded || !isSignedIn) return null;

  const isPaid = has({ plan: PAID_PLAN_SLUG });

  if (paymentSuccess && isPaid) {
    return (
      <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 text-emerald-600" size={24} />
          <div className="flex-1">
            <h2 className="font-semibold text-emerald-900">Payment successful</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Your <strong>{PAID_PLAN_SLUG}</strong> plan is active. You can now use your paid AI trip-generation limit.
            </p>
            <Link href="/my-trips" className="mt-3 inline-flex">
              <Button size="sm">Go to My Trips</Button>
            </Link>
          </div>
          <Sparkles className="text-emerald-500" size={20} />
        </div>
      </section>
    );
  }

  if (paymentSuccess && !isPaid) {
    return (
      <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 text-amber-600" size={24} />
          <div>
            <h2 className="font-semibold text-amber-900">Payment received, plan not active yet</h2>
            <p className="mt-1 text-sm text-amber-800">
              Clerk has not reported the paid entitlement yet. Refresh this page in a moment; your application will use the paid limit as soon as the plan becomes active.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isPaid) {
    return (
      <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">Current plan</p>
            <h2 className="text-xl font-bold capitalize text-sky-950">{PAID_PLAN_SLUG}</h2>
            <p className="mt-1 text-sm text-sky-800">Your paid AI trip features are active.</p>
          </div>
          <Link href="/my-trips">
            <Button size="sm">View Usage</Button>
          </Link>
        </div>
      </section>
    );
  }

  return null;
}
