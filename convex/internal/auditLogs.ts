import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation for creating audit log entries
 * Compatible with unified schema (Driver + Dispatch apps)
 *
 * Used for PAYROLL_EXPORT and other sensitive operations
 */
export const create = internalMutation({
  args: {
    action: v.string(), // "PAYROLL_EXPORT", "created", "updated", etc.
    resource: v.string(), // "payroll", "route", "assignment", etc.
    resourceId: v.optional(v.string()),
    userType: v.union(
      v.literal("driver"),
      v.literal("supervisor"),
      v.literal("admin"),
      v.literal("dispatcher"),
      v.literal("system")
    ),
    userId: v.optional(v.string()),
    category: v.union(
      v.literal("authentication"),
      v.literal("authorization"),
      v.literal("data_access"),
      v.literal("data_modification"),
      v.literal("system_administration"),
      v.literal("emergency_access")
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("critical")
    ),
    description: v.string(),
    details: v.optional(v.any()),
    complianceFlags: v.optional(v.object({
      requiresRetention: v.boolean(),
      sensitiveData: v.boolean(),
      regulatoryRelevant: v.boolean(),
      exportRestricted: v.optional(v.boolean()),
      retentionPeriodYears: v.optional(v.float64()),
    })),
  },
  handler: async (ctx, args) => {
    // Generate unique log ID: AL-YYYYMMDD-NNNNNN
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const logId = `AL-${dateStr}-${randomNum}`;

    await ctx.db.insert("auditLogs", {
      logId,
      timestamp: now.toISOString(),
      userId: args.userId,
      userType: args.userType,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      method: "CREATE", // Default method for exports
      category: args.category,
      severity: args.severity,
      details: {
        description: args.description,
        ...args.details,
      },
      complianceFlags: args.complianceFlags || {
        requiresRetention: true,
        sensitiveData: true,
        regulatoryRelevant: true,
      },
    });

    return { logId, timestamp: now.toISOString() };
  },
});
