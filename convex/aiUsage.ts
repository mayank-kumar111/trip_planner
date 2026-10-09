import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { v4 as uuidv4 } from "uuid";

const RESERVATION_TTL_MS = 10 * 60 * 1000;
type ReservationStatus = "pending" | "confirmed" | "released" | "expired";
type DbCtx = QueryCtx | MutationCtx;
type UserId = Id<"UserTable">;
type UsageTotals = { used: number; reserved: number };

async function getAuthenticatedUser(ctx: DbCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject?.trim();
  const email = identity?.email?.trim().toLowerCase();
  if (!clerkId) return null;
  let user = await ctx.db.query("UserTable").withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId)).unique();
  if (!user && email) {
    const legacyUsers = await ctx.db.query("UserTable").withIndex("by_email", (q) => q.eq("email", email)).collect();
    const legacyMatches = legacyUsers.filter((candidate) => !candidate.clerkId);
    if (legacyMatches.length === 1) user = legacyMatches[0];
  }
  return user ? { user, email } : null;
}

async function getUsage(ctx: DbCtx, uid: UserId, period: string) {
  return await ctx.db.query("AiUsageTable").withIndex("by_uid_period", (q) => q.eq("uid", uid).eq("period", period)).unique();
}

async function getUsageTotals(ctx: DbCtx, user: { _id: UserId; email: string }, period: string): Promise<UsageTotals> {
  const current = await getUsage(ctx, user._id, period);
  let used = Math.max(0, Number(current?.generations ?? 0));
  let reserved = Math.max(0, Number(current?.reservedCount ?? 0));
  const email = user.email.trim().toLowerCase();

  // Read legacy quota records created before clerkId was stored. Only an
  // un-identified record with the authenticated account's verified email is eligible.
  const usersWithEmail = await ctx.db.query("UserTable").withIndex("by_email", (q) => q.eq("email", email)).collect();
  for (const legacyUser of usersWithEmail) {
    if (legacyUser._id === user._id || legacyUser.clerkId) continue;
    const legacyUsage = await getUsage(ctx, legacyUser._id, period);
    if (!legacyUsage) continue;
    used += Math.max(0, Number(legacyUsage.generations ?? 0));
    reserved += Math.max(0, Number(legacyUsage.reservedCount ?? 0));
  }
  return { used, reserved };
}

async function reclaimExpiredReservations(ctx: MutationCtx, uid: UserId, period: string, usage: Awaited<ReturnType<typeof getUsage>>) {
  if (!usage) return { usage, reservedCount: 0 };
  const now = Date.now();
  const storedReservedCount = Math.max(0, Number(usage.reservedCount ?? 0));
  const legacyReservedCount = Array.isArray(usage.reserved) ? usage.reserved.length : 0;
  let reservedCount = Math.max(storedReservedCount, legacyReservedCount);
  const pending = await ctx.db.query("AiReservationTable").withIndex("by_uid_period_status", (q) => q.eq("uid", uid).eq("period", period).eq("status", "pending")).collect();
  for (const reservation of pending.filter((item) => item.expiresAt <= now)) {
    await ctx.db.patch(reservation._id, { status: "expired" as ReservationStatus });
    reservedCount = Math.max(0, reservedCount - 1);
  }
  if (reservedCount !== usage.reservedCount || usage.reserved !== undefined) await ctx.db.patch(usage._id, { reservedCount, reserved: [] });
  return { usage, reservedCount };
}

export const checkAiGeneration = query({
  args: { period: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const authenticated = await getAuthenticatedUser(ctx);
    if (!authenticated) return { allowed: false, used: 0, reserved: 0, remaining: 0 };
    const { used, reserved } = await getUsageTotals(ctx, authenticated.user, args.period);
    const remaining = Math.max(0, args.limit - used - reserved);
    return { allowed: remaining > 0, used, reserved, remaining };
  },
});

export const consumeAiGeneration = mutation({
  args: { period: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const authenticated = await getAuthenticatedUser(ctx);
    if (!authenticated) throw new Error("Authentication required");
    const uid = authenticated.user._id;
    const current = await getUsage(ctx, uid, args.period);
    const reclaimed = await reclaimExpiredReservations(ctx, uid, args.period, current);
    const usage = reclaimed.usage;
    const { used: totalUsed, reserved: totalReserved } = await getUsageTotals(ctx, authenticated.user, args.period);
    if (totalUsed + totalReserved >= args.limit) return { allowed: false, used: totalUsed, reserved: totalReserved, remaining: 0, reservationId: null };
    const reservationId = uuidv4();
    const now = Date.now();
    if (usage) await ctx.db.patch(usage._id, { reservedCount: reclaimed.reservedCount + 1, reserved: [] });
    else await ctx.db.insert("AiUsageTable", { uid, period: args.period, generations: 0, reservedCount: 1, reserved: [] });
    await ctx.db.insert("AiReservationTable", { reservationId, uid, period: args.period, status: "pending", createdAt: now, expiresAt: now + RESERVATION_TTL_MS });
    return { allowed: true, used: totalUsed, reserved: totalReserved + 1, remaining: Math.max(0, args.limit - totalUsed - totalReserved - 1), reservationId };
  },
});

async function findReservation(ctx: DbCtx, uid: UserId, reservationId: string) {
  return await ctx.db.query("AiReservationTable").withIndex("by_reservationId", (q) => q.eq("reservationId", reservationId)).unique();
}

export const confirmAiGeneration = mutation({
  args: { period: v.string(), reservationId: v.string() },
  handler: async (ctx, args) => {
    const authenticated = await getAuthenticatedUser(ctx);
    if (!authenticated) throw new Error("Authentication required");
    const uid = authenticated.user._id;
    const reservation = await findReservation(ctx, uid, args.reservationId);
    if (!reservation || reservation.period !== args.period) return { confirmed: false };
    if (reservation.status === "confirmed") return { confirmed: true };
    if (reservation.status !== "pending") return { confirmed: false };
    if (reservation.expiresAt <= Date.now()) {
      await ctx.db.patch(reservation._id, { status: "expired" });
      const current = await getUsage(ctx, uid, args.period);
      if (current) await ctx.db.patch(current._id, { reservedCount: Math.max(0, Number(current.reservedCount ?? 0) - 1) });
      return { confirmed: false, expired: true };
    }
    const current = await getUsage(ctx, uid, args.period);
    if (!current) return { confirmed: false };
    await ctx.db.patch(current._id, { generations: Math.max(0, Number(current.generations ?? 0)) + 1, reservedCount: Math.max(0, Number(current.reservedCount ?? 0) - 1) });
    await ctx.db.patch(reservation._id, { status: "confirmed" });
    return { confirmed: true };
  },
});

export const releaseAiGeneration = mutation({
  args: { period: v.string(), reservationId: v.string() },
  handler: async (ctx, args) => {
    const authenticated = await getAuthenticatedUser(ctx);
    if (!authenticated) throw new Error("Authentication required");
    const reservation = await findReservation(ctx, authenticated.user._id, args.reservationId);
    if (!reservation || reservation.period !== args.period) return { released: false };
    if (reservation.status === "released" || reservation.status === "expired") return { released: true };
    if (reservation.status === "confirmed") return { released: false };
    const current = await getUsage(ctx, authenticated.user._id, args.period);
    if (current) await ctx.db.patch(current._id, { reservedCount: Math.max(0, Number(current.reservedCount ?? 0) - 1) });
    await ctx.db.patch(reservation._id, { status: "released" });
    return { released: true };
  },
});

export const getAiUsage = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const authenticated = await getAuthenticatedUser(ctx);
    if (!authenticated) return { used: 0, reserved: 0, period: args.period };
    const { used, reserved } = await getUsageTotals(ctx, authenticated.user, args.period);
    return { used, reserved, period: args.period };
  },
});
