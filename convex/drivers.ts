import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active drivers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("drivers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("asc")
      .collect();
  },
});

// Get all drivers (including inactive)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("drivers").order("asc").collect();
  },
});

// Get a single driver by ID
export const get = query({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new driver
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    vehicle: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { name, phone, vehicle, capacity } = args;

    const driverId = await ctx.db.insert("drivers", {
      name,
      active: true,
      metadata: {
        phone,
        vehicle,
        capacity,
      },
    });

    return driverId;
  },
});

// Update a driver
export const update = mutation({
  args: {
    id: v.id("drivers"),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    vehicle: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, name, active, phone, vehicle, capacity } = args;
    const existing = await ctx.db.get(id);

    if (!existing) {
      throw new Error("Driver not found");
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (active !== undefined) updates.active = active;

    if (phone !== undefined || vehicle !== undefined || capacity !== undefined) {
      updates.metadata = {
        ...existing.metadata,
        ...(phone !== undefined && { phone }),
        ...(vehicle !== undefined && { vehicle }),
        ...(capacity !== undefined && { capacity }),
      };
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Deactivate a driver (soft delete)
export const deactivate = mutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
    return args.id;
  },
});
