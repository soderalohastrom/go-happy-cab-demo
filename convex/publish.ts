import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Publishes a daily manifest to the public web view.
 * Upserts the record based on date + period (e.g. "2023-10-25-am").
 */
export const publishManifest = mutation({
    args: {
        date: v.string(),
        period: v.string(),
        assignments: v.array(v.object({
            driverName: v.string(),
            children: v.array(v.object({
                childName: v.string(),
                schoolName: v.string(),
                grade: v.string(),
            }))
        })),
    },
    handler: async (ctx, args) => {
        const slug = `${args.date}-${args.period}`.toLowerCase();

        // Check if it already exists
        const existing = await ctx.db
            .query("public_manifests")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        const now = Date.now();

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                assignments: args.assignments,
                publishedAt: now,
                // Keep viewCount
            });
            return slug;
        } else {
            // Create new
            await ctx.db.insert("public_manifests", {
                slug,
                date: args.date,
                period: args.period,
                assignments: args.assignments,
                publishedAt: now,
                viewCount: 0,
                publishedBy: "admin", // TODO: Get actual user ID if available
            });
            return slug;
        }
    },
});

/**
 * Publicly accessible query to get the manifest by slug.
 * No specific auth required (capability URL pattern).
 */
export const getPublicManifest = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const manifest = await ctx.db
            .query("public_manifests")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        return manifest;
    },
});
