/**
 * Reports - Specialized Queries for Dispatch App Reports Screen
 *
 * Provides aggregated and enriched data for various report types:
 * - Driver/Child Assignments Report
 * - District/School Hierarchy Report
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get Driver/Child Assignments for a Specific Date and Period
 *
 * Returns driver-centric view showing each driver with their assigned children.
 * Used for: Assignments Report Tab
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @param period - "AM" or "PM"
 * @returns Array of drivers with nested children assignments
 */
export const getRoutesForDateRange = query({
  args: {
    date: v.string(),
    period: v.union(v.literal("AM"), v.literal("PM")),
  },
  handler: async (ctx, args) => {
    // 1. Get all assignments for date/period
    const assignments = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", args.period)
      )
      .collect();

    // 2. Group assignments by driver
    const driverMap = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        children: Array<{
          childId: string;
          childName: string;
          schoolName: string;
          grade: string;
        }>;
      }
    >();

    for (const assignment of assignments) {
      // Fetch driver data
      const driver = await ctx.db.get(assignment.driverId);
      if (!driver) continue;

      const driverKey = assignment.driverId;
      const driverName = `${driver.firstName} ${driver.lastName}`;

      // Initialize driver entry if not exists
      if (!driverMap.has(driverKey)) {
        driverMap.set(driverKey, {
          driverId: driverKey,
          driverName,
          children: [],
        });
      }

      // Fetch child data
      const child = await ctx.db.get(assignment.childId);
      if (!child) continue;

      // Add child to driver's assignment list
      driverMap.get(driverKey)!.children.push({
        childId: assignment.childId,
        childName: `${child.firstName} ${child.lastName}`,
        schoolName: child.schoolName || "Unknown School",
        grade: child.grade || "N/A",
      });
    }

    // 3. Convert map to sorted array
    const result = Array.from(driverMap.values());

    // Sort drivers by name
    result.sort((a, b) => a.driverName.localeCompare(b.driverName));

    // Sort children within each driver by name
    result.forEach((driver) => {
      driver.children.sort((a, b) => a.childName.localeCompare(b.childName));
    });

    return result;
  },
});

/**
 * Get District/School Hierarchy Report for a Specific Date and Period
 *
 * Returns hierarchical structure: District → Schools → Children
 * Used for: Districts Report Tab
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @param period - "AM" or "PM"
 * @returns Array of districts with nested schools and children
 */
export const getDistrictSchoolReport = query({
  args: {
    date: v.string(),
    period: v.union(v.literal("AM"), v.literal("PM")),
  },
  handler: async (ctx, args) => {
    // 1. Get all assignments for date/period
    const assignments = await ctx.db
      .query("routes")
      .withIndex("by_date_period", (q) =>
        q.eq("date", args.date).eq("period", args.period)
      )
      .collect();

    // 2. Get all children with assignments and enrich with school/district data
    const childrenData = await Promise.all(
      assignments.map(async (assignment) => {
        const child = await ctx.db.get(assignment.childId);
        if (!child) return null;

        // String-based school lookup (children.schoolName is string, not reference)
        const schoolName = child.schoolName || "Unknown School";
        const schools = await ctx.db
          .query("schools")
          .withIndex("by_school_name", (q) => q.eq("schoolName", schoolName))
          .collect();

        const school = schools[0]; // Take first match (should be unique)

        let districtName = "Unknown District";
        if (school) {
          const district = await ctx.db.get(school.districtId);
          districtName = district?.districtName || "Unknown District";
        }

        return {
          childId: assignment.childId,
          childName: `${child.firstName} ${child.lastName}`,
          grade: child.grade || "N/A",
          schoolName,
          districtName,
          districtId: school?.districtId || "unknown",
          schoolId: school?._id || "unknown",
        };
      })
    );

    // Filter out null entries
    const validChildren = childrenData.filter((c) => c !== null);

    // 3. Group by District → School → Children
    const districtMap = new Map<
      string,
      {
        districtId: string;
        districtName: string;
        schools: Map<
          string,
          {
            schoolId: string;
            schoolName: string;
            children: Array<{
              childId: string;
              childName: string;
              grade: string;
            }>;
          }
        >;
      }
    >();

    for (const child of validChildren) {
      // Initialize district if not exists
      if (!districtMap.has(child.districtId)) {
        districtMap.set(child.districtId, {
          districtId: child.districtId,
          districtName: child.districtName,
          schools: new Map(),
        });
      }

      const district = districtMap.get(child.districtId)!;

      // Initialize school if not exists
      if (!district.schools.has(child.schoolId)) {
        district.schools.set(child.schoolId, {
          schoolId: child.schoolId,
          schoolName: child.schoolName,
          children: [],
        });
      }

      // Add child to school
      district.schools.get(child.schoolId)!.children.push({
        childId: child.childId,
        childName: child.childName,
        grade: child.grade,
      });
    }

    // 4. Convert nested Maps to arrays and sort
    const result = Array.from(districtMap.values()).map((district) => ({
      districtId: district.districtId,
      districtName: district.districtName,
      schools: Array.from(district.schools.values())
        .map((school) => ({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          children: school.children.sort((a, b) =>
            a.childName.localeCompare(b.childName)
          ),
        }))
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName)),
    }));

    // Sort districts by name
    result.sort((a, b) => a.districtName.localeCompare(b.districtName));

    return result;
  },
});
