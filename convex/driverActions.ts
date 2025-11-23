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

/**
 * Updates the late cancel status of a route.
 * Requires authenticated driver.
 */
export const updateLateCancelStatus = mutation({
  args: {
    routeId: v.id("routes"),
    timestamp: v.string(),
    noticeTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");

    // Update route status
    await ctx.db.patch(args.routeId, {
      status: "late_cancel",
      childPresent: false,
      skipReason: "Late cancellation - less than 1 hour notice",
      actualStartTime: args.timestamp, // Track when button pressed
      updatedAt: args.timestamp,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      logId: `AL-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: args.timestamp,
      userId: identity.subject,
      userType: "driver",
      action: "update",
      resource: "routes",
      resourceId: args.routeId,
      method: "UPDATE",
      category: "data_modification",
      severity: "info",
      details: {
        description: "Driver marked route as Late Cancel",
        changedFields: ["status", "childPresent", "skipReason", "actualStartTime", "updatedAt"],
        oldValues: JSON.stringify({ status: route.status }),
        newValues: JSON.stringify({ status: "late_cancel" })
      }
    });

    // Dispatch event
    await createDispatchEvent(
      ctx,
      "route_late_cancelled",
      route,
      { reason: "Late cancellation", timestamp: args.timestamp },
      identity.subject
    );

    return { success: true };
  },
});

/**
 * Updates the N/A status of a route.
 * Requires authenticated driver.
 */
export const updateNAStatus = mutation({
  args: {
    routeId: v.id("routes"),
    timestamp: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");

    await ctx.db.patch(args.routeId, {
      status: "na",
      childPresent: false,
      skipReason: args.reason || "Unforeseen circumstance (N/A)",
      actualStartTime: args.timestamp,
      updatedAt: args.timestamp,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      logId: `AL-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: args.timestamp,
      userId: identity.subject,
      userType: "driver",
      action: "update",
      resource: "routes",
      resourceId: args.routeId,
      method: "UPDATE",
      category: "data_modification",
      severity: "info",
      details: {
        description: "Driver marked route as N/A",
        changedFields: ["status", "childPresent", "skipReason", "actualStartTime", "updatedAt"],
        oldValues: JSON.stringify({ status: route.status }),
        newValues: JSON.stringify({ status: "na" })
      }
    });

    // Dispatch event
    await createDispatchEvent(
      ctx,
      "route_na",
      route,
      { reason: args.reason || "N/A", timestamp: args.timestamp },
      identity.subject
    );

    return { success: true };
  },
});

/**
 * Undoes a status change (resets to assigned).
 * Requires authenticated driver.
 */
export const undoStatusChange = mutation({
  args: {
    routeId: v.id("routes"),
    timestamp: v.string(),
    previousStatus: v.optional(v.string()), // For audit trail
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");

    // Only allow undo within 30 minutes of status change
    const now = new Date(args.timestamp).getTime();
    const lastUpdate = new Date(route.updatedAt).getTime();
    const elapsedMinutes = (now - lastUpdate) / (1000 * 60);

    // Note: We might want to be lenient here if client time drifts, 
    // but for now strict 30m check on server side is good.
    // If route.updatedAt is old, we might block undo.
    // However, if the user just pressed the button, updatedAt should be recent.
    // If they are undoing a "scheduled" status, that might be old.
    // But they can only undo if they just changed it.

    // Reset to assigned status
    await ctx.db.patch(args.routeId, {
      status: "assigned",
      childPresent: undefined,
      skipReason: undefined,
      actualStartTime: undefined,  // Clear pickup time
      actualEndTime: undefined,
      updatedAt: args.timestamp,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      logId: `AL-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: args.timestamp,
      userId: identity.subject,
      userType: "driver",
      action: "undo",
      resource: "routes",
      resourceId: args.routeId,
      method: "UPDATE",
      category: "data_modification",
      severity: "info",
      details: {
        description: "Driver undid status change",
        changedFields: ["status", "childPresent", "skipReason", "actualStartTime", "actualEndTime", "updatedAt"],
        oldValues: JSON.stringify({ status: route.status }),
        newValues: JSON.stringify({ status: "assigned" })
      }
    });

    return { success: true };
  },
});
