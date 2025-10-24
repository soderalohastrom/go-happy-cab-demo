/**
 * Unified Schema Seed Data
 * Populates database with realistic test data matching unified schema
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // Check if already seeded
    const existingDrivers = await ctx.db.query("drivers").first();
    if (existingDrivers) {
      return { message: "Database already seeded. Run clearAllData first if you want to re-seed." };
    }

    // ======================================================================
    // 1. SEED DRIVERS (12 drivers)
    // ======================================================================

    const driverData = [
      { firstName: "John", lastName: "Smith", employeeId: "D001", phone: "808-555-0101", email: "john.smith@gohappycab.com" },
      { firstName: "Maria", lastName: "Garcia", employeeId: "D002", phone: "808-555-0102", email: "maria.garcia@gohappycab.com" },
      { firstName: "David", lastName: "Chen", employeeId: "D003", phone: "808-555-0103", email: "david.chen@gohappycab.com" },
      { firstName: "Sarah", lastName: "Johnson", employeeId: "D004", phone: "808-555-0104", email: "sarah.johnson@gohappycab.com" },
      { firstName: "Michael", lastName: "Williams", employeeId: "D005", phone: "808-555-0105", email: "michael.williams@gohappycab.com" },
      { firstName: "Jennifer", lastName: "Brown", employeeId: "D006", phone: "808-555-0106", email: "jennifer.brown@gohappycab.com" },
      { firstName: "Robert", lastName: "Jones", employeeId: "D007", phone: "808-555-0107", email: "robert.jones@gohappycab.com" },
      { firstName: "Lisa", lastName: "Davis", employeeId: "D008", phone: "808-555-0108", email: "lisa.davis@gohappycab.com" },
      { firstName: "James", lastName: "Miller", employeeId: "D009", phone: "808-555-0109", email: "james.miller@gohappycab.com" },
      { firstName: "Patricia", lastName: "Wilson", employeeId: "D010", phone: "808-555-0110", email: "patricia.wilson@gohappycab.com" },
      { firstName: "Thomas", lastName: "Moore", employeeId: "D011", phone: "808-555-0111", email: "thomas.moore@gohappycab.com" },
      { firstName: "Linda", lastName: "Taylor", employeeId: "D012", phone: "808-555-0112", email: "linda.taylor@gohappycab.com" },
    ];

    const driverIds: Record<string, any> = {};

    for (const driver of driverData) {
      const driverId = await ctx.db.insert("drivers", {
        ...driver,
        status: "active",
        role: "driver",
        licenseNumber: `HI-${driver.employeeId}`,
        licenseExpiry: "2026-12-31",
        emergencyContact: {
          name: "Emergency Contact",
          phone: "808-555-9999",
          relationship: "Spouse",
        },
        performanceMetrics: {
          totalRoutes: Math.floor(Math.random() * 500) + 100,
          onTimeRate: 92 + Math.floor(Math.random() * 8),
          safetyScore: 95 + Math.floor(Math.random() * 5),
          incidentCount: Math.floor(Math.random() * 3),
          parentRating: 4.5 + Math.random() * 0.5,
        },
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      driverIds[driver.employeeId] = driverId;
    }

    console.log(`✅ Seeded ${driverData.length} drivers`);

    // ======================================================================
    // 2. SEED CHILDREN (18 children)
    // ======================================================================

    const childData = [
      { firstName: "Emma", lastName: "Anderson", grade: "K", studentId: "S001", schoolName: "Sunset Elementary" },
      { firstName: "Liam", lastName: "Martinez", grade: "1", studentId: "S002", schoolName: "Sunset Elementary" },
      { firstName: "Olivia", lastName: "Thompson", grade: "2", studentId: "S003", schoolName: "Sunset Elementary" },
      { firstName: "Noah", lastName: "White", grade: "3", studentId: "S004", schoolName: "Sunset Elementary" },
      { firstName: "Ava", lastName: "Harris", grade: "4", studentId: "S005", schoolName: "Sunset Elementary" },
      { firstName: "Ethan", lastName: "Clark", grade: "5", studentId: "S006", schoolName: "Sunset Elementary" },
      { firstName: "Sophia", lastName: "Lewis", grade: "K", studentId: "S007", schoolName: "Oceanview School" },
      { firstName: "Mason", lastName: "Walker", grade: "1", studentId: "S008", schoolName: "Oceanview School" },
      { firstName: "Isabella", lastName: "Hall", grade: "2", studentId: "S009", schoolName: "Oceanview School" },
      { firstName: "Lucas", lastName: "Young", grade: "3", studentId: "S010", schoolName: "Oceanview School" },
      { firstName: "Mia", lastName: "Allen", grade: "4", studentId: "S011", schoolName: "Oceanview School" },
      { firstName: "Jackson", lastName: "King", grade: "5", studentId: "S012", schoolName: "Oceanview School" },
      { firstName: "Charlotte", lastName: "Scott", grade: "K", studentId: "S013", schoolName: "Mountain View Academy" },
      { firstName: "Aiden", lastName: "Green", grade: "1", studentId: "S014", schoolName: "Mountain View Academy" },
      { firstName: "Amelia", lastName: "Baker", grade: "2", studentId: "S015", schoolName: "Mountain View Academy" },
      { firstName: "Logan", lastName: "Adams", grade: "3", studentId: "S016", schoolName: "Mountain View Academy" },
      { firstName: "Harper", lastName: "Nelson", grade: "4", studentId: "S017", schoolName: "Mountain View Academy" },
      { firstName: "Elijah", lastName: "Carter", grade: "5", studentId: "S018", schoolName: "Mountain View Academy" },
    ];

    const childIds: Record<string, any> = {};

    for (const child of childData) {
      const childId = await ctx.db.insert("children", {
        ...child,
        dateOfBirth: "2015-01-01",
        homeAddress: {
          street: `${Math.floor(Math.random() * 9999)} Main St`,
          city: "Honolulu",
          state: "HI",
          zip: "96816",
        },
        schoolAddress: {
          street: "123 School Road",
          city: "Honolulu",
          state: "HI",
          zip: "96816",
        },
        specialNeeds: Math.random() > 0.8 ? ["Allergies"] : [],
        medicalInfo: {
          allergies: [],
          medicalConditions: [],
          equipmentNeeds: [],
        },
        pickupInstructions: "Ring doorbell",
        dropoffInstructions: "Use main entrance",
        active: true,
        photoPermission: true,
        createdAt: now,
        updatedAt: now,
      });
      childIds[child.studentId] = childId;
    }

    console.log(`✅ Seeded ${childData.length} children`);

    // ======================================================================
    // 3. SEED ROUTES (Pre-paired for last 3 days + today)
    // ======================================================================

    const getDateString = (daysAgo: number) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().split('T')[0];
    };

    const routeDays = [3, 2, 1, 0]; // 3 days ago, 2 days ago, yesterday, today

    for (const daysAgo of routeDays) {
      const routeDate = getDateString(daysAgo);

      // AM Routes (13 pre-paired)
      const amPairings = [
        ["S001", "D001"], ["S002", "D001"], ["S003", "D002"], ["S004", "D002"],
        ["S005", "D003"], ["S006", "D003"], ["S007", "D004"], ["S008", "D004"],
        ["S009", "D005"], ["S010", "D005"], ["S011", "D006"], ["S012", "D006"],
        ["S013", "D007"],
      ];

      for (const [studentId, employeeId] of amPairings) {
        await ctx.db.insert("routes", {
          date: routeDate,
          period: "AM",
          type: "pickup",
          childId: childIds[studentId],
          driverId: driverIds[employeeId],
          status: daysAgo === 0 ? "scheduled" : "completed",
          scheduledTime: "07:30",
          createdAt: now,
          updatedAt: now,
        });
      }

      // PM Routes (12 pre-paired)
      const pmPairings = [
        ["S001", "D008"], ["S002", "D008"], ["S003", "D009"], ["S004", "D009"],
        ["S005", "D010"], ["S006", "D010"], ["S007", "D011"], ["S008", "D011"],
        ["S009", "D012"], ["S010", "D012"], ["S011", "D001"], ["S012", "D002"],
      ];

      for (const [studentId, employeeId] of pmPairings) {
        await ctx.db.insert("routes", {
          date: routeDate,
          period: "PM",
          type: "dropoff",
          childId: childIds[studentId],
          driverId: driverIds[employeeId],
          status: daysAgo === 0 ? "scheduled" : "completed",
          scheduledTime: "15:30",
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log(`✅ Seeded routes for ${routeDate}`);
    }

    // ======================================================================
    // 4. SEED AUDIT LOG
    // ======================================================================

    await ctx.db.insert("auditLogs", {
      logId: `AL-${Date.now()}-000001`,
      timestamp: now,
      action: "database_seeded",
      resource: "system",
      resourceId: "initial_seed",
      method: "CREATE",
      category: "system_administration",
      severity: "info",
      userId: "system",
      userType: "system",
      details: {
        description: "Database seeded with unified schema data",
        count: `${driverData.length} drivers, ${childData.length} children, ${routeDays.length * 25} routes`,
      },
    });

    return {
      message: "✅ Unified database seeded successfully!",
      summary: {
        drivers: driverData.length,
        children: childData.length,
        routes: routeDays.length * 25,
        days: routeDays.length,
      },
    };
  },
});

// Copy assignments from previous day (kept for backwards compatibility)
export const copyAssignmentsFromPreviousDay = mutation({
  args: { targetDate: v.string() },
  handler: async (ctx, args) => {
    // Redirect to the proper routes function
    // This is just a stub for backwards compatibility
    return { message: "Use assignments.copyFromPreviousDay instead" };
  },
});
