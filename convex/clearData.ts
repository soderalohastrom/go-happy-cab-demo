import { mutation } from "./_generated/server";

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all routes (unified schema uses "routes" not "assignments")
    const routes = await ctx.db.query("routes").collect();
    for (const route of routes) {
      await ctx.db.delete(route._id);
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

    // Delete all audit logs
    const auditLogs = await ctx.db.query("auditLogs").collect();
    for (const log of auditLogs) {
      await ctx.db.delete(log._id);
    }

    return {
      message: "All data cleared",
      routesDeleted: routes.length,
      childrenDeleted: children.length,
      driversDeleted: drivers.length,
      auditLogsDeleted: auditLogs.length,
    };
  },
});