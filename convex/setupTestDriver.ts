import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Setup Scott as a test driver with complete data
 * Links to his Clerk account: ssoderstrom@gmail.com
 */
export const setupScott = mutation({
  args: {
    clerkUserId: v.string(), // Clerk user ID from dashboard
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Create Scott's driver record
    const scottDriverId = await ctx.db.insert("drivers", {
      employeeId: "D100",
      firstName: "Scott",
      lastName: "Soderstrom",
      email: "ssoderstrom@gmail.com",
      phone: "+14155968007",
      role: "driver",
      status: "active",
      active: true,
      licenseNumber: "HI-SCOTT-2025",
      licenseExpiry: "2027-12-31",
      clerkId: args.clerkUserId, // Link to Clerk account
      primaryLanguage: "English",
      availabilityAM: "YES", // Must be string: "YES", "NO", "LIMITED"
      availabilityPM: "YES", // Must be string: "YES", "NO", "LIMITED"
      specialEquipment: "Wheelchair lift, Booster seats, First aid kit", // Comma-separated string
      startDate: today,
      performanceMetrics: {
        totalRoutes: 0,
        onTimeRate: 100,
        safetyScore: 100,
        parentRating: 5.0,
        incidentCount: 0,
      },
      emergencyContact: {
        name: "Emergency Contact",
        phone: "808-555-9999",
        relationship: "Family",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Find Mia Allen and update with complete CSV data
    const mia = await ctx.db
      .query("children")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), "Mia"),
          q.eq(q.field("lastName"), "Allen")
        )
      )
      .first();

    if (!mia) {
      throw new Error("Mia Allen not found in database");
    }

    // Update Mia with all new CSV fields
    await ctx.db.patch(mia._id, {
      // Timing information
      pickupTime: "8:15 AM",
      classStartTime: "9:00 AM",
      classEndTime: "3:00 PM",

      // Ride information
      rideType: "SOLO", // Purple badge

      // Pickup details
      pickupNotes: "🏠 Ring doorbell twice. Mom works from home and may be on a call. Mia will be ready with her pink backpack. She loves to talk about her cat, Mr. Whiskers!",

      // Language
      homeLanguage: "English",

      // Special needs (keep existing + add more detail)
      specialNeeds: [
        "Peanut allergy - EpiPen required",
        "Mild anxiety - prefers same driver",
        "Car seat required"
      ],

      // Medical information - ALL ARRAYS per schema
      medicalInfo: {
        allergies: [
          "🚨 SEVERE PEANUT ALLERGY",
          "EpiPen in backpack front pocket",
          "Call 911 and parent immediately if exposed"
        ],
        medicalConditions: ["Anxiety", "Peanut allergy"],
        equipmentNeeds: ["EpiPen", "Car seat"],
        emergencyProcedures: "EpiPen is in pink backpack front pocket. After use, call 911 immediately then call parent.",
      },

      updatedAt: new Date().toISOString(),
    });

    // 3. Create a route assignment for Scott to pick up Mia TODAY
    const routeId = await ctx.db.insert("routes", {
      date: today,
      period: "AM" as const, // Must be "AM" or "PM" per schema
      type: "pickup" as const,
      driverId: scottDriverId,
      childId: mia._id,
      status: "assigned" as const,
      scheduledTime: "8:15 AM", // Use scheduledTime instead of estimatedTime
      priority: "normal" as const,
      createdBy: "setup-script",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Create audit log for the route assignment
    await ctx.db.insert("auditLogs", {
      logId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: args.clerkUserId,
      userType: "system" as const,
      action: "CREATE",
      method: "CREATE" as const,
      resource: "route",
      resourceId: routeId,
      category: "data_modification" as const,
      severity: "info" as const,
      details: {
        description: "Setup test driver route assignment",
        driverName: "Scott Soderstrom",
        childName: "Mia Allen",
        date: today,
        period: "AM",
      },
      complianceFlags: {
        sensitiveData: false,
        regulatoryRelevant: false,
        requiresRetention: false,
      },
    });

    return {
      success: true,
      driverId: scottDriverId,
      childId: mia._id,
      routeId: routeId,
      message: `✅ Scott Soderstrom (D100) is now set up with a morning route to pick up Mia Allen at 8:15 AM!`,
    };
  },
});
