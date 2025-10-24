import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active children (UNIFIED SCHEMA)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db
      .query("children")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    
    // Sort by last name for unified schema
    return children.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

// Get all children (including inactive)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("children").collect();
    return children.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

// Get a single child by ID
export const get = query({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// NOTE: create/update temporarily disabled for unified schema migration
// These will be re-implemented to match the full children schema (firstName, lastName, etc.)

// Deactivate a child (soft delete)
export const deactivate = mutation({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      active: false,
      updatedAt: new Date().toISOString(),
    });
    return args.id;
  },
});
