import { mutation } from "./_generated/server";

// Seed initial children and drivers
export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingChildren = await ctx.db.query("children").first();
    if (existingChildren) {
      return { message: "Data already seeded" };
    }

    // Seed children
    const children = [
      "Kai Moreira",
      "Lani Lopes",
      "Hilo Jeffries",
      "Aloha Santiago",
      "Nalani King",
      "Malia Pacheco",
      "Keoni Santos",
      "Ikaika Brown",
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

    // Seed drivers
    const drivers = [
      "John Kaeo",
      "Marie Wong",
      "David Reeves",
      "Sarah Torres",
      "Miguel Cruz",
      "Brandon Liu",
      "Aisha Mohammed",
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

    return {
      message: "Data seeded successfully",
      childrenCount: children.length,
      driversCount: drivers.length,
    };
  },
});
