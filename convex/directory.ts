/**
 * Directory Queries - Driver App Directory Feature
 * 
 * Provides read-only access to Children, Schools, and Teachers (School Contacts)
 * for field drivers to quickly look up contact information.
 * 
 * Used by: Driver App Directory screen
 * Edit capabilities: Dispatch App only (not implemented here)
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all active children with their parent information
 * 
 * Returns children sorted alphabetically by last name, with full parent
 * contact details loaded via childParentRelationships table.
 * 
 * Used by: Directory > Children tab
 */
export const listChildrenWithParents = query({
    args: {},
    handler: async (ctx) => {
        // Get all active children
        const children = await ctx.db
            .query("children")
            .withIndex("by_active", (q) => q.eq("active", true))
            .collect();

        // For each child, fetch their parents via relationships
        const childrenWithParents = await Promise.all(
            children.map(async (child) => {
                // Get all parent relationships for this child
                const relationships = await ctx.db
                    .query("childParentRelationships")
                    .withIndex("by_child", (q) => q.eq("childId", child._id))
                    .collect();

                // Fetch full parent records
                const parents = await Promise.all(
                    relationships.map(async (rel) => {
                        const parent = await ctx.db.get(rel.parentId);
                        return parent ? {
                            ...parent,
                            relationship: rel.relationship,
                            isPrimary: rel.isPrimary,
                            pickupAuthorized: rel.pickupAuthorized,
                        } : null;
                    })
                );

                // Filter out any null parents (in case of orphaned relationships)
                const validParents = parents.filter(p => p !== null);

                // Get school info if schoolId exists
                let school = null;
                if (child.schoolId) {
                    school = await ctx.db.get(child.schoolId as any);
                }

                return {
                    ...child,
                    parents: validParents,
                    schoolInfo: school,
                };
            })
        );

        // Sort alphabetically by last name, then first name
        return childrenWithParents.sort((a, b) => {
            const lastNameCompare = a.lastName.localeCompare(b.lastName);
            if (lastNameCompare !== 0) return lastNameCompare;
            return a.firstName.localeCompare(b.firstName);
        });
    },
});

/**
 * Get a single child with full details including parents and school
 * 
 * Used by: Directory > Children detail view
 */
export const getChildDetail = query({
    args: { childId: v.id("children") },
    handler: async (ctx, args) => {
        const child = await ctx.db.get(args.childId);
        if (!child) return null;

        // Get parent relationships
        const relationships = await ctx.db
            .query("childParentRelationships")
            .withIndex("by_child", (q) => q.eq("childId", args.childId))
            .collect();

        // Fetch full parent records with relationship details
        const parents = await Promise.all(
            relationships.map(async (rel) => {
                const parent = await ctx.db.get(rel.parentId);
                return parent ? {
                    ...parent,
                    relationship: rel.relationship,
                    isPrimary: rel.isPrimary,
                    pickupAuthorized: rel.pickupAuthorized,
                    emergencyContact: rel.emergencyContact,
                } : null;
            })
        );

        // Get school info
        let school = null;
        let schoolSchedule = null;
        if (child.schoolId) {
            school = await ctx.db.get(child.schoolId as any);

            if (school) {
                // Get school schedule
                schoolSchedule = await ctx.db
                    .query("schoolSchedules")
                    .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                    .first();
            }
        }

        return {
            ...child,
            parents: parents.filter(p => p !== null),
            schoolInfo: school,
            schoolSchedule,
        };
    },
});

/**
 * List all schools with their contacts, district, and schedule information
 * 
 * Returns schools sorted alphabetically by name, with full contact details
 * and scheduling information for easy reference by drivers.
 * 
 * Used by: Directory > Schools tab
 */
export const listSchoolsWithContacts = query({
    args: {},
    handler: async (ctx) => {
        // Get all schools
        const schools = await ctx.db.query("schools").collect();

        // For each school, fetch related data
        const schoolsWithDetails = await Promise.all(
            schools.map(async (school) => {
                // Get all contacts for this school
                const contacts = await ctx.db
                    .query("schoolContacts")
                    .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                    .collect();

                // Sort contacts by type (Primary first, then Secondary, then Afterschool)
                const sortedContacts = contacts.sort((a, b) => {
                    const typeOrder = { "Primary": 1, "Secondary": 2, "Afterschool": 3 };
                    const aOrder = typeOrder[a.contactType as keyof typeof typeOrder] || 99;
                    const bOrder = typeOrder[b.contactType as keyof typeof typeOrder] || 99;
                    return aOrder - bOrder;
                });

                // Get district info
                const district = await ctx.db.get(school.districtId);

                // Get schedule
                const schedule = await ctx.db
                    .query("schoolSchedules")
                    .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                    .first();

                // Get non-school days for current/future dates
                const today = new Date().toISOString().split('T')[0];
                const nonSchoolDays = await ctx.db
                    .query("nonSchoolDays")
                    .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                    .filter((q) => q.gte(q.field("date"), today))
                    .collect();

                return {
                    ...school,
                    contacts: sortedContacts,
                    district,
                    schedule,
                    upcomingClosures: nonSchoolDays.slice(0, 5), // Next 5 closures
                };
            })
        );

        // Sort alphabetically by school name
        return schoolsWithDetails.sort((a, b) =>
            a.schoolName.localeCompare(b.schoolName)
        );
    },
});

/**
 * Get a single school with full details
 * 
 * Used by: Directory > Schools detail view
 */
export const getSchoolDetail = query({
    args: { schoolId: v.id("schools") },
    handler: async (ctx, args) => {
        const school = await ctx.db.get(args.schoolId);
        if (!school) return null;

        // Get all contacts
        const contacts = await ctx.db
            .query("schoolContacts")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        // Sort contacts
        const sortedContacts = contacts.sort((a, b) => {
            const typeOrder = { "Primary": 1, "Secondary": 2, "Afterschool": 3 };
            const aOrder = typeOrder[a.contactType as keyof typeof typeOrder] || 99;
            const bOrder = typeOrder[b.contactType as keyof typeof typeOrder] || 99;
            return aOrder - bOrder;
        });

        // Get district
        const district = await ctx.db.get(school.districtId);

        // Get schedule
        const schedule = await ctx.db
            .query("schoolSchedules")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .first();

        // Get all non-school days
        const nonSchoolDays = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        // Get count of children at this school
        const childrenAtSchool = await ctx.db
            .query("children")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        return {
            ...school,
            contacts: sortedContacts,
            district,
            schedule,
            nonSchoolDays,
            childrenCount: childrenAtSchool.length,
        };
    },
});

/**
 * List all school contacts (teachers/staff) with their school information
 * 
 * Returns contacts sorted alphabetically by last name, with school name
 * attached for easy reference.
 * 
 * Used by: Directory > Teachers tab
 */
export const listTeachers = query({
    args: {},
    handler: async (ctx) => {
        // Get all school contacts
        const contacts = await ctx.db.query("schoolContacts").collect();

        // For each contact, fetch their school info
        const contactsWithSchools = await Promise.all(
            contacts.map(async (contact) => {
                const school = await ctx.db.get(contact.schoolId);

                // Get district info for additional context
                let district = null;
                if (school) {
                    district = await ctx.db.get(school.districtId);
                }

                return {
                    ...contact,
                    schoolName: school?.schoolName || "Unknown School",
                    schoolAddress: school ? {
                        streetAddress: school.streetAddress,
                        city: school.city,
                        state: school.state,
                        zip: school.zip,
                    } : null,
                    districtName: district?.districtName,
                };
            })
        );

        // Sort alphabetically by last name, then first name
        return contactsWithSchools.sort((a, b) => {
            const lastNameCompare = a.lastName.localeCompare(b.lastName);
            if (lastNameCompare !== 0) return lastNameCompare;
            return a.firstName.localeCompare(b.firstName);
        });
    },
});

/**
 * Search across all directory entries (children, schools, teachers)
 * 
 * Performs case-insensitive fuzzy search across names and returns
 * categorized results. Limits results per category to prevent overwhelming UI.
 * 
 * Used by: Directory search bar (universal search)
 */
export const searchDirectory = query({
    args: {
        searchTerm: v.string(),
        category: v.optional(v.union(
            v.literal("children"),
            v.literal("schools"),
            v.literal("teachers"),
            v.literal("all")
        )),
    },
    handler: async (ctx, args) => {
        const searchTerm = args.searchTerm.toLowerCase().trim();
        const category = args.category || "all";

        // Return empty results if search term is too short
        if (searchTerm.length < 2) {
            return {
                children: [],
                schools: [],
                teachers: [],
                totalResults: 0,
            };
        }

        const results = {
            children: [] as any[],
            schools: [] as any[],
            teachers: [] as any[],
            totalResults: 0,
        };

        // Search children
        if (category === "all" || category === "children") {
            const children = await ctx.db
                .query("children")
                .withIndex("by_active", (q) => q.eq("active", true))
                .collect();

            results.children = children
                .filter((child) => {
                    const fullName = `${child.firstName} ${child.lastName}`.toLowerCase();
                    const preferredName = child.preferredName?.toLowerCase() || "";
                    const schoolName = child.schoolName.toLowerCase();

                    return fullName.includes(searchTerm) ||
                        preferredName.includes(searchTerm) ||
                        schoolName.includes(searchTerm);
                })
                .slice(0, 10); // Limit to 10 results
        }

        // Search schools
        if (category === "all" || category === "schools") {
            const schools = await ctx.db.query("schools").collect();

            results.schools = schools
                .filter((school) => {
                    const schoolName = school.schoolName.toLowerCase();
                    const city = school.city.toLowerCase();

                    return schoolName.includes(searchTerm) || city.includes(searchTerm);
                })
                .slice(0, 10); // Limit to 10 results
        }

        // Search teachers/contacts
        if (category === "all" || category === "teachers") {
            const contacts = await ctx.db.query("schoolContacts").collect();

            const contactsWithSchools = await Promise.all(
                contacts.map(async (contact) => {
                    const school = await ctx.db.get(contact.schoolId);
                    return {
                        ...contact,
                        schoolName: school?.schoolName || "Unknown",
                    };
                })
            );

            results.teachers = contactsWithSchools
                .filter((contact) => {
                    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
                    const title = contact.title.toLowerCase();
                    const schoolName = contact.schoolName.toLowerCase();

                    return fullName.includes(searchTerm) ||
                        title.includes(searchTerm) ||
                        schoolName.includes(searchTerm);
                })
                .slice(0, 10); // Limit to 10 results
        }

        results.totalResults =
            results.children.length +
            results.schools.length +
            results.teachers.length;

        return results;
    },
});

/**
 * Get directory statistics for dashboard/overview
 * 
 * Returns quick counts for all directory categories.
 * Used by: Directory home screen or stats display
 */
export const getDirectoryStats = query({
    args: {},
    handler: async (ctx) => {
        const [
            activeChildren,
            allSchools,
            allContacts,
            allParents,
        ] = await Promise.all([
            ctx.db
                .query("children")
                .withIndex("by_active", (q) => q.eq("active", true))
                .collect(),
            ctx.db.query("schools").collect(),
            ctx.db.query("schoolContacts").collect(),
            ctx.db
                .query("parents")
                .withIndex("by_active", (q) => q.eq("active", true))
                .collect(),
        ]);

        return {
            childrenCount: activeChildren.length,
            schoolsCount: allSchools.length,
            teachersCount: allContacts.length,
            parentsCount: allParents.length,
            lastUpdated: new Date().toISOString(),
        };
    },
});
