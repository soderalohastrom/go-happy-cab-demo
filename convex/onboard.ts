import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all pending requests for the dashboard
export const getPendingRequests = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("transportationRequests")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();
    },
});

// Get a single request by ID
export const getRequest = query({
    args: { id: v.id("transportationRequests") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Approve a request and migrate data to core tables
export const approveRequest = mutation({
    args: {
        requestId: v.id("transportationRequests"),
        // Optional overrides if admin edits before approving
        studentName: v.optional(v.string()),
        dob: v.optional(v.string()),
        schoolName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        // 1. Create Child Record
        const childId = await ctx.db.insert("children", {
            firstName: args.studentName?.split(" ")[0] || request.studentName.split(" ")[0],
            lastName: args.studentName?.split(" ").slice(1).join(" ") || request.studentName.split(" ").slice(1).join(" "),
            dateOfBirth: args.dob || request.dateOfBirth,
            grade: request.grade || "Unknown",
            studentId: "PENDING-" + Date.now().toString().slice(-6), // Temporary ID
            schoolName: args.schoolName || request.schoolName || "Unknown School",

            // Address
            homeAddress: {
                street: request.address,
                city: "Marin County", // Defaulting for now
                state: "CA",
                zip: "94901",
            },

            // Medical/Special Needs
            specialNeeds: [
                ...(request.wheelchair ? ["Wheelchair"] : []),
                ...(request.booster ? ["Booster Seat"] : []),
                ...(request.carSeat ? ["Car Seat"] : []),
                ...(request.behavior ? ["Behavioral"] : []),
                ...(request.seizureDisorder ? ["Seizure Protocol"] : []),
            ],
            medicalInfo: {
                allergies: request.severeAllergies ? ["See Intake Form"] : [],
                medicalConditions: request.medicalConcerns ? ["See Intake Form"] : [],
                equipmentNeeds: request.vehicleEquipmentReq ? ["Special Equipment"] : [],
            },

            // Notes
            notes: request.comments,
            transportationNotes: request.transportSpecialInstructions,

            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // 2. Create Parent/Guardian Record (Primary)
        if (request.primaryGuardianName) {
            const parentId = await ctx.db.insert("parents", {
                firstName: request.primaryGuardianName.split(" ")[0],
                lastName: request.primaryGuardianName.split(" ").slice(1).join(" "),
                email: request.primaryGuardianEmail || "",
                phone: request.primaryGuardianCell || "",
                relationship: request.primaryGuardianRelationship || "Guardian",
                isPrimary: true,
                canPickup: true,
                preferredContactMethod: "phone",
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Link Parent to Child
            await ctx.db.insert("childParentRelationships", {
                childId,
                parentId,
                relationship: request.primaryGuardianRelationship || "Guardian",
                isPrimary: true,
                pickupAuthorized: true,
                emergencyContact: true,
                createdAt: new Date().toISOString(),
            });
        }

        // 3. Update Request Status
        await ctx.db.patch(args.requestId, {
            status: "approved",
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Admin", // TODO: Get actual user
        });

        return { childId, status: "success" };
    },
});
