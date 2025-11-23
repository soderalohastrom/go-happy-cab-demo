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
