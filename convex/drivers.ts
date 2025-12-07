import { query, internalMutation, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

/**
 * Creates a new driver record in the database.
 * This is an internal mutation that should only be called by the `addDriver` action.
 */
export const create = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    clerkId: v.string(),
    status: v.string(), // e.g., "active", "inactive"
  },
  handler: async (ctx, args) => {
    // Logic to create a unique employeeId can be added here if needed
    const employeeId = `D-${String(Date.now()).slice(-6)}`;

    await ctx.db.insert("drivers", {
      ...args,
      employeeId,
      role: "driver",
      active: args.status === "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Action to add a new driver.
 * 1. Creates a user in Clerk via the Backend API.
 * 2. Creates a corresponding driver record in the Convex database.
 */
export const addDriver = action({
  args: {
    employeeId: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    primaryLanguage: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      street2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
    startDate: v.optional(v.string()),
    availabilityAM: v.optional(v.string()),
    availabilityPM: v.optional(v.string()),
    specialEquipment: v.optional(v.string()),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY environment variable not set.");
    }

    // 1. Call Clerk API to create the user
    const clerkUserResponse = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [args.email],
        phone_number: [args.phone],
        first_name: args.firstName,
        last_name: args.lastName,
        // Generate a temporary password to meet Clerk's requirements
        password: `!Temp${Date.now()}${Math.random().toString(36).slice(-4)}`,
        skip_password_notification: true, // Don't email them the temp password
      }),
    });

    if (!clerkUserResponse.ok) {
      const errorBody = await clerkUserResponse.text();
      throw new Error(`Failed to create Clerk user: ${errorBody}`);
    }

    const clerkUser = await clerkUserResponse.json();
    const clerkId = clerkUser.id;

    if (!clerkId) {
      throw new Error("Failed to get clerkId from Clerk API response.");
    }

    // 2. Create the driver in Convex with the new clerkId
    await ctx.runMutation(internal.drivers.create, {
      ...args,
      clerkId,
      status: 'active', // Default status for new drivers
    });

    return { success: true, clerkId };
  },
});

/**
 * Deactivates a driver in Convex (soft delete).
 * Note: This does not delete the user from Clerk.
 */
export const deactivate = internalMutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false, status: "inactive" });
  },
});

/**
 * Reactivates a driver in Convex.
 */
export const reactivate = internalMutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: true, status: "active" });
  },
});

/**
 * Updates an existing driver record.
 * All fields except id are optional - only provided fields will be updated.
 */
export const update = internalMutation({
  args: {
    id: v.id("drivers"),
    employeeId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      street2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
    startDate: v.optional(v.string()),
    availabilityAM: v.optional(v.string()),
    availabilityPM: v.optional(v.string()),
    specialEquipment: v.optional(v.string()),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    // New fields from Google Sheets import
    dateOfBirth: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseExpiry: v.optional(v.string()),
    licenseStateOfIssue: v.optional(v.string()),
    licenseZipCode: v.optional(v.string()),
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

// Get a single driver by ID
export const get = query({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getById = internalQuery({
  args: { driverId: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.driverId);
  },
});

// Get driver by Clerk user ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drivers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// NOTE: create/update temporarily disabled for unified schema migration
// These will be re-implemented to match the full drivers schema (firstName, lastName, employeeId, etc.)

/**
 * Updates the Expo Push Token for a driver.
 * Used by the Driver App to register for push notifications.
 */
export const updatePushToken = mutation({
  args: {
    clerkId: v.string(),
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!driver) {
      throw new Error("Driver not found");
    }

    await ctx.db.patch(driver._id, {
      expoPushToken: args.expoPushToken,
      updatedAt: new Date().toISOString(),
    });

    return driver._id;
  },
});

/**
 * Toggle On Hold status for a driver.
 * When on hold, driver is hidden from dispatch assignment pool but remains visible in Drivers tab.
 */
export const toggleOnHold = mutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    const driver = await ctx.db.get(args.id);
    if (!driver) {
      throw new Error("Driver not found");
    }

    const newOnHoldStatus = !driver.onHold;

    await ctx.db.patch(args.id, {
      onHold: newOnHoldStatus,
      onHoldSince: newOnHoldStatus ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });

    return {
      id: args.id,
      onHold: newOnHoldStatus,
      message: newOnHoldStatus
        ? `${driver.firstName} ${driver.lastName} is now on hold`
        : `${driver.firstName} ${driver.lastName} is now active`,
    };
  },
});
