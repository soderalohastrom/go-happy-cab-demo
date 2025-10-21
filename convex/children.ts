import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active children
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("children")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("asc")
      .collect();
  },
});

// Get all children (including inactive)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("children").order("asc").collect();
  },
});

// Get a single child by ID
export const get = query({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new child
export const create = mutation({
  args: {
    name: v.string(),
    parentContact: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { name, parentContact, address, notes } = args;

    const childId = await ctx.db.insert("children", {
      name,
      active: true,
      metadata: {
        parentContact,
        address,
        notes,
      },
    });

    return childId;
  },
});

// Update a child
export const update = mutation({
  args: {
    id: v.id("children"),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
    parentContact: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, name, active, parentContact, address, notes } = args;
    const existing = await ctx.db.get(id);

    if (!existing) {
      throw new Error("Child not found");
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (active !== undefined) updates.active = active;

    if (parentContact !== undefined || address !== undefined || notes !== undefined) {
      updates.metadata = {
        ...existing.metadata,
        ...(parentContact !== undefined && { parentContact }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
      };
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Deactivate a child (soft delete)
export const deactivate = mutation({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
    return args.id;
  },
});
