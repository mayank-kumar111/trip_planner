import React from 'react'
import { PricingTable } from '@clerk/nextjs'
import BillingStatus from './_components/BillingStatus'

function Pricing() {
    return (
        <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-background via-background to-primary/5 py-8">
            <div className="mx-auto w-full max-w-6xl px-4 md:px-8 lg:px-10">
                <div className="mb-8 text-center">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Trip Planner Billing</p>
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Choose the plan that fits your travel goals</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                        Upgrade for a higher monthly AI trip-generation limit and keep creating fresh itineraries.
                    </p>
                </div>

                <BillingStatus />

                <div className="rounded-3xl border bg-card p-3 shadow-sm md:p-5">
                    <PricingTable
                        newSubscriptionRedirectUrl="/pricing?payment=success"
                    />
                </div>
            </div>
        </main>

    )
}

export default Pricing
