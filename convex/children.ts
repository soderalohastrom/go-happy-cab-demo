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

// Get a single child by ID (alternative naming for Driver App compatibility)
export const getById = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.childId);
  },
});

/**
 * Create a new child record in the database.
 * Simplified mutation for Children management screen.
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    grade: v.string(),
    schoolName: v.string(),
    dateOfBirth: v.optional(v.string()),
    homeLanguage: v.optional(v.string()),
    rideType: v.optional(v.string()),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate studentId if not provided
    const studentId = args.studentId || `S-${String(Date.now()).slice(-6)}`;

    // Default dateOfBirth if not provided (for schema compliance)
    const dateOfBirth = args.dateOfBirth || "2010-01-01";

    await ctx.db.insert("children", {
      firstName: args.firstName,
      lastName: args.lastName,
      grade: args.grade,
      schoolName: args.schoolName,
      dateOfBirth,
      studentId,
      homeLanguage: args.homeLanguage,
      rideType: args.rideType,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, studentId };
  },
});

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

/**
 * Reactivate a child (restore from soft delete).
 */
export const reactivate = mutation({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      active: true,
      updatedAt: new Date().toISOString(),
    });
    return args.id;
  },
});

/**
 * Update an existing child record.
 * All fields except id are optional - only provided fields will be updated.
 */
export const update = mutation({
  args: {
    id: v.id("children"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    grade: v.optional(v.string()),
    schoolId: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    homeLanguage: v.optional(v.string()),
    rideType: v.optional(v.string()),
    studentId: v.optional(v.string()),
    parent1: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),
    parent2: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),
    teacher: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.optional(v.string()),
    })),
    caseManager: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
    })),
    seizureProtocol: v.optional(v.boolean()),
    boosterSeat: v.optional(v.boolean()),
    specialNeeds: v.optional(v.string()),
    notes: v.optional(v.string()),
    defaultAmDriverId: v.optional(v.id("drivers")),
    defaultPmDriverId: v.optional(v.id("drivers")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    // Always update the timestamp
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});
