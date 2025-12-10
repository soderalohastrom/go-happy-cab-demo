import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * CRM Import Module
 *
 * Fuzzy matching and import logic for Google Sheets contacts.
 * Phase 1: Analyze and match contacts against existing entities
 * Phase 2: Import matched and unique contacts into crmContacts table
 */

// =============================================================================
// TYPES
// =============================================================================

interface SheetContact {
  rowIndex: number;
  firstName: string;
  middleName: string;
  lastName: string;
  organizationName: string;
  organizationTitle: string;
  organizationDepartment: string;
  labels: string[];
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface MatchResult {
  sheetContact: SheetContact;
  matchType: "driver" | "parent" | "school" | "school_staff" | "none";
  matchedEntity?: {
    id: string;
    name: string;
    type: string;
  };
  matchScore: number;
  fieldsToUpdate: string[];
  suggestedCategory: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize phone number for comparison (digits only)
 */
function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate name similarity score (0-100)
 */
function nameMatchScore(name1: string, name2: string): number {
  const a = (name1 || "").toLowerCase().trim();
  const b = (name2 || "").toLowerCase().trim();

  if (!a || !b) return 0;
  if (a === b) return 100;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(a, b);
  return Math.max(0, Math.round((1 - distance / maxLen) * 100));
}

/**
 * Calculate phone match score (0-100)
 */
function phoneMatchScore(phone1: string, phone2: string): number {
  const p1 = normalizePhone(phone1);
  const p2 = normalizePhone(phone2);

  if (!p1 || !p2) return 0;
  if (p1 === p2) return 100;

  // Check if one contains the other (partial match)
  if (p1.includes(p2) || p2.includes(p1)) return 80;

  // Last 10 digits match (ignore country code)
  const last10_1 = p1.slice(-10);
  const last10_2 = p2.slice(-10);
  if (last10_1 === last10_2) return 90;

  return 0;
}

/**
 * Calculate email match score (0-100)
 */
function emailMatchScore(email1: string, email2: string): number {
  const e1 = (email1 || "").toLowerCase().trim();
  const e2 = (email2 || "").toLowerCase().trim();

  if (!e1 || !e2) return 0;
  if (e1 === e2) return 100;

  // Same domain
  const domain1 = e1.split("@")[1];
  const domain2 = e2.split("@")[1];
  if (domain1 && domain2 && domain1 === domain2) return 40;

  return 0;
}

/**
 * Determine category from Google Sheet labels
 */
function categorizeFromLabels(labels: string[]): string {
  const labelStr = labels.join(" ").toLowerCase();

  if (labelStr.includes("go happy driver") || labelStr.includes("drivers")) {
    return "driver";
  }
  if (
    labelStr.includes("go happy rider") ||
    labelStr.includes("ght rider") ||
    labelStr.includes("parent")
  ) {
    return "parent";
  }
  if (labelStr.includes("school location")) {
    return "school";
  }
  if (
    labelStr.includes("school contact") ||
    labelStr.includes("teacher")
  ) {
    return "school_staff";
  }
  if (labelStr.includes("vendor") || labelStr.includes("contractor")) {
    return "vendor";
  }
  if (labelStr.includes("business")) {
    return "business";
  }

  return "other";
}

/**
 * Calculate overall match score
 */
function calculateMatchScore(
  sheetContact: SheetContact,
  entity: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    name?: string;
    schoolName?: string;
  }
): number {
  // Full name comparison
  const sheetFullName = `${sheetContact.firstName} ${sheetContact.lastName}`.trim();
  const entityFullName = entity.name ||
    `${entity.firstName || ""} ${entity.lastName || ""}`.trim() ||
    entity.schoolName || "";

  const nameScore = nameMatchScore(sheetFullName, entityFullName);
  const phoneScore = phoneMatchScore(sheetContact.phone, entity.phone || "");
  const emailScore = emailMatchScore(sheetContact.email, entity.email || "");

  // Weighted average: name 40%, phone 35%, email 25%
  return Math.round(nameScore * 0.4 + phoneScore * 0.35 + emailScore * 0.25);
}

/**
 * Find fields that could be updated from sheet contact
 */
function findFieldsToUpdate(
  sheetContact: SheetContact,
  entity: any
): string[] {
  const fieldsToUpdate: string[] = [];

  // Check each field
  if (sheetContact.email && !entity.email) {
    fieldsToUpdate.push("email");
  }
  if (sheetContact.phone && !entity.phone) {
    fieldsToUpdate.push("phone");
  }
  if (sheetContact.address && !entity.address) {
    fieldsToUpdate.push("address");
  }
  if (sheetContact.notes) {
    fieldsToUpdate.push("notes (has additional info)");
  }

  return fieldsToUpdate;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Analyze sheet contacts and match against existing entities
 * Returns categorized results for review before import
 */
export const analyzeContacts = query({
  args: {
    contacts: v.array(
      v.object({
        rowIndex: v.number(),
        firstName: v.string(),
        middleName: v.string(),
        lastName: v.string(),
        organizationName: v.string(),
        organizationTitle: v.string(),
        organizationDepartment: v.string(),
        labels: v.array(v.string()),
        email: v.string(),
        phone: v.string(),
        address: v.string(),
        notes: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: {
      highConfidence: MatchResult[];
      possibleMatch: MatchResult[];
      unique: MatchResult[];
      alreadyImported: MatchResult[];
    } = {
      highConfidence: [],
      possibleMatch: [],
      unique: [],
      alreadyImported: [],
    };

    // Fetch all existing entities for comparison
    const drivers = await ctx.db.query("drivers").collect();
    const children = await ctx.db.query("children").collect();
    const schools = await ctx.db.query("schools").collect();
    const schoolContacts = await ctx.db.query("schoolContacts").collect();
    const existingCrmContacts = await ctx.db.query("crmContacts").collect();

    for (const contact of args.contacts) {
      const category = categorizeFromLabels(contact.labels);
      let bestMatch: MatchResult | null = null;

      // Check if already imported (by sourceRowId)
      const alreadyExists = existingCrmContacts.find(
        (c) => c.sourceRowId === `row_${contact.rowIndex}`
      );
      if (alreadyExists) {
        results.alreadyImported.push({
          sheetContact: contact,
          matchType: "none",
          matchScore: 100,
          fieldsToUpdate: [],
          suggestedCategory: category,
          matchedEntity: {
            id: alreadyExists._id,
            name: `${alreadyExists.firstName || ""} ${alreadyExists.lastName || ""}`.trim(),
            type: "crmContact",
          },
        });
        continue;
      }

      // Match against drivers
      if (category === "driver" || !category || category === "other") {
        for (const driver of drivers) {
          const score = calculateMatchScore(contact, driver);
          if (score > (bestMatch?.matchScore || 0)) {
            bestMatch = {
              sheetContact: contact,
              matchType: "driver",
              matchedEntity: {
                id: driver._id,
                name: `${driver.firstName} ${driver.lastName}`,
                type: "driver",
              },
              matchScore: score,
              fieldsToUpdate: findFieldsToUpdate(contact, driver),
              suggestedCategory: "driver",
            };
          }
        }
      }

      // Match against children's parents (embedded parent1/parent2)
      if (category === "parent" || !category || category === "other") {
        for (const child of children) {
          // Check parent1
          if (child.parent1) {
            const parentFullName = `${child.parent1.firstName} ${child.parent1.lastName}`;
            const sheetFullName = `${contact.firstName} ${contact.lastName}`.trim();
            const nameScore = nameMatchScore(sheetFullName, parentFullName);
            const phoneScore = phoneMatchScore(contact.phone, child.parent1.phone || "");
            const score = Math.round(nameScore * 0.5 + phoneScore * 0.5);

            if (score > (bestMatch?.matchScore || 0)) {
              bestMatch = {
                sheetContact: contact,
                matchType: "parent",
                matchedEntity: {
                  id: child._id,
                  name: `${child.parent1.firstName} ${child.parent1.lastName} (parent of ${child.firstName})`,
                  type: "child.parent1",
                },
                matchScore: score,
                fieldsToUpdate: [],
                suggestedCategory: "parent",
              };
            }
          }

          // Check parent2
          if (child.parent2) {
            const parentFullName = `${child.parent2.firstName} ${child.parent2.lastName}`;
            const sheetFullName = `${contact.firstName} ${contact.lastName}`.trim();
            const nameScore = nameMatchScore(sheetFullName, parentFullName);
            const phoneScore = phoneMatchScore(contact.phone, child.parent2.phone || "");
            const score = Math.round(nameScore * 0.5 + phoneScore * 0.5);

            if (score > (bestMatch?.matchScore || 0)) {
              bestMatch = {
                sheetContact: contact,
                matchType: "parent",
                matchedEntity: {
                  id: child._id,
                  name: `${child.parent2.firstName} ${child.parent2.lastName} (parent of ${child.firstName})`,
                  type: "child.parent2",
                },
                matchScore: score,
                fieldsToUpdate: [],
                suggestedCategory: "parent",
              };
            }
          }
        }
      }

      // Match against schools
      if (category === "school" || !category || category === "other") {
        for (const school of schools) {
          // Match by organization name to school name
          const orgName = contact.organizationName.toLowerCase();
          const schoolName = school.schoolName.toLowerCase();

          if (orgName && schoolName) {
            const score = nameMatchScore(orgName, schoolName);
            if (score > (bestMatch?.matchScore || 0)) {
              bestMatch = {
                sheetContact: contact,
                matchType: "school",
                matchedEntity: {
                  id: school._id,
                  name: school.schoolName,
                  type: "school",
                },
                matchScore: score,
                fieldsToUpdate: findFieldsToUpdate(contact, school),
                suggestedCategory: "school",
              };
            }
          }
        }
      }

      // Match against school contacts
      if (category === "school_staff" || category === "other") {
        for (const sc of schoolContacts) {
          const score = calculateMatchScore(contact, sc);
          if (score > (bestMatch?.matchScore || 0)) {
            bestMatch = {
              sheetContact: contact,
              matchType: "school_staff",
              matchedEntity: {
                id: sc._id,
                name: `${sc.firstName} ${sc.lastName}`,
                type: "schoolContact",
              },
              matchScore: score,
              fieldsToUpdate: findFieldsToUpdate(contact, sc),
              suggestedCategory: "school_staff",
            };
          }
        }
      }

      // Categorize result
      if (bestMatch && bestMatch.matchScore >= 85) {
        results.highConfidence.push(bestMatch);
      } else if (bestMatch && bestMatch.matchScore >= 60) {
        results.possibleMatch.push(bestMatch);
      } else {
        results.unique.push({
          sheetContact: contact,
          matchType: "none",
          matchScore: bestMatch?.matchScore || 0,
          fieldsToUpdate: [],
          suggestedCategory: category,
        });
      }
    }

    return {
      summary: {
        total: args.contacts.length,
        highConfidence: results.highConfidence.length,
        possibleMatch: results.possibleMatch.length,
        unique: results.unique.length,
        alreadyImported: results.alreadyImported.length,
      },
      results,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Import contacts based on analysis results
 */
export const importContacts = mutation({
  args: {
    contacts: v.array(
      v.object({
        rowIndex: v.number(),
        firstName: v.string(),
        middleName: v.string(),
        lastName: v.string(),
        organizationName: v.string(),
        organizationTitle: v.string(),
        organizationDepartment: v.string(),
        labels: v.array(v.string()),
        email: v.string(),
        phone: v.string(),
        address: v.string(),
        notes: v.string(),
        // Match info (if linked)
        linkedDriverId: v.optional(v.id("drivers")),
        linkedChildId: v.optional(v.id("children")),
        linkedParentId: v.optional(v.id("parents")),
        linkedSchoolId: v.optional(v.id("schools")),
        linkedSchoolContactId: v.optional(v.id("schoolContacts")),
        category: v.union(
          v.literal("driver"),
          v.literal("parent"),
          v.literal("school"),
          v.literal("school_staff"),
          v.literal("vendor"),
          v.literal("business"),
          v.literal("personal"),
          v.literal("other")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const contact of args.contacts) {
      try {
        // Check if already imported
        const existing = await ctx.db
          .query("crmContacts")
          .filter((q) =>
            q.eq(q.field("sourceRowId"), `row_${contact.rowIndex}`)
          )
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Parse address into components
        let addressObj;
        if (contact.address) {
          // Simple address parsing - assumes format like "123 Main St, City, CA 94123"
          const parts = contact.address.split(",").map((p) => p.trim());
          addressObj = {
            street: parts[0] || undefined,
            city: parts[1] || undefined,
            state: parts[2]?.split(" ")[0] || undefined,
            zip: parts[2]?.split(" ")[1] || parts[3] || undefined,
          };
        }

        // Parse custom fields from notes (for drivers)
        let customFields;
        if (contact.notes && contact.category === "driver") {
          const cdlMatch = contact.notes.match(/CDL#?\s*[:\-]?\s*(\w+)/i);
          const dobMatch = contact.notes.match(
            /DOB[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i
          );
          const vehicleMatch = contact.notes.match(
            /Vehicle[:\-]?\s*([^\n,]+)/i
          );

          if (cdlMatch || dobMatch || vehicleMatch) {
            customFields = {
              cdl: cdlMatch?.[1],
              dateOfBirth: dobMatch?.[1],
              vehicle: vehicleMatch?.[1]?.trim(),
              rawNotes: contact.notes,
            };
          }
        }

        await ctx.db.insert("crmContacts", {
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          middleName: contact.middleName || undefined,
          organizationName: contact.organizationName || undefined,
          organizationTitle: contact.organizationTitle || undefined,
          organizationDepartment: contact.organizationDepartment || undefined,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          address: addressObj,
          category: contact.category,
          labels: contact.labels,
          linkedDriverId: contact.linkedDriverId,
          linkedChildId: contact.linkedChildId,
          linkedParentId: contact.linkedParentId,
          linkedSchoolId: contact.linkedSchoolId,
          linkedSchoolContactId: contact.linkedSchoolContactId,
          notes: contact.notes || undefined,
          customFields,
          source: "google_sheet_import",
          sourceRowId: `row_${contact.rowIndex}`,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Row ${contact.rowIndex}: ${error}`);
      }
    }

    return results;
  },
});

/**
 * Clear all CRM contacts (for re-import)
 */
export const clearAll = mutation({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crmContacts").collect();
    let deleted = 0;

    for (const contact of contacts) {
      await ctx.db.delete(contact._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Get import status/stats
 */
export const getImportStats = query({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crmContacts").collect();

    const stats = {
      total: contacts.length,
      bySource: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      linked: 0,
      standalone: 0,
    };

    for (const contact of contacts) {
      // By source
      stats.bySource[contact.source] =
        (stats.bySource[contact.source] || 0) + 1;

      // By category
      stats.byCategory[contact.category] =
        (stats.byCategory[contact.category] || 0) + 1;

      // Linked vs standalone
      if (
        contact.linkedDriverId ||
        contact.linkedChildId ||
        contact.linkedParentId ||
        contact.linkedSchoolId ||
        contact.linkedSchoolContactId
      ) {
        stats.linked++;
      } else {
        stats.standalone++;
      }
    }

    return stats;
  },
});
