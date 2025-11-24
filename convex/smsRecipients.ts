import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SMS Recipients - Contact directory operations
 * Part of SMS Switchboard integration
 * Created: November 24, 2025
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List recipients with optional filters
 */
export const list = query({
  args: {
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    includeOptedOut: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let recipients;

    if (args.status) {
      recipients = await ctx.db
        .query("smsRecipients")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    } else {
      recipients = await ctx.db.query("smsRecipients").collect();
    }

    // Filter by type if specified
    if (args.type) {
      recipients = recipients.filter((r) => r.recipientType === args.type);
    }

    // Exclude opted-out by default
    if (!args.includeOptedOut) {
      recipients = recipients.filter((r) => !r.optedOut);
    }

    // Sort by name
    return recipients.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get single recipient by ID
 */
export const get = query({
  args: { id: v.id("smsRecipients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get recipient by phone number
 */
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsRecipients")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

/**
 * Get recipient by linked parent ID
 */
export const getByParent = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsRecipients")
      .withIndex("by_parent", (q) => q.eq("linkedParentId", args.parentId))
      .first();
  },
});

/**
 * Get recipient by linked driver ID
 */
export const getByDriver = query({
  args: { driverId: v.id("drivers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsRecipients")
      .withIndex("by_driver", (q) => q.eq("linkedDriverId", args.driverId))
      .first();
  },
});

/**
 * Search recipients by name or phone
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    const allRecipients = await ctx.db
      .query("smsRecipients")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return allRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.phone.includes(searchTerm) ||
        (r.email && r.email.toLowerCase().includes(searchTerm)) ||
        (r.childName && r.childName.toLowerCase().includes(searchTerm))
    );
  },
});

/**
 * Get recipient counts by type
 */
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const allRecipients = await ctx.db.query("smsRecipients").collect();

    return {
      total: allRecipients.length,
      active: allRecipients.filter((r) => r.status === "active" && !r.optedOut).length,
      optedOut: allRecipients.filter((r) => r.optedOut).length,
      byType: {
        parent: allRecipients.filter((r) => r.recipientType === "parent").length,
        driver: allRecipients.filter((r) => r.recipientType === "driver").length,
        teacher: allRecipients.filter((r) => r.recipientType === "teacher").length,
        school_contact: allRecipients.filter((r) => r.recipientType === "school_contact").length,
        custom: allRecipients.filter((r) => r.recipientType === "custom").length,
      },
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Sync recipients from existing parents table
 */
export const syncFromParents = mutation({
  args: {},
  handler: async (ctx) => {
    const parents = await ctx.db.query("parents").collect();
    const children = await ctx.db.query("children").collect();
    const now = new Date().toISOString();
    let synced = 0;
    let skipped = 0;

    for (const parent of parents) {
      // Check if already exists
      const existing = await ctx.db
        .query("smsRecipients")
        .withIndex("by_parent", (q) => q.eq("linkedParentId", parent._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Skip if no phone number
      if (!parent.phone) {
        skipped++;
        continue;
      }

      // Find associated child(ren)
      // Look through children's parent1/parent2 fields or parentIds array
      const associatedChild = children.find((child) => {
        if (child.parent1?.phone === parent.phone) return true;
        if (child.parent2?.phone === parent.phone) return true;
        return false;
      });

      await ctx.db.insert("smsRecipients", {
        recipientType: "parent",
        linkedParentId: parent._id,
        name: `${parent.firstName} ${parent.lastName}`,
        phone: parent.phone,
        email: parent.email,
        childName: associatedChild?.firstName,
        childId: associatedChild?._id,
        preferredLanguage: "en", // TODO: derive from parent preferences
        optedOut: false,
        status: parent.active ? "active" : "inactive",
        messageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      synced++;
    }

    return { synced, skipped, total: parents.length };
  },
});

/**
 * Sync recipients from existing drivers table
 */
export const syncFromDrivers = mutation({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db.query("drivers").collect();
    const now = new Date().toISOString();
    let synced = 0;
    let skipped = 0;

    for (const driver of drivers) {
      // Check if already exists
      const existing = await ctx.db
        .query("smsRecipients")
        .withIndex("by_driver", (q) => q.eq("linkedDriverId", driver._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Skip if no phone number
      if (!driver.phone) {
        skipped++;
        continue;
      }

      // Determine language preference
      let language: "en" | "pt-BR" | "es" = "en";
      if (driver.primaryLanguage) {
        if (driver.primaryLanguage.toLowerCase().includes("portugu")) {
          language = "pt-BR";
        } else if (driver.primaryLanguage.toLowerCase().includes("spanish")) {
          language = "es";
        }
      }

      await ctx.db.insert("smsRecipients", {
        recipientType: "driver",
        linkedDriverId: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone,
        email: driver.email,
        preferredLanguage: language,
        optedOut: false,
        status: driver.active ? "active" : "inactive",
        messageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      synced++;
    }

    return { synced, skipped, total: drivers.length };
  },
});

/**
 * Sync recipients from school contacts
 */
export const syncFromSchoolContacts = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("schoolContacts").collect();
    const now = new Date().toISOString();
    let synced = 0;
    let skipped = 0;

    for (const contact of contacts) {
      // Check if already exists by phone
      const existing = await ctx.db
        .query("smsRecipients")
        .withIndex("by_phone", (q) => q.eq("phone", contact.phone))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("smsRecipients", {
        recipientType: "school_contact",
        linkedSchoolContactId: contact._id,
        name: `${contact.firstName} ${contact.lastName}`,
        phone: contact.phone,
        email: contact.email,
        notes: `${contact.title} - ${contact.contactType}`,
        preferredLanguage: "en",
        optedOut: false,
        status: "active",
        messageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      synced++;
    }

    return { synced, skipped, total: contacts.length };
  },
});

/**
 * Add a custom recipient (manual entry)
 */
export const addCustom = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    preferredLanguage: v.optional(v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es"))),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Check if phone already exists
    const existing = await ctx.db
      .query("smsRecipients")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) {
      throw new Error(`Recipient with phone ${args.phone} already exists`);
    }

    return await ctx.db.insert("smsRecipients", {
      recipientType: "custom",
      name: args.name,
      phone: args.phone,
      email: args.email,
      notes: args.notes,
      tags: args.tags,
      preferredLanguage: args.preferredLanguage || "en",
      optedOut: false,
      status: "active",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update recipient details
 */
export const update = mutation({
  args: {
    id: v.id("smsRecipients"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    preferredLanguage: v.optional(v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es"))),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
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
 * Opt out recipient from SMS
 */
export const optOut = mutation({
  args: { id: v.id("smsRecipients") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      optedOut: true,
      optOutDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Opt recipient back in
 */
export const optIn = mutation({
  args: { id: v.id("smsRecipients") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      optedOut: false,
      optOutDate: undefined,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Delete recipient (hard delete - use carefully)
 */
export const remove = mutation({
  args: { id: v.id("smsRecipients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Bulk tag recipients
 */
export const addTagsToMany = mutation({
  args: {
    recipientIds: v.array(v.id("smsRecipients")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let updated = 0;

    for (const id of args.recipientIds) {
      const recipient = await ctx.db.get(id);
      if (recipient) {
        const existingTags = recipient.tags || [];
        const newTags = [...new Set([...existingTags, ...args.tags])];
        await ctx.db.patch(id, {
          tags: newTags,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { updated };
  },
});
