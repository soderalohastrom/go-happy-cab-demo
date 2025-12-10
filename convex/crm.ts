import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * CRM Contacts Module - Global Contact Directory
 *
 * A free-form contact list like Google Contacts.
 * Labels are the primary organization method.
 * NOT tied to dispatch operations - just a digital Rolodex.
 */

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List all CRM contacts with optional label filtering
 */
export const list = query({
  args: {
    label: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { label, includeInactive, limit } = args;

    let contacts;

    if (!includeInactive) {
      contacts = await ctx.db
        .query("crmContacts")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      contacts = await ctx.db.query("crmContacts").collect();
    }

    // Filter by label if specified
    if (label) {
      contacts = contacts.filter((c) => c.labels.includes(label));
    }

    // Sort by name (lastName, firstName, then org)
    contacts.sort((a, b) => {
      const nameA = `${a.lastName || ""} ${a.firstName || ""} ${a.organizationName || ""}`.toLowerCase().trim();
      const nameB = `${b.lastName || ""} ${b.firstName || ""} ${b.organizationName || ""}`.toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });

    return limit ? contacts.slice(0, limit) : contacts;
  },
});

/**
 * Get a single CRM contact by ID
 */
export const getById = query({
  args: { id: v.id("crmContacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Search CRM contacts by name, email, phone, or organization
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, label } = args;
    const lowerSearch = searchTerm.toLowerCase();

    // Get all active contacts
    let contacts = await ctx.db
      .query("crmContacts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by label if specified
    if (label) {
      contacts = contacts.filter((c) => c.labels.includes(label));
    }

    // Filter by search term
    return contacts.filter((contact) => {
      const fullName =
        `${contact.firstName || ""} ${contact.lastName || ""}`.toLowerCase();
      const orgName = (contact.organizationName || "").toLowerCase();
      const title = (contact.organizationTitle || "").toLowerCase();
      const email = (contact.email || "").toLowerCase();
      const phone = (contact.phone || "").replace(/\D/g, "");
      const address = (contact.address || "").toLowerCase();

      return (
        fullName.includes(lowerSearch) ||
        orgName.includes(lowerSearch) ||
        title.includes(lowerSearch) ||
        email.includes(lowerSearch) ||
        address.includes(lowerSearch) ||
        phone.includes(searchTerm.replace(/\D/g, ""))
      );
    });
  },
});

/**
 * Get all unique labels with counts
 */
export const getLabels = query({
  handler: async (ctx) => {
    const contacts = await ctx.db
      .query("crmContacts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Count contacts per label
    const labelCounts: Record<string, number> = {};
    for (const contact of contacts) {
      for (const label of contact.labels) {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      }
    }

    // Sort by count descending, then alphabetically
    const sortedLabels = Object.entries(labelCounts)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]; // By count desc
        return a[0].localeCompare(b[0]); // Then alphabetically
      })
      .map(([label, count]) => ({ label, count }));

    return sortedLabels;
  },
});

/**
 * Get CRM stats
 */
export const getStats = query({
  handler: async (ctx) => {
    const contacts = await ctx.db
      .query("crmContacts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Count unique labels
    const uniqueLabels = new Set<string>();
    for (const contact of contacts) {
      for (const label of contact.labels) {
        uniqueLabels.add(label);
      }
    }

    return {
      total: contacts.length,
      labelCount: uniqueLabels.size,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new CRM contact
 */
export const create = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    organizationTitle: v.optional(v.string()),
    organizationDepartment: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    alternatePhone: v.optional(v.string()),
    address: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRowId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const contactId = await ctx.db.insert("crmContacts", {
      firstName: args.firstName,
      lastName: args.lastName,
      middleName: args.middleName,
      organizationName: args.organizationName,
      organizationTitle: args.organizationTitle,
      organizationDepartment: args.organizationDepartment,
      email: args.email,
      phone: args.phone,
      alternatePhone: args.alternatePhone,
      address: args.address,
      labels: args.labels || [],
      notes: args.notes,
      source: args.source || "manual_entry",
      sourceRowId: args.sourceRowId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    return contactId;
  },
});

/**
 * Update an existing CRM contact
 */
export const update = mutation({
  args: {
    id: v.id("crmContacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    organizationTitle: v.optional(v.string()),
    organizationDepartment: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    alternatePhone: v.optional(v.string()),
    address: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Contact not found");
    }

    // Remove undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

/**
 * Soft delete (deactivate) a CRM contact
 */
export const deactivate = mutation({
  args: { id: v.id("crmContacts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
    return args.id;
  },
});

/**
 * Reactivate a CRM contact
 */
export const reactivate = mutation({
  args: { id: v.id("crmContacts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    return args.id;
  },
});

/**
 * Permanently delete a CRM contact
 */
export const remove = mutation({
  args: { id: v.id("crmContacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Bulk create CRM contacts (for import)
 */
export const bulkCreate = mutation({
  args: {
    contacts: v.array(
      v.object({
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        middleName: v.optional(v.string()),
        organizationName: v.optional(v.string()),
        organizationTitle: v.optional(v.string()),
        organizationDepartment: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        alternatePhone: v.optional(v.string()),
        address: v.optional(v.string()),
        labels: v.optional(v.array(v.string())),
        notes: v.optional(v.string()),
        source: v.optional(v.string()),
        sourceRowId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const createdIds: string[] = [];

    for (const contact of args.contacts) {
      const id = await ctx.db.insert("crmContacts", {
        ...contact,
        labels: contact.labels || [],
        source: contact.source || "google_contacts_import",
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
      createdIds.push(id);
    }

    return {
      success: true,
      created: createdIds.length,
      ids: createdIds,
    };
  },
});

/**
 * Clear all CRM contacts (for re-import)
 */
export const clearAll = mutation({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crmContacts").collect();

    for (const contact of contacts) {
      await ctx.db.delete(contact._id);
    }

    return {
      success: true,
      deleted: contacts.length,
    };
  },
});

/**
 * Add a label to a contact
 */
export const addLabel = mutation({
  args: {
    id: v.id("crmContacts"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const labels = contact.labels || [];
    if (!labels.includes(args.label)) {
      labels.push(args.label);
      await ctx.db.patch(args.id, {
        labels,
        updatedAt: new Date().toISOString(),
      });
    }

    return args.id;
  },
});

/**
 * Remove a label from a contact
 */
export const removeLabel = mutation({
  args: {
    id: v.id("crmContacts"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const labels = (contact.labels || []).filter((l) => l !== args.label);
    await ctx.db.patch(args.id, {
      labels,
      updatedAt: new Date().toISOString(),
    });

    return args.id;
  },
});
