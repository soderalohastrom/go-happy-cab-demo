import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Find a driver by email and update their Clerk ID
 * Used to link existing driver records to Clerk authentication
 */
export const linkClerkIdByEmail = mutation({
  args: {
    email: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find driver by email
    const driver = await ctx.db
      .query("drivers")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!driver) {
      throw new Error(`No driver found with email: ${args.email}`);
    }

    // Update with Clerk ID
    await ctx.db.patch(driver._id, {
      clerkId: args.clerkUserId,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      driverId: driver._id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      clerkId: args.clerkUserId,
      message: `✅ Linked ${driver.firstName} ${driver.lastName} to Clerk ID: ${args.clerkUserId}`,
    };
  },
});

/**
 * Check if a driver has a Clerk ID linked
 */
export const checkClerkIdByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const driver = await ctx.db
      .query("drivers")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!driver) {
      return {
        found: false,
        message: `No driver found with email: ${args.email}`,
      };
    }

    return {
      found: true,
      driverId: driver._id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      hasClerkId: !!driver.clerkId,
      clerkId: driver.clerkId || null,
      message: driver.clerkId
        ? `✅ ${driver.firstName} ${driver.lastName} has Clerk ID: ${driver.clerkId}`
        : `⚠️ ${driver.firstName} ${driver.lastName} is missing Clerk ID`,
    };
  },
});
