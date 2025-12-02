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

// ============================================================================
// DRIVER APP QUERIES
// Used by the Driver Mobile App for real-time schedule validation
// ============================================================================

/**
 * Get school schedule by school ID
 * Used for: Driver App - validate pickup times against school hours
 */
export const getSchoolSchedule = query({
    args: { schoolId: v.id("schools") },
    handler: async (ctx, args) => {
        const schedule = await ctx.db
            .query("schoolSchedules")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .first();

        return schedule || null;
    },
});

/**
 * Get all non-school days for a specific school
 * Used for: Driver App - prevent pickups on holidays
 */
export const getNonSchoolDays = query({
    args: { schoolId: v.id("schools") },
    handler: async (ctx, args) => {
        const nonSchoolDays = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        return nonSchoolDays.sort((a, b) => a.date.localeCompare(b.date));
    },
});

/**
 * Check if a specific date is a non-school day
 * Used for: Driver App - quick validation before pickup
 */
export const isNonSchoolDay = query({
    args: {
        schoolId: v.id("schools"),
        date: v.string(), // YYYY-MM-DD format
    },
    handler: async (ctx, args) => {
        const nonSchoolDay = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", args.schoolId).eq("date", args.date)
            )
            .first();

        return {
            isNonSchoolDay: nonSchoolDay !== null,
            description: nonSchoolDay?.description || null,
        };
    },
});

/**
 * Get school by name (for looking up schoolId from child.schoolName)
 * Used for: Driver App - resolve school ID from child record
 */
export const getSchoolByName = query({
    args: { schoolName: v.string() },
    handler: async (ctx, args) => {
        const school = await ctx.db
            .query("schools")
            .withIndex("by_school_name", (q) => q.eq("schoolName", args.schoolName))
            .first();

        return school || null;
    },
});

// ============================================================================
// NON-SCHOOL DAYS MANAGEMENT
// Used for data import/cleanup operations
// ============================================================================

/**
 * Delete non-school days for a specific month and year across all schools
 * Used for: Data cleanup before re-importing corrected dates
 */
export const deleteNonSchoolDaysByMonth = mutation({
    args: {
        year: v.number(),
        month: v.number(), // 1-12
    },
    handler: async (ctx, args) => {
        const { year, month } = args;
        const monthStr = month.toString().padStart(2, '0');
        const datePrefix = `${year}-${monthStr}`;

        // Get all non-school days
        const allDays = await ctx.db.query("nonSchoolDays").collect();

        // Filter to those matching the month prefix
        const toDelete = allDays.filter(day => day.date.startsWith(datePrefix));

        let deletedCount = 0;
        for (const day of toDelete) {
            await ctx.db.delete(day._id);
            deletedCount++;
        }

        return { deletedCount, datePrefix };
    },
});

/**
 * Normalize school name for fuzzy matching.
 * Handles common variations between Google Sheets and Convex naming:
 * - Missing "School" suffix (e.g., "Bacich Elementary" → "Bacich Elementary School")
 * - Missing apostrophes (e.g., "Marins" → "Marin's")
 * - Prefix variations (e.g., "Cypress School" → "UCPNB Cypress School")
 * - Type variations (e.g., "Bayhill Academy" → "Bayhill High School")
 * - Abbreviations (e.g., "Headlands Prepartory School" → "Headlands Prep")
 * - Suffix variations (e.g., "Marindale School AM Class" → "Marindale School")
 */
function normalizeSchoolName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[']/g, "")           // Remove apostrophes
        .replace(/\s+/g, " ")          // Normalize whitespace
        .replace(/ am class$/i, "")    // Remove "AM Class" suffix
        .replace(/ school(\s|$)/gi, " ") // Remove "School" anywhere (not just end)
        .replace(/ elementary(\s|$)/gi, " ") // Remove "Elementary"
        .replace(/ middle(\s|$)/gi, " ")     // Remove "Middle"
        .replace(/ high(\s|$)/gi, " ")       // Remove "High"
        .replace(/ academy(\s|$)/gi, " ")    // Remove "Academy"
        .replace(/ prep(\s|$)/gi, " ")       // Remove "Prep"
        .replace(/^ucpnb /i, "")       // Remove UCPNB prefix
        .replace(/prepartory/i, "prep") // Fix typo: "Prepartory" → "Prep"
        .replace(/\s+/g, " ")          // Normalize whitespace again
        .trim();
}

/**
 * Find best matching school by name using fuzzy matching.
 * First tries exact match, then normalized match.
 */
async function findSchoolByFuzzyName(
    ctx: any,
    inputName: string
): Promise<{ _id: any; schoolName: string } | null> {
    // 1. Try exact match first (fastest)
    const exactMatch = await ctx.db
        .query("schools")
        .withIndex("by_school_name", (q: any) => q.eq("schoolName", inputName))
        .first();
    if (exactMatch) return exactMatch;

    // 2. Normalize input and search all schools for best match
    const normalizedInput = normalizeSchoolName(inputName);
    const allSchools = await ctx.db.query("schools").collect();

    for (const school of allSchools) {
        const normalizedDb = normalizeSchoolName(school.schoolName);

        // Check if normalized names match
        if (normalizedDb === normalizedInput) {
            return school;
        }

        // Check if one contains the other (handles prefix/suffix variations)
        if (normalizedDb.includes(normalizedInput) || normalizedInput.includes(normalizedDb)) {
            // Verify it's a reasonable match (not too short)
            const shorter = normalizedInput.length < normalizedDb.length ? normalizedInput : normalizedDb;
            if (shorter.length >= 5) {
                return school;
            }
        }
    }

    return null;
}

/**
 * Bulk import non-school days with upsert behavior
 * Replaces existing entries if they exist, otherwise inserts new ones
 * Uses fuzzy name matching to handle Sheet ↔ Convex naming variations
 */
export const upsertNonSchoolDays = mutation({
    args: {
        days: v.array(v.object({
            schoolName: v.string(),
            date: v.string(), // YYYY-MM-DD format
            description: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const matchedNames: Record<string, string> = {}; // Track Sheet→Convex mappings

        for (const dayData of args.days) {
            // Find school by fuzzy name matching
            const school = await findSchoolByFuzzyName(ctx, dayData.schoolName);

            if (!school) {
                console.warn(`School not found: ${dayData.schoolName}`);
                skippedCount++;
                continue;
            }

            // Log the match if it's not exact (for debugging)
            if (school.schoolName !== dayData.schoolName && !matchedNames[dayData.schoolName]) {
                matchedNames[dayData.schoolName] = school.schoolName;
                console.log(`Matched: "${dayData.schoolName}" → "${school.schoolName}"`);
            }

            // Check for existing entry
            const existing = await ctx.db
                .query("nonSchoolDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", school._id).eq("date", dayData.date)
                )
                .first();

            if (existing) {
                // Update existing
                await ctx.db.patch(existing._id, {
                    description: dayData.description,
                });
                updatedCount++;
            } else {
                // Insert new
                await ctx.db.insert("nonSchoolDays", {
                    schoolId: school._id,
                    date: dayData.date,
                    description: dayData.description,
                });
                insertedCount++;
            }
        }

        return { insertedCount, updatedCount, skippedCount };
    },
});

// ============================================================================
// ROUTE SCHEDULING - Time Resolution & Validation
// Used for accurate pickup/dropoff times in Driver App
// ============================================================================

/**
 * Check if a specific date is a non-school day for a given school
 * Used by: Route creation validation in assignments.ts
 * Returns: null if school is open, or closure info if closed
 */
export const checkNonSchoolDay = query({
    args: {
        schoolId: v.id("schools"),
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, args) => {
        const { schoolId, date } = args;

        const nonSchoolDay = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", schoolId).eq("date", date)
            )
            .first();

        if (!nonSchoolDay) {
            return null; // School is open
        }

        // Get school name for better error messages
        const school = await ctx.db.get(schoolId);

        return {
            isClosed: true,
            description: nonSchoolDay.description || "School Closed",
            schoolName: school?.schoolName || "Unknown School",
            date,
        };
    },
});

/**
 * Check non-school day by school name (for child lookups)
 * Used by: Driver App and Dispatch App when childId is available
 */
export const checkNonSchoolDayByName = query({
    args: {
        schoolName: v.string(),
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, args) => {
        const { schoolName, date } = args;

        // Find school by name
        const school = await ctx.db
            .query("schools")
            .withIndex("by_school_name", (q) => q.eq("schoolName", schoolName))
            .first();

        if (!school) {
            return { error: "School not found" };
        }

        const nonSchoolDay = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", school._id).eq("date", date)
            )
            .first();

        if (!nonSchoolDay) {
            return null; // School is open
        }

        return {
            isClosed: true,
            description: nonSchoolDay.description || "School Closed",
            schoolName: school.schoolName,
            date,
        };
    },
});

/**
 * Get effective pickup/dropoff time for a child on a specific date
 * Resolves time based on: Early Out Days > Minimum Days > Regular Schedule
 * Used by: Driver App for accurate time display
 */
export const getEffectivePickupTime = query({
    args: {
        childId: v.id("children"),
        date: v.string(), // YYYY-MM-DD
        period: v.union(v.literal("AM"), v.literal("PM")),
    },
    handler: async (ctx, args) => {
        const { childId, date, period } = args;

        // Get child data
        const child = await ctx.db.get(childId);
        if (!child) {
            return { error: "Child not found" };
        }

        // Find school by name
        const school = await ctx.db
            .query("schools")
            .withIndex("by_school_name", (q) => q.eq("schoolName", child.schoolName))
            .first();

        if (!school) {
            // Fallback to child's time if no school found
            return {
                time: period === "AM" ? child.pickupTime : child.classEndTime,
                source: "child_record",
                adjustment: null,
            };
        }

        // Get school schedule
        const schedule = await ctx.db
            .query("schoolSchedules")
            .withIndex("by_school", (q) => q.eq("schoolId", school._id))
            .first();

        // Check for non-school day
        const nonSchoolDay = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", school._id).eq("date", date)
            )
            .first();

        if (nonSchoolDay) {
            return {
                time: null,
                source: "non_school_day",
                adjustment: nonSchoolDay.description || "School Closed",
                isClosed: true,
            };
        }

        // For AM routes, use child's pickup time or school start time
        if (period === "AM") {
            return {
                time: child.pickupTime || (schedule ? calculatePickupFromStart(schedule.amStartTime) : null),
                source: child.pickupTime ? "child_record" : "school_schedule",
                adjustment: null,
            };
        }

        // For PM routes, check early out days first
        const earlyOut = await ctx.db
            .query("earlyOutDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", school._id).eq("date", date)
            )
            .first();

        if (earlyOut) {
            return {
                time: earlyOut.dismissalTime,
                source: "early_out_day",
                adjustment: earlyOut.reason || "Early Release",
            };
        }

        // Check for minimum day (check day of week against schedule)
        if (schedule?.minimumDays && schedule.minDayDismissalTime) {
            const dayOfWeek = new Date(date).getDay();
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayName = dayNames[dayOfWeek];

            // Check if this day is a minimum day
            const minimumDays = schedule.minimumDays.toLowerCase();
            if (
                minimumDays.includes(dayName.toLowerCase()) ||
                minimumDays.includes("every") ||
                (minimumDays === "varies" && dayOfWeek === 5) // Assume Friday for "Varies"
            ) {
                return {
                    time: schedule.minDayDismissalTime,
                    source: "minimum_day",
                    adjustment: "Minimum Day",
                };
            }
        }

        // Check for weekly early release (e.g., "Every Wed 2:00 PM")
        if (schedule?.earlyRelease) {
            const dayOfWeek = new Date(date).getDay();
            const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            const shortDay = dayNames[dayOfWeek];

            const earlyRelease = schedule.earlyRelease.toLowerCase();
            if (earlyRelease.includes(shortDay) || earlyRelease.includes("every")) {
                // Extract time from earlyRelease string (e.g., "Every Wed 2:00 PM" → "2:00 PM")
                const timeMatch = schedule.earlyRelease.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                if (timeMatch) {
                    return {
                        time: timeMatch[1],
                        source: "weekly_early_release",
                        adjustment: "Early Release",
                    };
                }
            }
        }

        // Default: Use child's classEndTime or school's pmReleaseTime
        return {
            time: child.classEndTime || schedule?.pmReleaseTime || null,
            source: child.classEndTime ? "child_record" : "school_schedule",
            adjustment: null,
        };
    },
});

/**
 * Helper: Calculate pickup time from school start (30 min before)
 */
function calculatePickupFromStart(amStartTime: string): string | null {
    if (!amStartTime) return null;

    try {
        // Parse time like "8:45 AM"
        const match = amStartTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return amStartTime;

        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const meridiem = match[3].toUpperCase();

        // Convert to 24-hour
        if (meridiem === "PM" && hours !== 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;

        // Subtract 30 minutes for pickup
        let pickupMinutes = minutes - 30;
        let pickupHours = hours;
        if (pickupMinutes < 0) {
            pickupMinutes += 60;
            pickupHours -= 1;
        }

        // Convert back to 12-hour
        const pickupMeridiem = pickupHours >= 12 ? "PM" : "AM";
        const displayHours = pickupHours % 12 || 12;

        return `${displayHours}:${pickupMinutes.toString().padStart(2, "0")} ${pickupMeridiem}`;
    } catch {
        return amStartTime;
    }
}

// ============================================================================
// EARLY OUT DAYS MANAGEMENT
// Used for data import/cleanup operations
// ============================================================================

/**
 * Upsert early out days with fuzzy school name matching
 * Used for: Bulk import from Google Sheets
 */
export const upsertEarlyOutDays = mutation({
    args: {
        days: v.array(v.object({
            schoolName: v.string(),
            date: v.string(), // YYYY-MM-DD format
            dismissalTime: v.string(), // e.g., "12:30 PM"
            reason: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const matchedNames: Record<string, string> = {};

        for (const dayData of args.days) {
            // Find school by fuzzy name matching
            const school = await findSchoolByFuzzyName(ctx, dayData.schoolName);

            if (!school) {
                console.warn(`School not found: ${dayData.schoolName}`);
                skippedCount++;
                continue;
            }

            // Log the match if not exact
            if (school.schoolName !== dayData.schoolName && !matchedNames[dayData.schoolName]) {
                matchedNames[dayData.schoolName] = school.schoolName;
                console.log(`Matched: "${dayData.schoolName}" → "${school.schoolName}"`);
            }

            // Check for existing entry
            const existing = await ctx.db
                .query("earlyOutDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", school._id).eq("date", dayData.date)
                )
                .first();

            if (existing) {
                // Update existing
                await ctx.db.patch(existing._id, {
                    dismissalTime: dayData.dismissalTime,
                    reason: dayData.reason,
                });
                updatedCount++;
            } else {
                // Insert new
                await ctx.db.insert("earlyOutDays", {
                    schoolId: school._id,
                    date: dayData.date,
                    dismissalTime: dayData.dismissalTime,
                    reason: dayData.reason,
                });
                insertedCount++;
            }
        }

        return { insertedCount, updatedCount, skippedCount, matchedNames };
    },
});

/**
 * Delete early out days for a specific month and year
 * Used for: Data cleanup before re-importing corrected dates
 */
export const deleteEarlyOutDaysByMonth = mutation({
    args: {
        year: v.number(),
        month: v.number(), // 1-12
    },
    handler: async (ctx, args) => {
        const { year, month } = args;
        const monthStr = month.toString().padStart(2, '0');
        const datePrefix = `${year}-${monthStr}`;

        // Get all early out days
        const allDays = await ctx.db.query("earlyOutDays").collect();

        // Filter to those matching the month prefix
        const toDelete = allDays.filter(day => day.date.startsWith(datePrefix));

        let deletedCount = 0;
        for (const day of toDelete) {
            await ctx.db.delete(day._id);
            deletedCount++;
        }

        return { deletedCount, datePrefix };
    },
});

/**
 * Get all early out days for a specific school
 * Used for: School schedule view in Dispatch App
 */
export const getEarlyOutDaysForSchool = query({
    args: {
        schoolId: v.id("schools"),
    },
    handler: async (ctx, args) => {
        const days = await ctx.db
            .query("earlyOutDays")
            .withIndex("by_school", (q) => q.eq("schoolId", args.schoolId))
            .collect();

        return days.sort((a, b) => a.date.localeCompare(b.date));
    },
});

// ============================================================================
// DISPATCH APP - SMART COPY SCHEDULING INTELLIGENCE
// Used for pre-flight validation when copying routes
// ============================================================================

/**
 * Get all school closures and schedule adjustments for a specific date
 * Used for: Dispatch App - CollapsibleAlertsBanner component
 *
 * Features:
 * - Lists all schools that are closed on the target date
 * - Lists all schools with early dismissal/schedule adjustments
 * - Supports "Rain Day Test" mode to simulate all schools closed (dev testing)
 */
export const getSchedulingAlertsForDate = query({
    args: {
        date: v.string(), // YYYY-MM-DD
        simulateAllClosed: v.optional(v.boolean()), // "Rain Day Test" mode
    },
    handler: async (ctx, args) => {
        const { date, simulateAllClosed } = args;

        const closures: Array<{
            schoolId: string;
            schoolName: string;
            reason: string;
        }> = [];

        const adjustments: Array<{
            schoolId: string;
            schoolName: string;
            type: "early_out" | "minimum_day" | "weekly_early";
            time: string;
            reason: string;
        }> = [];

        // Get all schools
        const allSchools = await ctx.db.query("schools").collect();

        for (const school of allSchools) {
            // RAIN DAY TEST MODE: Simulate all schools closed
            if (simulateAllClosed) {
                closures.push({
                    schoolId: school._id,
                    schoolName: school.schoolName,
                    reason: "Rain Day (Test Mode)",
                });
                continue;
            }

            // Check for non-school day (closure)
            const nonSchoolDay = await ctx.db
                .query("nonSchoolDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", school._id).eq("date", date)
                )
                .first();

            if (nonSchoolDay) {
                closures.push({
                    schoolId: school._id,
                    schoolName: school.schoolName,
                    reason: nonSchoolDay.description || "School Closed",
                });
                continue; // Skip time adjustments for closed schools
            }

            // Check for early out day (specific date adjustment)
            const earlyOut = await ctx.db
                .query("earlyOutDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", school._id).eq("date", date)
                )
                .first();

            if (earlyOut) {
                adjustments.push({
                    schoolId: school._id,
                    schoolName: school.schoolName,
                    type: "early_out",
                    time: earlyOut.dismissalTime,
                    reason: earlyOut.reason || "Early Dismissal",
                });
                continue; // Specific early out takes priority over weekly patterns
            }

            // Check for minimum day or weekly early release (based on schedule)
            const schedule = await ctx.db
                .query("schoolSchedules")
                .withIndex("by_school", (q) => q.eq("schoolId", school._id))
                .first();

            if (schedule) {
                const dayOfWeek = new Date(date).getDay();
                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const dayName = dayNames[dayOfWeek];

                // Check minimum days
                if (schedule.minimumDays && schedule.minDayDismissalTime) {
                    const minimumDays = schedule.minimumDays.toLowerCase();
                    if (
                        minimumDays.includes(dayName.toLowerCase()) ||
                        minimumDays.includes("every") ||
                        (minimumDays === "varies" && dayOfWeek === 5)
                    ) {
                        adjustments.push({
                            schoolId: school._id,
                            schoolName: school.schoolName,
                            type: "minimum_day",
                            time: schedule.minDayDismissalTime,
                            reason: "Minimum Day",
                        });
                        continue;
                    }
                }

                // Check weekly early release
                if (schedule.earlyRelease) {
                    const shortDayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                    const shortDay = shortDayNames[dayOfWeek];
                    const earlyRelease = schedule.earlyRelease.toLowerCase();

                    if (earlyRelease.includes(shortDay) || earlyRelease.includes("every")) {
                        const timeMatch = schedule.earlyRelease.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                        if (timeMatch) {
                            adjustments.push({
                                schoolId: school._id,
                                schoolName: school.schoolName,
                                type: "weekly_early",
                                time: timeMatch[1],
                                reason: "Weekly Early Release",
                            });
                        }
                    }
                }
            }
        }

        return {
            date,
            closures: closures.sort((a, b) => a.schoolName.localeCompare(b.schoolName)),
            adjustments: adjustments.sort((a, b) => a.schoolName.localeCompare(b.schoolName)),
            totalAlerts: closures.length + adjustments.length,
            isRainDayTest: simulateAllClosed || false,
        };
    },
});

/**
 * Get all scheduling data for a date (non-school days + early outs)
 * Used for: Driver App route cards - bulk lookup
 */
export const getSchedulingDataForDate = query({
    args: {
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, args) => {
        const { date } = args;

        // Get all non-school days for this date
        const nonSchoolDays = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_date", (q) => q.eq("date", date))
            .collect();

        // Get all early out days for this date
        const earlyOutDays = await ctx.db
            .query("earlyOutDays")
            .withIndex("by_date", (q) => q.eq("date", date))
            .collect();

        // Convert to lookup maps by schoolId
        const closedSchools: Record<string, string> = {};
        for (const day of nonSchoolDays) {
            closedSchools[day.schoolId] = day.description || "School Closed";
        }

        const earlyDismissals: Record<string, { time: string; reason: string }> = {};
        for (const day of earlyOutDays) {
            earlyDismissals[day.schoolId] = {
                time: day.dismissalTime,
                reason: day.reason || "Early Release",
            };
        }

        return { closedSchools, earlyDismissals, date };
    },
});

// ============================================================================
// SCHOOL CALENDAR MODAL - Interactive Calendar Mutations
// Used by Dispatch App UI for visual non-school day management
// ============================================================================

/**
 * Add a single non-school day
 * Used by: School Calendar Modal - clicking a day to mark as closed
 */
export const addNonSchoolDay = mutation({
    args: {
        schoolId: v.id("schools"),
        date: v.string(), // YYYY-MM-DD
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check for existing entry to avoid duplicates
        const existing = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", args.schoolId).eq("date", args.date)
            )
            .first();

        if (existing) {
            // Update description if provided
            if (args.description !== undefined) {
                await ctx.db.patch(existing._id, { description: args.description });
            }
            return existing._id;
        }

        return await ctx.db.insert("nonSchoolDays", {
            schoolId: args.schoolId,
            date: args.date,
            description: args.description,
        });
    },
});

/**
 * Remove a single non-school day
 * Used by: School Calendar Modal - clicking a marked day to unmark
 */
export const removeNonSchoolDay = mutation({
    args: {
        schoolId: v.id("schools"),
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("nonSchoolDays")
            .withIndex("by_school_date", (q) =>
                q.eq("schoolId", args.schoolId).eq("date", args.date)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return true;
        }
        return false;
    },
});

/**
 * Bulk update non-school days for a school
 * Used by: School Calendar Modal - Save button (batch operation)
 * Efficiently handles adding and removing multiple dates in one transaction
 */
export const bulkUpdateNonSchoolDays = mutation({
    args: {
        schoolId: v.id("schools"),
        toAdd: v.array(
            v.object({
                date: v.string(),
                description: v.optional(v.string()),
            })
        ),
        toRemove: v.array(v.string()), // Array of date strings to remove
    },
    handler: async (ctx, args) => {
        let added = 0;
        let removed = 0;

        // Remove dates first
        for (const date of args.toRemove) {
            const existing = await ctx.db
                .query("nonSchoolDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", args.schoolId).eq("date", date)
                )
                .first();

            if (existing) {
                await ctx.db.delete(existing._id);
                removed++;
            }
        }

        // Add new dates
        for (const day of args.toAdd) {
            const existing = await ctx.db
                .query("nonSchoolDays")
                .withIndex("by_school_date", (q) =>
                    q.eq("schoolId", args.schoolId).eq("date", day.date)
                )
                .first();

            if (!existing) {
                await ctx.db.insert("nonSchoolDays", {
                    schoolId: args.schoolId,
                    date: day.date,
                    description: day.description,
                });
                added++;
            }
        }

        return { added, removed };
    },
});

/**
 * Bulk update school first/last day dates using fuzzy name matching
 * Used by: Data import from Google Sheets to fix missing/incorrect dates
 *
 * Converts date formats:
 * - "8/12/2025" → "2025-08-12" (MM/DD/YYYY → YYYY-MM-DD)
 * - "Ongoing" → "Ongoing" (preserved as-is for special cases)
 * - Empty string → null (skipped)
 */
export const bulkUpdateSchoolDates = mutation({
    args: {
        schools: v.array(v.object({
            schoolName: v.string(),
            firstDay: v.string(), // MM/DD/YYYY or "Ongoing" or empty
            lastDay: v.string(),  // MM/DD/YYYY or empty
        })),
    },
    handler: async (ctx, args) => {
        let updatedCount = 0;
        let skippedCount = 0;
        const matchedNames: Record<string, string> = {};
        const notFound: string[] = [];

        // Helper to convert MM/DD/YYYY to YYYY-MM-DD
        const convertDate = (dateStr: string): string | null => {
            if (!dateStr || dateStr.trim() === "") return null;
            if (dateStr === "Ongoing") return "Ongoing";

            // Check if it's already YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }

            // Parse MM/DD/YYYY format
            const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match) {
                const [, month, day, year] = match;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Try to parse other formats (e.g., "5/22" as "5/22/2026")
            const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
            if (shortMatch) {
                const [, month, day] = shortMatch;
                // Assume 2026 for school year end dates
                return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            console.warn(`Could not parse date: "${dateStr}"`);
            return null;
        };

        for (const schoolData of args.schools) {
            // Skip empty school names
            if (!schoolData.schoolName || schoolData.schoolName.trim() === "") {
                skippedCount++;
                continue;
            }

            // Find school using fuzzy matching
            const school = await findSchoolByFuzzyName(ctx, schoolData.schoolName);

            if (!school) {
                notFound.push(schoolData.schoolName);
                skippedCount++;
                continue;
            }

            // Log fuzzy matches for debugging
            if (school.schoolName !== schoolData.schoolName && !matchedNames[schoolData.schoolName]) {
                matchedNames[schoolData.schoolName] = school.schoolName;
                console.log(`Matched: "${schoolData.schoolName}" → "${school.schoolName}"`);
            }

            // Convert dates
            const firstDay = convertDate(schoolData.firstDay);
            const lastDay = convertDate(schoolData.lastDay);

            // Build update object (only include non-null values)
            const updates: Record<string, string> = {};
            if (firstDay !== null) updates.firstDay = firstDay;
            if (lastDay !== null) updates.lastDay = lastDay;

            // Skip if no valid dates to update
            if (Object.keys(updates).length === 0) {
                skippedCount++;
                continue;
            }

            // Update the school
            await ctx.db.patch(school._id, updates);
            updatedCount++;
        }

        return {
            updatedCount,
            skippedCount,
            notFound,
            matchedNames
        };
    },
});

/**
 * Create or update school schedule (upsert)
 * Used by: School Calendar Modal - Save button for schedule times
 */
export const upsertSchoolSchedule = mutation({
    args: {
        schoolId: v.id("schools"),
        amStartTime: v.string(),
        pmReleaseTime: v.string(),
        minDayDismissalTime: v.optional(v.string()),
        minimumDays: v.optional(v.string()),
        earlyRelease: v.optional(v.string()),
        pmAftercare: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { schoolId, ...scheduleData } = args;

        // Check for existing schedule
        const existing = await ctx.db
            .query("schoolSchedules")
            .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
            .first();

        if (existing) {
            // Update existing schedule
            await ctx.db.patch(existing._id, scheduleData);
            return existing._id;
        } else {
            // Create new schedule
            return await ctx.db.insert("schoolSchedules", {
                schoolId,
                ...scheduleData,
            });
        }
    },
});
