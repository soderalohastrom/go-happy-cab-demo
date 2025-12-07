import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get a single route by ID
export const getById = internalQuery({
    args: { routeId: v.id("routes") },
    handler: async (ctx, args) => {
        const route = await ctx.db.get(args.routeId);
        if (!route) return null;

        // Enrich with child details if needed, but for now just return the route
        // The notification sender might need child name, so let's fetch it
        const child = await ctx.db.get(route.childId);

        return {
            ...route,
            child,
        };
    },
});

import { internalMutation } from "./_generated/server";

// Helper internal mutation to create a route
export const createRoute = internalMutation({
    args: {
        childId: v.id("children"),
        driverId: v.id("drivers"),
        date: v.string(),
        period: v.union(v.literal("AM"), v.literal("PM")),
        type: v.union(v.literal("pickup"), v.literal("dropoff")),
        status: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("assigned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("cancelled"),
            v.literal("no_show"),
            v.literal("late_cancel"),
            v.literal("na"),
            v.literal("emergency_stop")
        ),
    },
    handler: async (ctx, args) => {
        // Check if route already exists to avoid duplicates
        const existing = await ctx.db
            .query("routes")
            .withIndex("by_child_date_period", (q) =>
                q
                    .eq("childId", args.childId)
                    .eq("date", args.date)
                    .eq("period", args.period)
            )
            .first();

        if (existing) {
            // Update existing route if found
            await ctx.db.patch(existing._id, {
                driverId: args.driverId,
                updatedAt: new Date().toISOString(),
            });
            return existing._id;
        } else {
            // Create new route
            return await ctx.db.insert("routes", {
                ...args,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
    },
});
