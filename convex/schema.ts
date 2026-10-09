import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    UserTable: defineTable({
        name: v.string(),
        imageUrl: v.string(),
        email: v.string(),
        clerkId: v.optional(v.string()),
        subscription: v.optional(v.string()),
    })
        .index("by_email", ["email"])
        .index("by_clerkId", ["clerkId"]),

    TripDetailTable: defineTable({
        tripId: v.string(),
        tripDetail: v.any(),
        uid: v.id("UserTable"),
        shareToken: v.optional(v.string()),
        sharedAt: v.optional(v.number()),
    })
        .index("by_uid", ["uid"])
        .index("by_tripId", ["tripId"])
        .index("by_uid_tripId", ["uid", "tripId"])
        .index("by_shareToken", ["shareToken"]),

    TripGenerationJobTable: defineTable({
        tripId: v.string(),
        uid: v.id("UserTable"),
        status: v.union(
            v.literal("generated"),
            v.literal("enriching"),
            v.literal("enriched"),
            v.literal("routing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        stage: v.string(),
        error: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
        retryCount: v.optional(v.number()),
        processingStartedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        durationMs: v.optional(v.number()),
        placesRequests: v.optional(v.number()),
        placesCacheHits: v.optional(v.number()),
        routeRequests: v.optional(v.number()),
        routeCacheHits: v.optional(v.number()),
        providerFailures: v.optional(v.number()),
        workerToken: v.optional(v.string()),
    })
        .index("by_tripId", ["tripId"])
        .index("by_uid", ["uid"])
        .index("by_uid_status", ["uid", "status"])
        .index("by_status_updatedAt", ["status", "updatedAt"]),

    AiUsageTable: defineTable({
        uid: v.id("UserTable"),
        period: v.string(),
        generations: v.number(),
        reservedCount: v.optional(v.number()),
        reserved: v.optional(v.array(v.string())),
    }).index("by_uid_period", ["uid", "period"]),

    AiReservationTable: defineTable({
        reservationId: v.string(),
        uid: v.id("UserTable"),
        period: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("released"),
            v.literal("expired"),
        ),
        createdAt: v.number(),
        expiresAt: v.number(),
    })
        .index("by_reservationId", ["reservationId"])
        .index("by_uid_period_status", ["uid", "period", "status"]),
});
