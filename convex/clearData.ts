import { mutation } from "./_generated/server";

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all assignments
    const assignments = await ctx.db.query("assignments").collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete all children
    const children = await ctx.db.query("children").collect();
    for (const child of children) {
      await ctx.db.delete(child._id);
    }

    // Delete all drivers
    const drivers = await ctx.db.query("drivers").collect();
    for (const driver of drivers) {
      await ctx.db.delete(driver._id);
    }

    return {
      message: "All data cleared",
      assignmentsDeleted: assignments.length,
      childrenDeleted: children.length,
      driversDeleted: drivers.length,
    };
  },
});