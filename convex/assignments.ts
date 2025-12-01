import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getMessage } from "./localization";

// Helper function to create audit log entries matching unified schema
const createAuditLog = (action: string, resource: string, resourceId: string, details: any, userId?: string) => ({
  logId: `AL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  timestamp: new Date().toISOString(),
  action,
  resource,
  resourceId,
  method: action === "created" ? "CREATE" as const :
    action === "deleted" ? "DELETE" as const :
      action === "updated" ? "UPDATE" as const : "CREATE" as const,
  category: "data_modification" as const,
  severity: "info" as const,
  userId,
  userType: userId === "system" ? "system" as const : "dispatcher" as const,
  details,
  sourceInfo: {
    appVersion: "1.0.0",
    deviceId: "dispatch-app",
  },
  complianceFlags: {
    requiresRetention: true,
    sensitiveData: false,
    regulatoryRelevant: false,
    exportRestricted: false,
    retentionPeriodYears: 7,
  },
});

// Helper to parse date and time into a timestamp
const getScheduledTimestamp = (dateStr: string, timeStr: string): number => {
  try {
    // timeStr format: "8:30 AM" or "14:30"
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  } catch (e) {
    console.error("Error parsing time:", e);
    return 0;
  }
};

// Helper to parse date and time into a timestamp


// Get assignments for a specific date and period
export const getForDatePeriod = query({
  args: {
    date: v.string(),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    const routes = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", args.period)
      )
      .collect();

    // Enrich with child and driver details
    const enriched = await Promise.all(
      routes.map(async (route) => {
        const child = await ctx.db.get(route.childId);
        const driver = await ctx.db.get(route.driverId);

        return {
          ...route,
          childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
          driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Get assignments for a specific date (both AM and PM)
export const getForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    // Get both AM and PM routes for the date
    const amRoutes = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", args.date).eq("period", "AM"))
      .collect();

    const pmRoutes = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", args.date).eq("period", "PM"))
      .collect();

    const assignments = [...amRoutes, ...pmRoutes];

    // Enrich with child and driver details
    const enriched = await Promise.all(
      assignments.map(async (assignment) => {
        const child = await ctx.db.get(assignment.childId);
        const driver = await ctx.db.get(assignment.driverId);

        return {
          ...assignment,
          childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
          driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
        };
      })
    );

    // Group by period
    const grouped = {
      AM: enriched.filter((a) => a.period === "AM"),
      PM: enriched.filter((a) => a.period === "PM"),
    };

    return grouped;
  },
});

// Get assignments for a date range (for calendar view)
export const getForDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allAssignments = await ctx.db.query("routes").collect();

    // Filter by date range
    const filtered = allAssignments.filter(
      (a) => a.date >= args.startDate && a.date <= args.endDate
    );

    // Group by date with counts
    const summary: Record<string, { AM: number; PM: number }> = {};

    filtered.forEach((assignment) => {
      if (!summary[assignment.date]) {
        summary[assignment.date] = { AM: 0, PM: 0 };
      }
      if (assignment.period === "AM") {
        summary[assignment.date].AM++;
      } else if (assignment.period === "PM") {
        summary[assignment.date].PM++;
      }
    });

    return summary;
  },
});

// Get unassigned children for a specific date and period
export const getUnassignedChildren = query({
  args: {
    date: v.string(),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active children
    const allChildren = await ctx.db
      .query("children")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get assignments for this date/period
    const assignments = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", args.period)
      )
      .collect();

    // Find assigned child IDs
    const assignedChildIds = new Set(assignments.map((a) => a.childId));

    // Return unassigned children
    return allChildren.filter((child) => !assignedChildIds.has(child._id));
  },
});

// Get unassigned drivers for a specific date and period
export const getUnassignedDrivers = query({
  args: {
    date: v.string(),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active drivers
    const allDrivers = await ctx.db
      .query("drivers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Get assignments for this date/period
    const assignments = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", args.period)
      )
      .collect();

    // Find assigned driver IDs
    const assignedDriverIds = new Set(assignments.map((a) => a.driverId));

    // Return unassigned drivers
    return allDrivers.filter((driver) => !assignedDriverIds.has(driver._id));
  },
});

export const getRouteCountsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const amRoutes = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", "AM")
      )
      .collect();

    const pmRoutes = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", "PM")
      )
      .collect();

    return {
      amCount: amRoutes.length,
      pmCount: pmRoutes.length,
    };
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    period: v.union(v.literal("AM"), v.literal("PM")),
    childId: v.id("children"),
    driverId: v.id("drivers"),
    status: v.string(),
    user: v.optional(v.string()),
    scheduledTime: v.optional(v.string()), // e.g. "8:30 AM"
    reminderMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check for existing assignment for the child
    const existingChildAssignment = await ctx.db
      .query("routes")
      .withIndex("by_child_date_period", (q) =>
        q.eq("childId", args.childId).eq("date", args.date).eq("period", args.period)
      )
      .first();

    if (existingChildAssignment) {
      throw new Error("Child is already assigned for this period");
    }

    // CARPOOL SUPPORT: Check if driver has reached max carpool size (max 3 children)
    const existingDriverAssignments = await ctx.db
      .query("routes")
      .withIndex("by_driver_date_period", (q) =>
        q.eq("driverId", args.driverId).eq("date", args.date).eq("period", args.period)
      )
      .collect();

    const MAX_CARPOOL_SIZE = 3;
    if (existingDriverAssignments.length >= MAX_CARPOOL_SIZE) {
      throw new Error(`Driver already has ${MAX_CARPOOL_SIZE} children assigned (max carpool size)`);
    }

    const child = await ctx.db.get(args.childId);
    const driver = await ctx.db.get(args.driverId);

    // NON-SCHOOL DAY CHECK: Warn if creating route on a school closure
    // This is a soft validation - allows creation but logs warning
    if (child?.schoolName) {
      const school = await ctx.db
        .query("schools")
        .withIndex("by_school_name", (q) => q.eq("schoolName", child.schoolName))
        .first();

      if (school) {
        const nonSchoolDay = await ctx.db
          .query("nonSchoolDays")
          .withIndex("by_school_date", (q) =>
            q.eq("schoolId", school._id).eq("date", args.date)
          )
          .first();

        if (nonSchoolDay) {
          // Log warning but still allow creation
          // Dispatch may intentionally create routes for special circumstances
          console.warn(
            `WARNING: Route created on non-school day for ${child.firstName} ${child.lastName} ` +
            `at ${school.schoolName} on ${args.date} (${nonSchoolDay.description || "School Closed"})`
          );

          // Create audit log entry for the warning
          await ctx.db.insert("auditLogs", createAuditLog(
            "warning",
            "route",
            "pending",
            {
              description: `Route created on non-school day: ${nonSchoolDay.description || "School Closed"}`,
              date: args.date,
              period: args.period,
              childName: `${child.firstName} ${child.lastName}`,
              schoolName: school.schoolName,
              closureReason: nonSchoolDay.description,
            },
            args.user
          ));
        }
      }
    }

    // Create the assignment
    const assignmentId = await ctx.db.insert("routes", {
      date: args.date,
      period: args.period,
      type: args.period === "AM" ? "pickup" : "dropoff",
      childId: args.childId,
      driverId: args.driverId,
      status: args.status as any, // Cast to any to satisfy union type (validated by schema at runtime)
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: args.user,
      scheduledTime: args.scheduledTime,
    });

    // Create audit log entry
    await ctx.db.insert("auditLogs", createAuditLog(
      "created",
      "route",
      assignmentId,
      {
        description: "Route assignment created",
        date: args.date,
        period: args.period,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      args.user
    ));

    // Create dispatch event for real-time sync to Driver App
    await ctx.db.insert("dispatchEvents", {
      eventId: `DE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: "route_created",
      routeId: assignmentId,
      childId: args.childId,
      driverId: args.driverId,
      eventData: {
        date: args.date,
        period: args.period,
        status: args.status,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      triggerSms: false,
      triggeredBy: args.user || "system",
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // SEND PUSH NOTIFICATION
    if (driver && driver.expoPushToken) {
      const title = getMessage(driver.primaryLanguage, "newRouteTitle");
      const body = getMessage(driver.primaryLanguage, "newRouteBody", args.period, child?.firstName || "Child", args.date);

      await ctx.scheduler.runAfter(0, internal.notifications.sendRouteNotification, {
        expoPushToken: driver.expoPushToken,
        title,
        body,
        data: { routeId: assignmentId },
      });
    }

    // Schedule Reminder if requested and time is available
    // Schedule Reminder if requested and time is available
    if (args.reminderMinutes && args.scheduledTime) {
      const pickupTime = getScheduledTimestamp(args.date, args.scheduledTime);
      if (pickupTime > 0) {
        const reminderTime = pickupTime - (args.reminderMinutes * 60 * 1000);
        const now = Date.now();

        if (reminderTime > now) {
          const reminderId = await ctx.scheduler.runAt(
            reminderTime,
            internal.notifications.sendReminder,
            {
              routeId: assignmentId,
              driverId: args.driverId,
              minutesBefore: args.reminderMinutes,
            }
          );
          // Update route with reminderId
          await ctx.db.patch(assignmentId, { reminderId });
        }
      }
    }

    return assignmentId;
  },
});

// Copy assignments from previous day
export const copyFromPreviousDay = mutation({
  args: { targetDate: v.string() },
  handler: async (ctx, args) => {
    // Get the previous day's date
    const targetDateObj = new Date(args.targetDate);
    targetDateObj.setDate(targetDateObj.getDate() - 1);
    const previousDate = targetDateObj.toISOString().split('T')[0];

    // Get all assignments from previous day (both AM and PM)
    const previousAM = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", previousDate).eq("period", "AM"))
      .collect();

    const previousPM = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", previousDate).eq("period", "PM"))
      .collect();

    const previousAssignments = [...previousAM, ...previousPM];

    if (previousAssignments.length === 0) {
      throw new Error("No assignments found for previous day");
    }

    // Check if target date already has assignments
    const existingAM = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", args.targetDate).eq("period", "AM"))
      .first();

    const existingPM = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) => q.eq("date", args.targetDate).eq("period", "PM"))
      .first();

    if (existingAM || existingPM) {
      throw new Error("This date already has assignments");
    }

    // Copy each assignment to the new date
    let copiedCount = 0;
    for (const assignment of previousAssignments) {
      await ctx.db.insert("routes", {
        date: args.targetDate,
        period: assignment.period,
        type: assignment.period === "AM" ? "pickup" : "dropoff",
        childId: assignment.childId,
        driverId: assignment.driverId,
        status: "scheduled",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      copiedCount++;
    }

    // Create audit log entry
    await ctx.db.insert("auditLogs", createAuditLog(
      "bulk_copied",
      "route",
      `${copiedCount}_routes`,
      {
        description: `Copied ${copiedCount} routes from previous day`,
        date: args.targetDate,
        fromDate: previousDate,
        count: copiedCount.toString(),
      },
      "system"
    ));

    return {
      message: `Successfully copied ${copiedCount} assignments from ${previousDate}`,
      copied: copiedCount,
    };
  },
});

// Delete an assignment
export const remove = mutation({
  args: {
    id: v.id("routes"),
    user: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.id);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Get child and driver names for audit log
    const child = await ctx.db.get(assignment.childId);
    const driver = await ctx.db.get(assignment.driverId);

    // Delete the assignment
    await ctx.db.delete(args.id);

    // Cancel scheduled reminder if exists
    if (assignment.reminderId) {
      try {
        await ctx.scheduler.cancel(assignment.reminderId);
      } catch (e) {
        // Ignore
      }
    }

    // Create audit log entry
    await ctx.db.insert("auditLogs", createAuditLog(
      "deleted",
      "route",
      args.id,
      {
        description: "Route assignment deleted",
        date: assignment.date,
        period: assignment.period,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      args.user
    ));

    // Create dispatch event for real-time sync to Driver App
    await ctx.db.insert("dispatchEvents", {
      eventId: `DE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: "schedule_changed", // route deletion is a schedule change
      routeId: args.id,
      childId: assignment.childId,
      driverId: assignment.driverId,
      eventData: {
        action: "deleted",
        date: assignment.date,
        period: assignment.period,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      triggerSms: false,
      triggeredBy: args.user || "system",
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // SEND PUSH NOTIFICATION
    if (driver && driver.expoPushToken) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendRouteNotification, {
        expoPushToken: driver.expoPushToken,
        title: "Route Cancelled 🚫",
        body: `Your ${assignment.period} route for ${child?.firstName} on ${assignment.date} has been cancelled.`,
        data: { routeId: args.id, type: "cancellation" },
      });
    }

    return args.id;
  },
});

// Update assignment status
export const updateStatus = mutation({
  args: {
    id: v.id("routes"),
    status: v.string(),
    user: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.id);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    await ctx.db.patch(args.id, { status: args.status });

    // Get child and driver names for audit log
    const child = await ctx.db.get(assignment.childId);
    const driver = await ctx.db.get(assignment.driverId);

    // Create audit log entry
    await ctx.db.insert("auditLogs", createAuditLog(
      "updated",
      "route",
      args.id,
      {
        description: "Route assignment updated",
        date: assignment.date,
        period: assignment.period,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      args.user
    ));

    // SEND PUSH NOTIFICATION (only for significant status changes)
    if (driver && driver.expoPushToken && ["cancelled", "emergency_stop", "scheduled"].includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendRouteNotification, {
        expoPushToken: driver.expoPushToken,
        title: "Route Update 🔄",
        body: `Route status updated to: ${args.status.replace('_', ' ').toUpperCase()}`,
        data: { routeId: args.id, status: args.status },
      });
    }

    return args.id;
  },
});

// Copy assignments from one date to another
export const copyFromDate = mutation({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    period: v.optional(v.string()), // If provided, only copy this period
    user: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { fromDate, toDate, period, user } = args;

    // Get source assignments
    let sourceAssignments;
    if (period) {
      sourceAssignments = await ctx.db
        .query("routes")
        .withIndex("by_date_period", (q) =>
          q.eq("date", fromDate).eq("period", period)
        )
        .collect();
    } else {
      // Get both AM and PM routes
      const amRoutes = await ctx.db
        .query("routes")
        .withIndex("by_date_period", (q) => q.eq("date", fromDate).eq("period", "AM"))
        .collect();

      const pmRoutes = await ctx.db
        .query("routes")
        .withIndex("by_date_period", (q) => q.eq("date", fromDate).eq("period", "PM"))
        .collect();

      sourceAssignments = [...amRoutes, ...pmRoutes];
    }

    // Create new assignments for target date
    const newAssignmentIds = await Promise.all(
      sourceAssignments.map(async (source) => {
        // Check if assignment already exists
        const existing = await ctx.db
          .query("routes")
          .withIndex("by_child_date_period", (q) =>
            q.eq("childId", source.childId).eq("date", toDate).eq("period", source.period)
          )
          .first();

        if (!existing) {
          const child = await ctx.db.get(source.childId);
          const driver = await ctx.db.get(source.driverId);

          const newId = await ctx.db.insert("routes", {
            date: toDate,
            period: source.period,
            type: source.period === "AM" ? "pickup" : "dropoff",
            childId: source.childId,
            driverId: source.driverId,
            status: "scheduled",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user,
          });

          // Create audit log
          await ctx.db.insert("auditLogs", createAuditLog(
            "created",
            "route",
            newId,
            {
              description: "Route assignment created via copy",
              date: toDate,
              period: source.period,
              childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
              driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
            },
            user
          ));

          return newId;
        }
        return null;
      })
    );

    return newAssignmentIds.filter((id) => id !== null);
  },
});


export const scheduleReminder = mutation({
  args: {
    routeId: v.id("routes"),
    minutesBefore: v.number(),
  },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");

    if (!route.scheduledTime) {
      console.log("Cannot schedule reminder: No scheduled time set for route");
      return;
    }

    const pickupTime = getScheduledTimestamp(route.date, route.scheduledTime);
    if (pickupTime === 0) return;

    const reminderTime = pickupTime - (args.minutesBefore * 60 * 1000);
    const now = Date.now();

    if (reminderTime <= now) {
      console.log("Reminder time is in the past, skipping scheduling");
      return;
    }

    // Cancel existing reminder if any
    if (route.reminderId) {
      try {
        await ctx.scheduler.cancel(route.reminderId);
      } catch (e) {
        // Ignore if already executed or not found
      }
    }

    // Schedule new reminder
    const reminderId = await ctx.scheduler.runAt(
      reminderTime,
      internal.notifications.sendReminder,
      {
        routeId: args.routeId,
        driverId: route.driverId,
        minutesBefore: args.minutesBefore,
      }
    );

    // Update route with reminderId
    await ctx.db.patch(args.routeId, { reminderId });

    return reminderId;
  },
});
