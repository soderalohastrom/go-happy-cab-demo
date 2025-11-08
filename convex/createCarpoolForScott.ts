import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a carpool with Aiden, Logan, and Lucas for Scott for Nov 2, 2025
 */
export const createNov2CarpoolPM = mutation({
  args: {},
  handler: async (ctx) => {
    const today = "2025-11-02";

    // Find Scott (D100 - created by setupScott)
    const scott = await ctx.db
      .query("drivers")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), "Scott"),
          q.eq(q.field("lastName"), "Soderstrom"),
          q.eq(q.field("employeeId"), "D100")
        )
      )
      .first();

    if (!scott) {
      throw new Error("Scott Soderstrom (D100) not found");
    }

    // Find the three children
    const aiden = await ctx.db
      .query("children")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), "Aiden"),
          q.eq(q.field("lastName"), "Green")
        )
      )
      .first();

    const logan = await ctx.db
      .query("children")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), "Logan"),
          q.eq(q.field("lastName"), "Adams")
        )
      )
      .first();

    const lucas = await ctx.db
      .query("children")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), "Lucas"),
          q.eq(q.field("lastName"), "Young")
        )
      )
      .first();

    if (!aiden || !logan || !lucas) {
      throw new Error(
        `Missing children: ${!aiden ? "Aiden " : ""}${!logan ? "Logan " : ""}${
          !lucas ? "Lucas" : ""
        }`
      );
    }

    // Create three routes (one per child) - all same driver/date/period = carpool!
    const routes = [];

    // Route 1: Aiden
    const route1 = await ctx.db.insert("routes", {
      date: today,
      period: "PM",
      type: "pickup",
      driverId: scott._id,
      childId: aiden._id,
      status: "assigned",
      scheduledTime: "2:30 PM",
      priority: "normal",
      createdBy: "test-script",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    routes.push(route1);

    // Route 2: Logan
    const route2 = await ctx.db.insert("routes", {
      date: today,
      period: "PM",
      type: "pickup",
      driverId: scott._id,
      childId: logan._id,
      status: "assigned",
      scheduledTime: "2:35 PM",
      priority: "normal",
      createdBy: "test-script",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    routes.push(route2);

    // Route 3: Lucas
    const route3 = await ctx.db.insert("routes", {
      date: today,
      period: "PM",
      type: "pickup",
      driverId: scott._id,
      childId: lucas._id,
      status: "assigned",
      scheduledTime: "2:40 PM",
      priority: "normal",
      createdBy: "test-script",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    routes.push(route3);

    return {
      success: true,
      message: `✅ Created carpool for Scott Soderstrom with 3 children for Nov 2, 2025!`,
      driver: {
        id: scott._id,
        name: `${scott.firstName} ${scott.lastName}`,
        employeeId: scott.employeeId,
      },
      children: [
        { id: aiden._id, name: `${aiden.firstName} ${aiden.lastName}` },
        { id: logan._id, name: `${logan.firstName} ${logan.lastName}` },
        { id: lucas._id, name: `${lucas.firstName} ${lucas.lastName}` },
      ],
      routes: routes,
      date: today,
      period: "PM",
    };
  },
});
