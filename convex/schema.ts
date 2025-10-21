import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Master list of children
  children: defineTable({
    name: v.string(),
    active: v.boolean(),
    metadata: v.optional(
      v.object({
        parentContact: v.optional(v.string()),
        address: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  }).index("by_active", ["active"]),

  // Master list of drivers
  drivers: defineTable({
    name: v.string(),
    active: v.boolean(),
    metadata: v.optional(
      v.object({
        phone: v.optional(v.string()),
        vehicle: v.optional(v.string()),
        capacity: v.optional(v.number()),
      })
    ),
  }).index("by_active", ["active"]),

  // Date-specific assignments (child-driver pairings)
  assignments: defineTable({
    date: v.string(), // ISO date string "2025-10-21"
    period: v.string(), // "AM" or "PM"
    childId: v.id("children"),
    driverId: v.id("drivers"),
    status: v.string(), // "scheduled", "completed", "cancelled"
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_date_period", ["date", "period"])
    .index("by_child", ["childId"])
    .index("by_driver", ["driverId"])
    .index("by_date_period_child", ["date", "period", "childId"])
    .index("by_date_period_driver", ["date", "period", "driverId"]),

  // Audit log for tracking changes
  auditLog: defineTable({
    timestamp: v.number(),
    action: v.string(), // "created", "updated", "deleted"
    entityType: v.string(), // "assignment", "child", "driver"
    entityId: v.string(),
    details: v.object({
      date: v.optional(v.string()),
      period: v.optional(v.string()),
      childName: v.optional(v.string()),
      driverName: v.optional(v.string()),
    }),
    user: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),
});
