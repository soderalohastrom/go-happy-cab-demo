import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// BULK IMPORT MUTATIONS
// ============================================================================

export const importDrivers = mutation({
    args: {
        drivers: v.array(v.object({
            firstName: v.string(),
            middleName: v.optional(v.string()),
            lastName: v.string(),
            email: v.string(),
            phone: v.string(),
            address: v.optional(v.object({
                street: v.string(),
                street2: v.optional(v.string()),
                city: v.string(),
                state: v.string(),
                zip: v.string(),
            })),
            ssn: v.optional(v.string()),
            itin: v.optional(v.string()),
            licenseNumber: v.optional(v.string()),
            fingerprintsOnFile: v.optional(v.boolean()),
            fingerprintsVerified: v.optional(v.boolean()),
            tbTestVerified: v.optional(v.boolean()),
            taxiApplicationStatus: v.optional(v.string()),
            mvrStatus: v.optional(v.string()),
            primaryLanguage: v.optional(v.string()),
            availabilityAM: v.optional(v.string()),
            availabilityPM: v.optional(v.string()),
            specialEquipment: v.optional(v.string()),
            startDate: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const results = { created: 0, updated: 0, skipped: 0 };

        for (const driver of args.drivers) {
            // Check for existing driver by email
            const existing = await ctx.db
                .query("drivers")
                .withIndex("by_email", (q) => q.eq("email", driver.email))
                .first();

            if (existing) {
                // Update existing driver
                await ctx.db.patch(existing._id, {
                    ...driver,
                    updatedAt: new Date().toISOString(),
                });
                results.updated++;
            } else {
                // Create new driver
                // Note: We are NOT creating Clerk users here, just DB records
                await ctx.db.insert("drivers", {
                    ...driver,
                    employeeId: `D-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                    role: "driver",
                    status: "active",
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                results.created++;
            }
        }
        return results;
    },
});

export const importChildren = mutation({
    args: {
        children: v.array(v.object({
            firstName: v.string(),
            lastName: v.string(),
            schoolName: v.string(),
            grade: v.optional(v.string()),
            dateOfBirth: v.optional(v.string()),
            studentId: v.optional(v.string()),
            homeLanguage: v.optional(v.string()),
            rideType: v.optional(v.string()),
            pickupTime: v.optional(v.string()),
            classStartTime: v.optional(v.string()),
            classEndTime: v.optional(v.string()),
            homeAddress: v.optional(v.object({
                street: v.string(),
                city: v.string(),
                state: v.string(),
                zip: v.string(),
            })),
            parent1: v.optional(v.object({
                firstName: v.string(),
                lastName: v.string(),
                phone: v.string(),
            })),
            teacher: v.optional(v.object({
                firstName: v.string(),
                lastName: v.string(),
                phone: v.optional(v.string()),
            })),
            caseManager: v.optional(v.object({
                firstName: v.string(),
                lastName: v.string(),
            })),
            seizureProtocol: v.optional(v.boolean()),
            boosterSeat: v.optional(v.boolean()),
            notes: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const results = { created: 0, updated: 0, skipped: 0 };

        for (const childData of args.children) {
            // 1. Find School ID
            const school = await ctx.db
                .query("schools")
                .withIndex("by_school_name", (q) => q.eq("schoolName", childData.schoolName))
                .first();

            if (!school) {
                console.warn(`School not found: ${childData.schoolName}`);
                // Proceed without schoolId or skip? Let's proceed but log it.
            }

            // 2. Check for existing child (by Name - simplistic but effective for this dataset)
            // Ideally we'd use studentId if available and reliable
            const existing = await ctx.db
                .query("children")
                .withIndex("by_last_name", (q) => q.eq("lastName", childData.lastName))
                .filter(q => q.eq(q.field("firstName"), childData.firstName))
                .first();

            const childRecord = {
                firstName: childData.firstName,
                lastName: childData.lastName,
                schoolName: childData.schoolName,
                schoolId: school?._id,
                grade: childData.grade || "Unknown",
                dateOfBirth: childData.dateOfBirth || "2010-01-01",
                studentId: childData.studentId || `S-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                homeLanguage: childData.homeLanguage,
                rideType: childData.rideType,
                pickupTime: childData.pickupTime,
                classStartTime: childData.classStartTime,
                classEndTime: childData.classEndTime,
                homeAddress: childData.homeAddress,
                parent1: childData.parent1,
                teacher: childData.teacher,
                caseManager: childData.caseManager,
                seizureProtocol: childData.seizureProtocol,
                boosterSeat: childData.boosterSeat,
                notes: childData.notes,
                active: true,
                updatedAt: new Date().toISOString(),
            };

            if (existing) {
                await ctx.db.patch(existing._id, childRecord);
                results.updated++;
            } else {
                await ctx.db.insert("children", {
                    ...childRecord,
                    createdAt: new Date().toISOString(),
                });
                results.created++;
            }
        }
        return results;
    },
});

export const importAssignments = mutation({
    args: {
        assignments: v.array(v.object({
            childFirstName: v.string(),
            childLastName: v.string(),
            driverFirstName: v.string(), // Sheet1 only has first name for drivers
            period: v.union(v.literal("AM"), v.literal("PM")),
            type: v.union(v.literal("pickup"), v.literal("dropoff")),
        })),
    },
    handler: async (ctx, args) => {
        const results = { created: 0, skipped: 0, errors: [] as string[] };
        const today = new Date().toISOString().split('T')[0]; // Default to today for initial assignment

        for (const assignment of args.assignments) {
            // 1. Find Child
            const child = await ctx.db
                .query("children")
                .withIndex("by_last_name", (q) => q.eq("lastName", assignment.childLastName))
                .filter(q => q.eq(q.field("firstName"), assignment.childFirstName))
                .first();

            if (!child) {
                results.errors.push(`Child not found: ${assignment.childFirstName} ${assignment.childLastName}`);
                results.skipped++;
                continue;
            }

            // 2. Find Driver (Fuzzy match by First Name)
            // This is risky! But it's what the data allows.
            // We fetch all drivers and find the one that matches the first name.
            // If multiple match, we might have an issue.
            const drivers = await ctx.db.query("drivers").collect();
            const driver = drivers.find(d => d.firstName.trim().toLowerCase() === assignment.driverFirstName.trim().toLowerCase());

            if (!driver) {
                results.errors.push(`Driver not found: ${assignment.driverFirstName}`);
                results.skipped++;
                continue;
            }

            // 3. Create Route
            // Check if already assigned for today/period to avoid duplicates
            const existingRoute = await ctx.db
                .query("routes")
                .withIndex("by_child_date_period", (q) =>
                    q.eq("childId", child._id)
                        .eq("date", today)
                        .eq("period", assignment.period)
                )
                .first();

            if (!existingRoute) {
                await ctx.db.insert("routes", {
                    driverId: driver._id,
                    childId: child._id,
                    date: today,
                    period: assignment.period,
                    type: assignment.type,
                    status: "scheduled",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                results.created++;
            } else {
                results.skipped++;
            }

            // 4. Update Child with Default Driver (Steady Pairing)
            // We assume the imported sheet represents the "steady" state
            const updateField = assignment.period === "AM" ? "defaultAmDriverId" : "defaultPmDriverId";
            await ctx.db.patch(child._id, {
                [updateField]: driver._id,
                updatedAt: new Date().toISOString(),
            });
        }
        return results;
    },
});
