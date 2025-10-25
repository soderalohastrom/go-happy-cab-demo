import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Helper function to create a dispatch event
 */
const createDispatchEvent = async (
  ctx: any,
  type: string,
  route: any,
  eventData: any,
  triggeredBy: string,
) => {
  const eventId = `DE-${new Date().toISOString()}-${Math.random().toString(36).slice(-6)}`;
  await ctx.db.insert("dispatchEvents", {
    eventId,
    type,
    routeId: route._id,
    childId: route.childId,
    driverId: route.driverId,
    eventData,
    triggerSms: false,
    triggeredBy,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
};

/**
 * Updates the pickup status of a route.
 * Requires authenticated driver.
 */
export const updatePickupStatus = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required: No user identity found.");
    }

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!driver) {
      throw new Error("Authenticated user is not a registered driver.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error("Route not found");
    }

    await ctx.db.patch(args.routeId, {
      status: "completed",
      childPresent: true,
      updatedAt: new Date().toISOString(),
    });

    await createDispatchEvent(
      ctx,
      "child_picked_up",
      route,
      { status: "completed", driverNotes: "Child picked up successfully." },
      driver.clerkId || "unknown_driver"
    );

    return { success: true };
  },
});

/**
 * Updates the no-show status of a route.
 * Requires authenticated driver.
 */
export const updateNoShowStatus = mutation({
  args: { routeId: v.id("routes"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!driver) {
      throw new Error("Authenticated user is not a registered driver.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error("Route not found");
    }

    await ctx.db.patch(args.routeId, {
      status: "no_show",
      childPresent: false,
      skipReason: args.reason || "Child was not present at pickup.",
      updatedAt: new Date().toISOString(),
    });

    await createDispatchEvent(
      ctx,
      "child_no_show",
      route,
      { status: "no_show", driverNotes: args.reason || "Child was not present at pickup." },
      driver.clerkId || "unknown_driver"
    );

    return { success: true };
  },
});

/**
 * Updates the pre-cancel status of a route.
 * Requires authenticated driver.
 */
export const updatePreCancelStatus = mutation({
  args: { routeId: v.id("routes"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!driver) {
      throw new Error("Authenticated user is not a registered driver.");
    }

    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error("Route not found");
    }
    
    await ctx.db.patch(args.routeId, {
      status: "cancelled",
      skipReason: args.reason || "Pre-cancelled by parent/guardian.",
      updatedAt: new Date().toISOString(),
    });

    await createDispatchEvent(
      ctx,
      "child_pre_cancel",
      route,
      { status: "cancelled", driverNotes: args.reason || "Pre-cancelled by parent/guardian." },
      driver.clerkId || "unknown_driver"
    );

    return { success: true };
  },
});

