import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const CreateNewUser = mutation({
  args: {
    name: v.string(),
    imageUrl: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject?.trim();
    const authenticatedEmail = identity?.email?.trim().toLowerCase();

    if (!clerkId) {
      throw new Error("Authentication required");
    }

    const requestedEmail = args.email.trim().toLowerCase();
    if (requestedEmail && authenticatedEmail && requestedEmail !== authenticatedEmail) {
      throw new Error("You can only create or update your own profile");
    }

    let existingUser = await ctx.db
      .query("UserTable")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    // Compatibility is limited to a single legacy profile without a Clerk ID.
    // Never rebind a profile that is already associated with another Clerk account.
    if (!existingUser && authenticatedEmail) {
      const legacyUsers = await ctx.db
        .query("UserTable")
        .withIndex("by_email", (q) => q.eq("email", authenticatedEmail))
        .collect();
      const legacyMatches = legacyUsers.filter((candidate) => !candidate.clerkId);
      if (legacyMatches.length === 1) existingUser = legacyMatches[0];
    }

    const userData = {
      name: args.name.trim() || "Trip Planner User",
      imageUrl: args.imageUrl.trim(),
      email: authenticatedEmail ?? requestedEmail,
      clerkId,
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
      return { ...existingUser, ...userData };
    }

    const _id = await ctx.db.insert("UserTable", userData);
    return await ctx.db.get(_id);
  },
});
