import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active drivers (UNIFIED SCHEMA)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db
      .query("drivers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    
    // Sort by last name for unified schema
    return drivers.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

// Get all drivers (including inactive)
export const listAll = query({
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

// NOTE: create/update temporarily disabled for unified schema migration
// These will be re-implemented to match the full drivers schema (firstName, lastName, employeeId, etc.)

// Deactivate a driver (soft delete)
export const deactivate = mutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      active: false,
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });
    return args.id;
  },
});
