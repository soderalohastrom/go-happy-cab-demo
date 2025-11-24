import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SMS Templates - CRUD operations for message templates
 * Part of SMS Switchboard integration
 * Created: November 24, 2025
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all templates with optional filters
 */
export const list = query({
  args: {
    category: v.optional(v.string()),
    language: v.optional(v.string()),
    recipientType: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let templates;

    // Start with active filter if specified (most common case)
    if (args.activeOnly !== false) {
      templates = await ctx.db
        .query("smsTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      templates = await ctx.db.query("smsTemplates").collect();
    }

    // Apply additional filters
    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }
    if (args.language) {
      templates = templates.filter((t) => t.language === args.language);
    }
    if (args.recipientType) {
      templates = templates.filter(
        (t) =>
          t.targetRecipientType === args.recipientType ||
          t.targetRecipientType === "any"
      );
    }

    // Sort by usage count (most used first) then by name
    return templates.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Get single template by ID
 */
export const get = query({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get templates by category
 */
export const getByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsTemplates")
      .withIndex("by_category", (q) => q.eq("category", args.category as any))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get templates by language
 */
export const getByLanguage = query({
  args: {
    language: v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsTemplates")
      .withIndex("by_language", (q) => q.eq("language", args.language))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new template
 */
export const create = mutation({
  args: {
    name: v.string(),
    subject: v.optional(v.string()),
    messageText: v.string(),
    variables: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
      })
    ),
    category: v.union(
      v.literal("pickup"),
      v.literal("dropoff"),
      v.literal("delay"),
      v.literal("emergency"),
      v.literal("schedule"),
      v.literal("general"),
      v.literal("custom")
    ),
    targetRecipientType: v.union(
      v.literal("parent"),
      v.literal("driver"),
      v.literal("teacher"),
      v.literal("any")
    ),
    language: v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es")),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    return await ctx.db.insert("smsTemplates", {
      name: args.name,
      subject: args.subject,
      messageText: args.messageText,
      variables: args.variables,
      category: args.category,
      targetRecipientType: args.targetRecipientType,
      language: args.language,
      isActive: true,
      usageCount: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing template
 */
export const update = mutation({
  args: {
    id: v.id("smsTemplates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    messageText: v.optional(v.string()),
    variables: v.optional(
      v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          defaultValue: v.optional(v.string()),
          required: v.boolean(),
        })
      )
    ),
    category: v.optional(
      v.union(
        v.literal("pickup"),
        v.literal("dropoff"),
        v.literal("delay"),
        v.literal("emergency"),
        v.literal("schedule"),
        v.literal("general"),
        v.literal("custom")
      )
    ),
    targetRecipientType: v.optional(
      v.union(
        v.literal("parent"),
        v.literal("driver"),
        v.literal("teacher"),
        v.literal("any")
      )
    ),
    language: v.optional(
      v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es"))
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    cleanUpdates.updatedAt = new Date().toISOString();

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

/**
 * Soft delete (deactivate) a template
 */
export const deactivate = mutation({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Reactivate a template
 */
export const reactivate = mutation({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Increment usage counter (called when template is used to send a message)
 */
export const incrementUsage = mutation({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (template) {
      await ctx.db.patch(args.id, {
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      });
    }
  },
});

/**
 * Duplicate a template (for creating variations)
 */
export const duplicate = mutation({
  args: {
    id: v.id("smsTemplates"),
    newName: v.optional(v.string()),
    newLanguage: v.optional(
      v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es"))
    ),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.id);
    if (!original) {
      throw new Error("Template not found");
    }

    const now = new Date().toISOString();

    return await ctx.db.insert("smsTemplates", {
      name: args.newName || `${original.name} (Copy)`,
      subject: original.subject,
      messageText: original.messageText,
      variables: original.variables,
      category: original.category,
      targetRecipientType: original.targetRecipientType,
      language: args.newLanguage || original.language,
      isActive: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});
