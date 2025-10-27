import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Payroll Configuration Management
 *
 * Manages pay rates and deductions for the payroll reporting system.
 * Default values are placeholder amounts that can be adjusted by admins.
 */

/**
 * Get the current payroll configuration.
 * If no config exists, returns default values.
 */
export const getPayrollConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("payrollConfig").first();

    if (!config) {
      // Return default values if no config exists yet
      return {
        baseRate: 30, // $30 per completed trip (placeholder)
        noShowDeduction: 5, // -$5 for no-show trips
        preCancelDeduction: 10, // -$10 for pre-cancelled trips
      };
    }

    return {
      baseRate: config.baseRate,
      noShowDeduction: config.noShowDeduction,
      preCancelDeduction: config.preCancelDeduction,
    };
  },
});

/**
 * Update payroll configuration.
 * Creates initial config if none exists.
 *
 * TODO: Add admin authentication check when auth is implemented
 */
export const updatePayrollConfig = mutation({
  args: {
    baseRate: v.number(),
    noShowDeduction: v.number(),
    preCancelDeduction: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Verify user is admin/dispatcher before allowing update
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Authentication required");

    const existingConfig = await ctx.db.query("payrollConfig").first();

    const configData = {
      baseRate: args.baseRate,
      noShowDeduction: args.noShowDeduction,
      preCancelDeduction: args.preCancelDeduction,
      updatedAt: new Date().toISOString(),
      updatedBy: "system", // TODO: Use Clerk user ID when auth is implemented
    };

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, configData);
      return { success: true, message: "Payroll config updated" };
    } else {
      // Create initial config
      await ctx.db.insert("payrollConfig", configData);
      return { success: true, message: "Payroll config created" };
    }
  },
});

/**
 * Initialize default payroll configuration.
 * Safe to call multiple times - only creates if no config exists.
 */
export const initializePayrollConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const existingConfig = await ctx.db.query("payrollConfig").first();

    if (existingConfig) {
      return {
        success: true,
        message: "Config already exists",
        alreadyExists: true
      };
    }

    await ctx.db.insert("payrollConfig", {
      baseRate: 30,
      noShowDeduction: 5,
      preCancelDeduction: 10,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    });

    return {
      success: true,
      message: "Default payroll config initialized",
      alreadyExists: false
    };
  },
});
