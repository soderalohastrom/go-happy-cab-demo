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
