import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  },
});

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

// Create a new assignment
export const create = mutation({
  args: {
    date: v.string(),
    period: v.string(),
    childId: v.id("children"),
    driverId: v.id("drivers"),
    status: v.optional(v.string()),
    user: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { date, period, childId, driverId, status = "scheduled", user } = args;

    // Check if child is already assigned for this date/period
    const existingChildAssignment = await ctx.db
      .query("routes")
      .withIndex("by_date_period_child", (q) =>
        q.eq("date", date).eq("period", period).eq("childId", childId)
      )
      .first();

    if (existingChildAssignment) {
      throw new Error("Child is already assigned for this period");
    }

    // Check if driver is already assigned for this date/period
    const existingDriverAssignment = await ctx.db
      .query("routes")
      .withIndex("by_date_period_driver", (q) =>
        q.eq("date", date).eq("period", period).eq("driverId", driverId)
      )
      .first();

    if (existingDriverAssignment) {
      throw new Error("Driver is already assigned for this period");
    }

    // Get child and driver names for audit log
    const child = await ctx.db.get(childId);
    const driver = await ctx.db.get(driverId);

    // Create the assignment
    const assignmentId = await ctx.db.insert("routes", {
      date,
      period,
      type: period === "AM" ? "pickup" : "dropoff",
      childId,
      driverId,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user,
    });

    // Create audit log entry
    await ctx.db.insert("auditLogs", createAuditLog(
      "created",
      "route",
      assignmentId,
      {
        description: "Route assignment created",
        date,
        period,
        childName: `${child?.firstName || ""} ${child?.lastName || "Unknown"}`.trim(),
        driverName: `${driver?.firstName || ""} ${driver?.lastName || "Unknown"}`.trim(),
      },
      user
    ));

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
          .withIndex("by_date_period_child", (q) =>
            q.eq("date", toDate).eq("period", source.period).eq("childId", source.childId)
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
