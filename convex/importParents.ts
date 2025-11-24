/**
 * Import Parents from Google Sheets
 * 
 * Imports parent/guardian data from Google Sheets and creates relationships
 * with existing children in the database.
 * 
 * Google Sheet Structure:
 * Column A: Parent First Name
 * Column B: Parent Last Name
 * Column C: Title (relationship descriptor, e.g., "Billy Smith Parent")
 * Column D: Cellphone
 * Column E: Company (school name)
 * Column F: Rider_FirstNm (child first name)
 * Column G: Rider_LastNm (child last name)
 * Column H: Street Address
 * Column I: Unit/Apt
 * Column J: City
 * Column K: Zip
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import a batch of parent records from Google Sheets data
 * 
 * Strategy:
 * 1. Deduplicate parents by phone + lastName
 * 2. Match children by name + school
 * 3. Create parent records
 * 4. Create childParentRelationships
 * 5. Update children.parent1/parent2 for backward compatibility
 */
export const importParentsFromSheet = mutation({
    args: {
        rows: v.array(v.object({
            parentFirstName: v.string(),
            parentLastName: v.string(),
            title: v.string(), // e.g., "Billy Smith Parent"
            phone: v.string(),
            school: v.string(), // Company field
            childFirstName: v.string(),
            childLastName: v.string(),
            street: v.optional(v.string()),
            unit: v.optional(v.string()),
            city: v.optional(v.string()),
            zip: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const results = {
            parentsCreated: 0,
            parentsUpdated: 0,
            relationshipsCreated: 0,
            childrenUpdated: 0,
            errors: [] as string[],
            skipped: [] as string[],
        };

        // Track parent deduplication (key: phone_lastName)
        const processedParents = new Map<string, any>();

        for (const row of args.rows) {
            try {
                // Clean and validate data
                const parentPhone = cleanPhone(row.phone);
                if (!parentPhone) {
                    results.skipped.push(
                        `No valid phone for ${row.parentFirstName} ${row.parentLastName}`
                    );
                    continue;
                }

                // Extract relationship from title field
                // e.g., "Billy Smith Parent" → relationship = "parent"
                const relationship = extractRelationship(row.title);

                // Create dedupe key
                const parentKey = `${parentPhone}_${row.parentLastName.trim().toLowerCase()}`;

                // Check if we've already processed this parent in this batch
                let parentId = processedParents.get(parentKey);

                if (!parentId) {
                    // Check if parent already exists in database
                    const existingParent = await ctx.db
                        .query("parents")
                        .withIndex("by_phone", (q) => q.eq("phone", parentPhone))
                        .filter((q) =>
                            q.eq(
                                q.field("lastName"),
                                row.parentLastName.trim()
                            )
                        )
                        .first();

                    if (existingParent) {
                        parentId = existingParent._id;
                        processedParents.set(parentKey, parentId);
                        results.parentsUpdated++;
                    } else {
                        // Create new parent record
                        parentId = await ctx.db.insert("parents", {
                            firstName: row.parentFirstName.trim(),
                            lastName: row.parentLastName.trim(),
                            email: `${row.parentFirstName.toLowerCase()}.${row.parentLastName.toLowerCase()}@placeholder.com`, // Placeholder
                            phone: parentPhone,
                            alternatePhone: undefined,
                            address: row.street ? {
                                street: `${row.street}${row.unit ? ' ' + row.unit : ''}`.trim(),
                                city: row.city || "Unknown",
                                state: "CA",
                                zip: row.zip || "",
                            } : undefined,
                            relationship,
                            isPrimary: false, // Will be updated later
                            canPickup: true, // Default to true
                            preferredContactMethod: "phone",
                            communicationPreferences: {
                                emergencyOnly: false,
                                dailyUpdates: true,
                                pickupNotifications: true,
                                delayAlerts: true,
                            },
                            active: true,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        });

                        processedParents.set(parentKey, parentId);
                        results.parentsCreated++;
                    }
                }

                // Find matching child
                const child = await findChildByNameAndSchool(
                    ctx,
                    row.childFirstName,
                    row.childLastName,
                    row.school
                );

                if (!child) {
                    results.errors.push(
                        `Child not found: ${row.childFirstName} ${row.childLastName} at ${row.school}`
                    );
                    continue;
                }

                // Check if relationship already exists
                const existingRelationship = await ctx.db
                    .query("childParentRelationships")
                    .withIndex("by_child", (q) => q.eq("childId", child._id))
                    .filter((q) => q.eq(q.field("parentId"), parentId))
                    .first();

                if (!existingRelationship) {
                    // Get existing relationships to determine if this should be primary
                    const existingRelationships = await ctx.db
                        .query("childParentRelationships")
                        .withIndex("by_child", (q) => q.eq("childId", child._id))
                        .collect();

                    const isPrimary = existingRelationships.length === 0;

                    // Create relationship
                    await ctx.db.insert("childParentRelationships", {
                        childId: child._id,
                        parentId,
                        relationship,
                        isPrimary,
                        pickupAuthorized: true,
                        emergencyContact: true,
                        createdAt: new Date().toISOString(),
                    });

                    results.relationshipsCreated++;

                    // Update child's embedded parent fields for backward compatibility
                    const parent = await ctx.db.get(parentId);
                    if (parent) {
                        if (isPrimary && !child.parent1) {
                            await ctx.db.patch(child._id, {
                                parent1: {
                                    firstName: parent.firstName,
                                    lastName: parent.lastName,
                                    phone: parent.phone,
                                },
                                updatedAt: new Date().toISOString(),
                            });
                            results.childrenUpdated++;
                        } else if (!isPrimary && !child.parent2) {
                            await ctx.db.patch(child._id, {
                                parent2: {
                                    firstName: parent.firstName,
                                    lastName: parent.lastName,
                                    phone: parent.phone,
                                },
                                updatedAt: new Date().toISOString(),
                            });
                            results.childrenUpdated++;
                        }
                    }
                }
            } catch (error: any) {
                results.errors.push(
                    `Error processing ${row.parentFirstName} ${row.parentLastName}: ${error.message}`
                );
            }
        }

        return results;
    },
});

/**
 * Helper: Clean phone number to standard format
 */
function cleanPhone(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Must be at least 10 digits
    if (digits.length < 10) return null;

    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // If 11 digits and starts with 1, strip the 1
    if (digits.length === 11 && digits[0] === '1') {
        return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Otherwise just return the digits
    return digits;
}

/**
 * Helper: Extract relationship from title field
 * e.g., "Billy Smith Parent" → "parent"
 * e.g., "Sarah Jones Guardian" → "guardian"
 */
function extractRelationship(title: string): string {
    const lower = title.toLowerCase();

    if (lower.includes('mother') || lower.includes('mom')) return 'mother';
    if (lower.includes('father') || lower.includes('dad')) return 'father';
    if (lower.includes('guardian')) return 'guardian';
    if (lower.includes('grandparent') || lower.includes('grandmother') || lower.includes('grandfather')) {
        return 'grandparent';
    }
    if (lower.includes('aide') || lower.includes('assistant')) return 'aide';

    // Default to "parent"
    return 'parent';
}

/**
 * Helper: Find child by name and school
 */
async function findChildByNameAndSchool(
    ctx: any,
    firstName: string,
    lastName: string,
    schoolName: string
): Promise<any | null> {
    // Clean inputs
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanSchool = schoolName.trim();

    // Try exact match first
    const exactMatch = await ctx.db
        .query("children")
        .withIndex("by_active", (q: any) => q.eq("active", true))
        .filter((q: any) =>
            q.and(
                q.eq(q.field("firstName"), cleanFirst),
                q.eq(q.field("lastName"), cleanLast),
                q.eq(q.field("schoolName"), cleanSchool)
            )
        )
        .first();

    if (exactMatch) return exactMatch;

    // Try case-insensitive match
    const allChildren = await ctx.db
        .query("children")
        .withIndex("by_active", (q: any) => q.eq("active", true))
        .collect();

    const caseInsensitiveMatch = allChildren.find((child: any) => {
        return (
            child.firstName.toLowerCase() === cleanFirst.toLowerCase() &&
            child.lastName.toLowerCase() === cleanLast.toLowerCase() &&
            child.schoolName.toLowerCase() === cleanSchool.toLowerCase()
        );
    });

    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    // Try match without school (if school name doesn't match exactly)
    const nameOnlyMatch = allChildren.find((child: any) => {
        return (
            child.firstName.toLowerCase() === cleanFirst.toLowerCase() &&
            child.lastName.toLowerCase() === cleanLast.toLowerCase()
        );
    });

    return nameOnlyMatch || null;
}

/**
 * Query to check import readiness
 * 
 * Checks how many children already have parent relationships
 */
export const checkImportReadiness = query({
    args: {},
    handler: async (ctx) => {
        const allChildren = await ctx.db
            .query("children")
            .withIndex("by_active", (q) => q.eq("active", true))
            .collect();

        const childrenWithRelationships = await Promise.all(
            allChildren.map(async (child) => {
                const rels = await ctx.db
                    .query("childParentRelationships")
                    .withIndex("by_child", (q) => q.eq("childId", child._id))
                    .collect();
                return rels.length > 0;
            })
        );

        const withParents = childrenWithRelationships.filter(Boolean).length;

        const allParents = await ctx.db
            .query("parents")
            .withIndex("by_active", (q) => q.eq("active", true))
            .collect();

        return {
            totalChildren: allChildren.length,
            childrenWithParents: withParents,
            childrenWithoutParents: allChildren.length - withParents,
            totalParents: allParents.length,
            readyToImport: true,
        };
    },
});
