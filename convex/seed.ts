import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed initial children and drivers with realistic pairing patterns
export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingChildren = await ctx.db.query("children").first();
    if (existingChildren) {
      return { message: "Data already seeded" };
    }

    // Seed MORE children to represent typical service
    const children = [
      // Regular riders (will be pre-paired - 85%)
      "Kai Moreira",
      "Lani Lopes",
      "Hilo Jeffries",
      "Aloha Santiago",
      "Nalani King",
      "Malia Pacheco",
      "Keoni Santos",
      "Ikaika Brown",
      "Emma Nakamura",
      "Noah Tanaka",
      "Olivia Chen",
      "Liam Fernandez",
      "Sophia Rivera",
      "Mason Kim",
      "Isabella Park",
      // Occasional/new riders (typically unpaired - 15%)
      "Ethan Yamamoto",
      "Ava Watanabe",
      "Lucas Silva",
    ];

    const childIds: Record<string, any> = {};
    for (const name of children) {
      const id = await ctx.db.insert("children", {
        name,
        active: true,
        metadata: {},
      });
      childIds[name] = id;
    }

    // Seed MORE drivers
    const drivers = [
      // Regular drivers (will be pre-paired)
      "John Kaeo",
      "Marie Wong",
      "David Reeves",
      "Miguel Cruz",
      "Sarah Torres",
      "Brandon Liu",
      "Aisha Mohammed",
      "Robert Nakamura",
      "Jennifer Kim",
      "Michael Chen",
      // Extra/substitute drivers (typically unpaired)
      "Patricia Yamada",
      "James Rodriguez",
    ];

    const driverIds: Record<string, any> = {};
    for (const name of drivers) {
      const id = await ctx.db.insert("drivers", {
        name,
        active: true,
        metadata: {},
      });
      driverIds[name] = id;
    }

    // Create default static pairings (85% paired)
    // These represent the standard daily assignments that rarely change
    const today = new Date().toISOString().split('T')[0];
    const staticPairingsAM = [
      { child: "Kai Moreira", driver: "John Kaeo" },
      { child: "Lani Lopes", driver: "Marie Wong" },
      { child: "Hilo Jeffries", driver: "David Reeves" },
      { child: "Aloha Santiago", driver: "Miguel Cruz" },
      { child: "Nalani King", driver: "Sarah Torres" },
      { child: "Malia Pacheco", driver: "Brandon Liu" },
      { child: "Keoni Santos", driver: "Aisha Mohammed" },
      { child: "Ikaika Brown", driver: "Robert Nakamura" },
      { child: "Emma Nakamura", driver: "Jennifer Kim" },
      { child: "Noah Tanaka", driver: "Michael Chen" },
      // Some drivers take multiple kids (common in real service)
      { child: "Olivia Chen", driver: "John Kaeo" },
      { child: "Liam Fernandez", driver: "Marie Wong" },
      { child: "Sophia Rivera", driver: "David Reeves" },
    ];

    const staticPairingsPM = [
      { child: "Kai Moreira", driver: "John Kaeo" },
      { child: "Lani Lopes", driver: "Marie Wong" },
      { child: "Hilo Jeffries", driver: "David Reeves" },
      { child: "Aloha Santiago", driver: "Miguel Cruz" },
      { child: "Nalani King", driver: "Sarah Torres" },
      { child: "Malia Pacheco", driver: "Brandon Liu" },
      { child: "Keoni Santos", driver: "Aisha Mohammed" },
      { child: "Ikaika Brown", driver: "Robert Nakamura" },
      { child: "Emma Nakamura", driver: "Jennifer Kim" },
      { child: "Noah Tanaka", driver: "Michael Chen" },
      { child: "Mason Kim", driver: "Miguel Cruz" },
      { child: "Isabella Park", driver: "Sarah Torres" },
    ];

    // Create AM assignments for today (most are paired)
    for (const pairing of staticPairingsAM) {
      await ctx.db.insert("assignments", {
        date: today,
        period: "AM",
        childId: childIds[pairing.child],
        driverId: driverIds[pairing.driver],
        status: "scheduled",
        createdAt: Date.now(),
      });
    }

    // Create PM assignments for today (slightly different pattern)
    for (const pairing of staticPairingsPM) {
      await ctx.db.insert("assignments", {
        date: today,
        period: "PM",
        childId: childIds[pairing.child],
        driverId: driverIds[pairing.driver],
        status: "scheduled",
        createdAt: Date.now(),
      });
    }

    return {
      message: "Data seeded with realistic pairing patterns",
      childrenCount: children.length,
      driversCount: drivers.length,
      amPairings: staticPairingsAM.length,
      pmPairings: staticPairingsPM.length,
      note: "Most children are pre-paired (85%), with only 2-3 needing daily assignment"
    };
  },
});

// Add function to copy assignments from previous day
export const copyAssignmentsFromPreviousDay = mutation({
  args: { targetDate: v.string() },
  handler: async (ctx, args) => {
    // Get the previous day's date
    const targetDateObj = new Date(args.targetDate);
    targetDateObj.setDate(targetDateObj.getDate() - 1);
    const previousDate = targetDateObj.toISOString().split('T')[0];

    // Get all assignments from previous day
    const previousAssignments = await ctx.db
      .query("assignments")
      .withIndex("by_date", (q) => q.eq("date", previousDate))
      .collect();

    if (previousAssignments.length === 0) {
      return { message: "No assignments found for previous day", copied: 0 };
    }

    // Check if target date already has assignments
    const existingAssignments = await ctx.db
      .query("assignments")
      .withIndex("by_date", (q) => q.eq("date", args.targetDate))
      .first();

    if (existingAssignments) {
      return { message: "Target date already has assignments", copied: 0 };
    }

    // Copy each assignment to the new date
    let copiedCount = 0;
    for (const assignment of previousAssignments) {
      await ctx.db.insert("assignments", {
        date: args.targetDate,
        period: assignment.period,
        childId: assignment.childId,
        driverId: assignment.driverId,
        status: "scheduled",
        createdAt: Date.now(),
      });
      copiedCount++;
    }

    return {
      message: `Copied ${copiedCount} assignments from ${previousDate} to ${args.targetDate}`,
      copied: copiedCount
    };
  },
});