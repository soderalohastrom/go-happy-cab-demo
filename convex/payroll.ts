import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Payroll Reporting Queries
 *
 * Aggregates driver trip data for payroll calculation and reporting.
 * Calculates pay based on trip status (completed, no_show, cancelled).
 */

/**
 * Get payroll report for all drivers within a date range.
 *
 * Returns aggregated data:
 * - Trip counts by status (completed, no_show, cancelled)
 * - Breakdown by period (AM/PM)
 * - Calculated total pay based on payroll config
 */
export const getPayrollReport = query({
  args: {
    startDate: v.string(), // ISO date string "2025-10-01"
    endDate: v.string(), // ISO date string "2025-10-15"
  },
  handler: async (ctx, args) => {
    // Get payroll config for pay calculations
    const config = await ctx.db.query("payrollConfig").first();
    const baseRate = config?.baseRate ?? 30;
    const noShowDeduction = config?.noShowDeduction ?? 5;
    const preCancelDeduction = config?.preCancelDeduction ?? 10;

    // Get all routes in date range
    const allRoutes = await ctx.db.query("routes").collect();

    // Filter routes by date range
    const routesInRange = allRoutes.filter((route) => {
      return route.date >= args.startDate && route.date <= args.endDate;
    });

    // Get all active drivers
    const drivers = await ctx.db
      .query("drivers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Aggregate data by driver
    const driverReports = await Promise.all(
      drivers.map(async (driver) => {
        // Get this driver's routes in the date range
        const driverRoutes = routesInRange.filter(
          (route) => route.driverId === driver._id
        );

        // Count trips by status
        const completedTrips = driverRoutes.filter(
          (r) => r.status === "completed"
        ).length;
        const noShowTrips = driverRoutes.filter(
          (r) => r.status === "no_show"
        ).length;
        // All cancel types
        const cancelledTrips = driverRoutes.filter(
          (r) => r.status === "cancelled"
        ).length;
        const lateCancelTrips = driverRoutes.filter(
          (r) => r.status === "late_cancel"
        ).length;
        const naTrips = driverRoutes.filter(
          (r) => r.status === "na"
        ).length;

        // Count by period
        const amTrips = driverRoutes.filter((r) => r.period === "AM").length;
        const pmTrips = driverRoutes.filter((r) => r.period === "PM").length;

        // Calculate total pay
        const completedPay = completedTrips * baseRate;
        const noShowPay = noShowTrips * (baseRate - noShowDeduction);
        // All cancellations are $0
        const cancelledPay = 0;
        const lateCancelPay = 0;
        const naPay = 0;

        const totalPay = completedPay + noShowPay + cancelledPay + lateCancelPay + naPay;

        return {
          driverId: driver._id,
          employeeId: driver.employeeId,
          firstName: driver.firstName,
          lastName: driver.lastName,
          fullName: `${driver.firstName} ${driver.lastName}`,
          email: driver.email,
          totalTrips: driverRoutes.length,
          amTrips,
          pmTrips,
          completedTrips,
          noShowTrips,
          cancelledTrips,
          lateCancelTrips, // NEW
          naTrips,         // NEW
          totalPay,
          // Include breakdown for transparency
          payBreakdown: {
            completedPay,
            noShowPay,
            cancelledPay,
            lateCancelPay, // NEW
            naPay,         // NEW
            baseRate,
            noShowRate: baseRate - noShowDeduction,
            cancelledRate: 0, // Changed to 0
          },
        };
      })
    );

    // Sort by total pay descending
    driverReports.sort((a, b) => b.totalPay - a.totalPay);

    // Calculate totals across all drivers
    const totals = driverReports.reduce(
      (acc, driver) => ({
        totalTrips: acc.totalTrips + driver.totalTrips,
        completedTrips: acc.completedTrips + driver.completedTrips,
        noShowTrips: acc.noShowTrips + driver.noShowTrips,
        cancelledTrips: acc.cancelledTrips + driver.cancelledTrips,
        lateCancelTrips: (acc.lateCancelTrips || 0) + driver.lateCancelTrips,
        naTrips: (acc.naTrips || 0) + driver.naTrips,
        totalPay: acc.totalPay + driver.totalPay,
      }),
      {
        totalTrips: 0,
        completedTrips: 0,
        noShowTrips: 0,
        cancelledTrips: 0,
        lateCancelTrips: 0,
        naTrips: 0,
        totalPay: 0,
      }
    );

    return {
      startDate: args.startDate,
      endDate: args.endDate,
      generatedAt: new Date().toISOString(),
      config: {
        baseRate,
        noShowDeduction,
        preCancelDeduction,
      },
      drivers: driverReports,
      totals,
    };
  },
});

/**
 * Get detailed trip list for a specific driver within a date range.
 *
 * Returns individual trip records with child names, dates, periods, and status.
 * Useful for driver-specific payroll verification and detailed reporting.
 */
export const getDriverPayrollDetails = query({
  args: {
    driverId: v.id("drivers"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get driver info
    const driver = await ctx.db.get(args.driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    // Get payroll config
    const config = await ctx.db.query("payrollConfig").first();
    const baseRate = config?.baseRate ?? 30;
    const noShowDeduction = config?.noShowDeduction ?? 5;
    const preCancelDeduction = config?.preCancelDeduction ?? 10;

    // Get all routes for this driver
    const allRoutes = await ctx.db
      .query("routes")
      .withIndex("by_driver_date", (q) => q.eq("driverId", args.driverId))
      .collect();

    // Filter by date range
    const routesInRange = allRoutes.filter(
      (route) => route.date >= args.startDate && route.date <= args.endDate
    );

    // Get child details for each route
    const tripDetails = await Promise.all(
      routesInRange.map(async (route) => {
        const child = await ctx.db.get(route.childId);

        // Calculate pay for this trip
        let tripPay = baseRate;
        if (route.status === "no_show") {
          tripPay = baseRate - noShowDeduction;
        } else if (route.status === "cancelled") {
          tripPay = baseRate - preCancelDeduction;
        }

        return {
          routeId: route._id,
          date: route.date,
          period: route.period,
          type: route.type,
          childName: child
            ? `${child.firstName} ${child.lastName}`
            : "Unknown",
          childId: route.childId,
          status: route.status,
          tripPay,
          scheduledTime: route.scheduledTime,
          actualStartTime: route.actualStartTime,
          actualEndTime: route.actualEndTime,
          skipReason: route.skipReason,
          driverNotes: route.driverNotes,
        };
      })
    );

    // Sort by date and period
    tripDetails.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.period === "AM" ? -1 : 1;
    });

    // Calculate totals for this driver
    const totals = {
      totalTrips: tripDetails.length,
      completedTrips: tripDetails.filter((t) => t.status === "completed")
        .length,
      noShowTrips: tripDetails.filter((t) => t.status === "no_show").length,
      cancelledTrips: tripDetails.filter((t) => t.status === "cancelled")
        .length,
      totalPay: tripDetails.reduce((sum, trip) => sum + trip.tripPay, 0),
    };

    return {
      driver: {
        id: driver._id,
        employeeId: driver.employeeId,
        fullName: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
      },
      dateRange: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      config: {
        baseRate,
        noShowDeduction,
        preCancelDeduction,
      },
      trips: tripDetails,
      totals,
      generatedAt: new Date().toISOString(),
    };
  },
});

/**
 * Get quick payroll summary for date range presets.
 * Helper query for common pay period selections.
 */
export const getPayrollSummary = query({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
    period: v.union(v.literal("first-half"), v.literal("second-half")),
  },
  handler: async (ctx, args) => {
    // Calculate date range based on period
    const year = args.year;
    const month = args.month;

    let startDate: string;
    let endDate: string;

    if (args.period === "first-half") {
      // 1st through 15th
      startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      endDate = `${year}-${String(month).padStart(2, "0")}-15`;
    } else {
      // 16th through end of month
      startDate = `${year}-${String(month).padStart(2, "0")}-16`;

      // Calculate last day of month
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    }

    // Get payroll config
    const config = await ctx.db.query("payrollConfig").first();
    const baseRate = config?.baseRate ?? 30;

    // Get all routes in range
    const allRoutes = await ctx.db.query("routes").collect();
    const routesInRange = allRoutes.filter(
      (route) => route.date >= startDate && route.date <= endDate
    );

    // Calculate summary stats
    const totalTrips = routesInRange.length;
    const completedTrips = routesInRange.filter(
      (r) => r.status === "completed"
    ).length;
    const noShowTrips = routesInRange.filter(
      (r) => r.status === "no_show"
    ).length;
    const cancelledTrips = routesInRange.filter(
      (r) => r.status === "cancelled"
    ).length;

    // Count unique drivers with trips
    const uniqueDrivers = new Set(routesInRange.map((r) => r.driverId)).size;

    return {
      period: args.period,
      startDate,
      endDate,
      baseRate,
      summary: {
        totalTrips,
        completedTrips,
        noShowTrips,
        cancelledTrips,
        activeDrivers: uniqueDrivers,
      },
    };
  },
});
