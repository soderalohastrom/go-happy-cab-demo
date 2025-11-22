import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// DATA IMPORT MUTATIONS
// Used to populate the database from CSV files
// ============================================================================

export const importDistricts = mutation({
    args: {
        districts: v.array(v.object({
            districtName: v.string(),
            clientName: v.string(),
            rate: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        for (const district of args.districts) {
            // Check if exists to avoid duplicates
            const existing = await ctx.db
                .query("districts")
                .withIndex("by_district_name", (q) => q.eq("districtName", district.districtName))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, district);
            } else {
                await ctx.db.insert("districts", district);
            }
        }
    },
});

export const importSchools = mutation({
    args: {
        schools: v.array(v.object({
            districtName: v.string(), // Used for lookup
            schoolName: v.string(),
            streetAddress: v.string(),
            city: v.string(),
            state: v.string(),
            zip: v.string(),
            officePhone: v.string(),
            firstDay: v.string(),
            lastDay: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        for (const schoolData of args.schools) {
            // 1. Find District ID
            const district = await ctx.db
                .query("districts")
                .withIndex("by_district_name", (q) => q.eq("districtName", schoolData.districtName))
                .first();

            if (!district) {
                console.warn(`District not found for school: ${schoolData.schoolName} (District: ${schoolData.districtName})`);
                continue;
            }

            // 2. Prepare School Object
            const school = {
                districtId: district._id,
                schoolName: schoolData.schoolName,
                streetAddress: schoolData.streetAddress,
                city: schoolData.city,
                state: schoolData.state,
                zip: schoolData.zip,
                officePhone: schoolData.officePhone,
                firstDay: schoolData.firstDay,
                lastDay: schoolData.lastDay,
            };

            // 3. Insert or Update
            const existing = await ctx.db
                .query("schools")
                .withIndex("by_school_name", (q) => q.eq("schoolName", school.schoolName))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, school);
            } else {
                await ctx.db.insert("schools", school);
            }
        }
    },
});

export const importSchoolContacts = mutation({
    args: {
        contacts: v.array(v.object({
            schoolName: v.string(), // Used for lookup
            contactType: v.string(),
            firstName: v.string(),
            lastName: v.string(),
            title: v.string(),
            phone: v.string(),
            email: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        for (const contactData of args.contacts) {
            const school = await ctx.db
                .query("schools")
                .withIndex("by_school_name", (q) => q.eq("schoolName", contactData.schoolName))
                .first();

            if (!school) {
                console.warn(`School not found for contact: ${contactData.firstName} ${contactData.lastName} (School: ${contactData.schoolName})`);
                continue;
            }

            await ctx.db.insert("schoolContacts", {
                schoolId: school._id,
                contactType: contactData.contactType,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                title: contactData.title,
                phone: contactData.phone,
                email: contactData.email,
            });
        }
    },
});

export const importSchoolSchedules = mutation({
    args: {
        schedules: v.array(v.object({
            schoolName: v.string(), // Used for lookup
            amStartTime: v.string(),
            pmReleaseTime: v.string(),
            minDayDismissalTime: v.optional(v.string()),
            minimumDays: v.optional(v.string()),
            earlyRelease: v.optional(v.string()),
            pmAftercare: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        for (const scheduleData of args.schedules) {
            const school = await ctx.db
                .query("schools")
                .withIndex("by_school_name", (q) => q.eq("schoolName", scheduleData.schoolName))
                .first();

            if (!school) {
                console.warn(`School not found for schedule: ${scheduleData.schoolName}`);
                continue;
            }

            // Check for existing schedule to avoid duplicates/stacking
            const existing = await ctx.db
                .query("schoolSchedules")
                .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                .first();

            const schedule = {
                schoolId: school._id,
                amStartTime: scheduleData.amStartTime,
                pmReleaseTime: scheduleData.pmReleaseTime,
                minDayDismissalTime: scheduleData.minDayDismissalTime,
                minimumDays: scheduleData.minimumDays,
                earlyRelease: scheduleData.earlyRelease,
                pmAftercare: scheduleData.pmAftercare,
            };

            if (existing) {
                await ctx.db.patch(existing._id, schedule);
            } else {
                await ctx.db.insert("schoolSchedules", schedule);
            }
        }
    },
});

export const importNonSchoolDays = mutation({
    args: {
        days: v.array(v.object({
            schoolName: v.string(), // Used for lookup
            date: v.string(),
            description: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        for (const dayData of args.days) {
            const school = await ctx.db
                .query("schools")
                .withIndex("by_school_name", (q) => q.eq("schoolName", dayData.schoolName))
                .first();

            if (!school) {
                console.warn(`School not found for non-school day: ${dayData.schoolName}`);
                continue;
            }

            // Check for existing entry
            const existing = await ctx.db
                .query("nonSchoolDays")
                .withIndex("by_school_date", (q) => q.eq("schoolId", school._id).eq("date", dayData.date))
                .first();

            if (!existing) {
                await ctx.db.insert("nonSchoolDays", {
                    schoolId: school._id,
                    date: dayData.date,
                    description: dayData.description,
                });
            }
        }
    },
});

// ============================================================================
// UPDATE MUTATIONS
// Used by the Dispatch App UI to edit existing records
// ============================================================================

/**
 * Update an existing district record.
 * All fields except id are optional - only provided fields will be updated.
 */
export const updateDistrict = mutation({
    args: {
        id: v.id("districts"),
        districtName: v.optional(v.string()),
        clientName: v.optional(v.string()),
        rate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return id;
    },
});

/**
 * Update an existing school record.
 * All fields except id are optional - only provided fields will be updated.
 */
export const updateSchool = mutation({
    args: {
        id: v.id("schools"),
        districtId: v.optional(v.id("districts")),
        schoolName: v.optional(v.string()),
        streetAddress: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        officePhone: v.optional(v.string()),
        firstDay: v.optional(v.string()),
        lastDay: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return id;
    },
});

// ============================================================================
// QUERY FUNCTIONS
// Used by the Dispatch App UI to display schools data
// ============================================================================

import { query } from "./_generated/server";

/**
 * Get all districts with their rates
 * Used for: District selection dropdown, District list view
 */
export const getDistricts = query({
    args: {},
    handler: async (ctx) => {
        const districts = await ctx.db.query("districts").collect();
        return districts.sort((a, b) => a.districtName.localeCompare(b.districtName));
    },
});

/**
 * Get all schools with their district information
 * Used for: Schools list view, School selection dropdown
 */
export const getSchools = query({
    args: {},
    handler: async (ctx) => {
        const schools = await ctx.db.query("schools").collect();

        // Enrich with district names
        const schoolsWithDistricts = await Promise.all(
            schools.map(async (school) => {
                const district = await ctx.db.get(school.districtId);
                return {
                    ...school,
                    districtName: district?.districtName || "Unknown District",
                };
            })
        );

        return schoolsWithDistricts.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
    },
});

/**
 * Get schools filtered by district
 * Used for: District-specific school lists
 */
export const getSchoolsByDistrict = query({
    args: { districtId: v.id("districts") },
    handler: async (ctx, args) => {
        const schools = await ctx.db
            .query("schools")
            .filter((q) => q.eq(q.field("districtId"), args.districtId))
            .collect();

        return schools.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
    },
});

/**
 * Get complete school details including contacts, schedule, and non-school days
 * Used for: School details modal/screen
 */
export const getSchoolDetails = query({
    args: { schoolId: v.id("schools") },
    handler: async (ctx, args) => {
        const school = await ctx.db.get(args.schoolId);
        if (!school) {
            throw new Error(`School not found: ${args.schoolId}`);
        }

        const district = await ctx.db.get(school.districtId);

        const contacts = await ctx.db
            .query("schoolContacts")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        const schedule = await ctx.db
            .query("schoolSchedules")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .first();

        const nonSchoolDays = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        return {
            ...school,
            districtName: district?.districtName || "Unknown District",
            districtRate: district?.rate || 0,
            contacts: contacts.sort((a, b) => {
                // Sort by contact type: Primary, Secondary, Afterschool
                const order = { Primary: 1, Secondary: 2, Afterschool: 3 };
                return (order[a.contactType as keyof typeof order] || 99) - (order[b.contactType as keyof typeof order] || 99);
            }),
            schedule,
            nonSchoolDays: nonSchoolDays.sort((a, b) => a.date.localeCompare(b.date)),
        };
    },
});
