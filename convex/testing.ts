import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const assignRouteToScott = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Find Scott (Driver)
        // Using the ID from logs: js73v71dxm93nv5hcse41ppacd7tngg3
        // Or we can search by email if we want to be dynamic, but ID is safer if indexes are missing.
        const scottId = "js73v71dxm93nv5hcse41ppacd7tngg3" as any;
        const driver = await ctx.db.get(scottId);

        if (!driver) {
            throw new Error("Driver Scott (js73v71dxm93nv5hcse41ppacd7tngg3) not found!");
        }

        // 2. Find a Child
        const child = await ctx.db.query("children").first();
        if (!child) {
            throw new Error("No children found in database!");
        }

        // 3. Define Route Details
        const today = new Date().toISOString().split('T')[0];
        const period = "AM";

        // 4. Check if already assigned
        const existing = await ctx.db
            .query("routes")
            .withIndex("by_driver_date_period", (q) =>
                q.eq("driverId", scottId)
                    .eq("date", today)
                    .eq("period", period)
            )
            .first();

        if (existing) {
            // If exists, we can't create another one for same slot easily without erroring.
            // Let's try PM if AM is taken.
            const existingPM = await ctx.db
                .query("routes")
                .withIndex("by_driver_date_period", (q) =>
                    q.eq("driverId", scottId)
                        .eq("date", today)
                        .eq("period", "PM")
                )
                .first();

            if (existingPM) {
                return "Scott already has AM and PM routes for today! Delete one to test notification.";
            }

            // Assign PM
            await ctx.runMutation(api.assignments.create, {
                driverId: scottId,
                childId: child._id,
                date: today,
                period: "PM",
                status: "scheduled",
                user: "Test Script"
            });
            return `Assigned PM route to Scott for ${child.firstName}`;
        }

        // 5. Create AM Assignment
        await ctx.runMutation(api.assignments.create, {
            driverId: scottId,
            childId: child._id,
            date: today,
            period: "AM",
            status: "scheduled",
            user: "Test Script"
        });

        return `Assigned AM route to Scott for ${child.firstName}`;
    },
});
