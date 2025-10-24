import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to create audit log entries (matching unified schema)
const createAuditLog = (action: string, resource: string, resourceId: string, details: any, userId?: string) => ({
  logId: `AL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  timestamp: new Date().toISOString(),
  action,
  resource,
  resourceId,
  method: action === "created" ? "CREATE" as const : 
          action === "deleted" ? "DELETE" as const : 
          action === "updated" ? "UPDATE" as const : "UPDATE" as const,
  category: "data_modification" as const,
  severity: "info" as const,
  userId,
  userType: userId ? "driver" as const : "system" as const,
  details,
  sourceInfo: {
    appVersion: "1.0.0",
    deviceId: "driver-app",
  },
  complianceFlags: {
    requiresRetention: true,
    sensitiveData: false,
    regulatoryRelevant: false,
    exportRestricted: false,
    retentionPeriodYears: 7,
  },
});

// Helper function to create dispatch events (matching unified schema)
const createDispatchEvent = (
  type: "child_picked_up" | "child_no_show" | "child_pre_cancel",
  routeId: string,
  childId: string,
  driverId: string,
  eventData: any
) => ({
  eventId: `DE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  type,
  routeId,
  childId,
  driverId,
  eventData,
  triggerSms: false, // Can be enhanced later for SMS integration
  triggeredBy: driverId,
  timestamp: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});

/**
 * Driver marks child as picked up successfully
 * 
 * Updates route status to "completed", creates audit log, and fires dispatch event
 * for real-time sync to Dispatch App.
 */
export const updatePickupStatus = mutation({
  args: { 
    routeId: v.id("routes"),
    driverId: v.id("drivers"),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing route
    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error(`Route ${args.routeId} not found`);
    }

    // Get driver and child for names
    const driver = await ctx.db.get(args.driverId);
    const child = await ctx.db.get(route.childId);

    // Update route status
    await ctx.db.patch(args.routeId, {
      status: "completed",
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", createAuditLog(
      "updated",
      "route",
      args.routeId,
      {
        description: `Driver marked pickup as completed (${route.status} → completed)`,
        oldValues: route.status,
        newValues: "completed",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        date: route.date,
        period: route.period,
      },
      args.driverId
    ));

    // Create dispatch event for real-time sync
    await ctx.db.insert("dispatchEvents", createDispatchEvent(
      "child_picked_up",
      args.routeId,
      route.childId,
      args.driverId,
      {
        previousStatus: route.status,
        newStatus: "completed",
        pickupTime: args.timestamp,
        date: route.date,
        period: route.period,
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
      }
    ));

    // Return updated route data for optimistic UI updates
    return {
      success: true,
      routeId: args.routeId,
      status: "completed",
      updatedAt: new Date().toISOString(),
    };
  },
});

/**
 * Driver reports child was not present at pickup location
 * 
 * Updates route status to "no_show", creates audit log with reason, and fires dispatch event.
 */
export const updateNoShowStatus = mutation({
  args: { 
    routeId: v.id("routes"),
    driverId: v.id("drivers"),
    reason: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing route
    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error(`Route ${args.routeId} not found`);
    }

    // Get driver and child for names
    const driver = await ctx.db.get(args.driverId);
    const child = await ctx.db.get(route.childId);

    // Update route status
    await ctx.db.patch(args.routeId, {
      status: "no_show",
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", createAuditLog(
      "updated",
      "route",
      args.routeId,
      {
        description: `Driver reported no-show: ${args.reason || "Child not present at pickup location"} (${route.status} → no_show)`,
        oldValues: route.status,
        newValues: "no_show",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        date: route.date,
        period: route.period,
      },
      args.driverId
    ));

    // Create dispatch event for real-time sync
    await ctx.db.insert("dispatchEvents", createDispatchEvent(
      "child_no_show",
      args.routeId,
      route.childId,
      args.driverId,
      {
        previousStatus: route.status,
        newStatus: "no_show",
        reason: args.reason || "Child not present at pickup location",
        timestamp: args.timestamp,
        date: route.date,
        period: route.period,
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
      }
    ));

    // Return updated route data
    return {
      success: true,
      routeId: args.routeId,
      status: "no_show",
      updatedAt: new Date().toISOString(),
    };
  },
});

/**
 * Driver acknowledges parent gave advance notice of cancellation
 * 
 * Updates route status to "cancelled", creates audit log with notice time, and fires dispatch event.
 */
export const updatePreCancelStatus = mutation({
  args: { 
    routeId: v.id("routes"),
    driverId: v.id("drivers"),
    noticeTime: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing route
    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error(`Route ${args.routeId} not found`);
    }

    // Get driver and child for names
    const driver = await ctx.db.get(args.driverId);
    const child = await ctx.db.get(route.childId);

    // Update route status
    await ctx.db.patch(args.routeId, {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", createAuditLog(
      "updated",
      "route",
      args.routeId,
      {
        description: `Driver acknowledged pre-cancellation by parent (notice: ${args.noticeTime}) (${route.status} → cancelled)`,
        oldValues: route.status,
        newValues: "cancelled",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        date: route.date,
        period: route.period,
      },
      args.driverId
    ));

    // Create dispatch event for real-time sync
    await ctx.db.insert("dispatchEvents", createDispatchEvent(
      "child_pre_cancel",
      args.routeId,
      route.childId,
      args.driverId,
      {
        previousStatus: route.status,
        newStatus: "cancelled",
        noticeTime: args.noticeTime,
        timestamp: args.timestamp,
        date: route.date,
        period: route.period,
        childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
      }
    ));

    // Return updated route data
    return {
      success: true,
      routeId: args.routeId,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };
  },
});

