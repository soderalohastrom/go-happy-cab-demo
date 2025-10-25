import { query, internalMutation, action } from "./_generated/server";
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
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
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
        // You can set a temporary password or let Clerk handle the invitation flow
        skip_password_checks: true, 
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
