import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

/**
 * Hook for payroll reporting functionality
 *
 * Provides:
 * - Payroll report data for date range
 * - Driver-specific details
 * - Quick summaries for standard pay periods
 */

export const usePayrollReport = (startDate: string, endDate: string) => {
  const report = useQuery(api.payroll.getPayrollReport, {
    startDate,
    endDate,
  });

  return {
    report,
    isLoading: report === undefined,
    hasData: report && report.drivers.length > 0,
  };
};

export const useDriverPayrollDetails = (
  driverId: Id<"drivers"> | null,
  startDate: string,
  endDate: string
) => {
  const details = useQuery(
    api.payroll.getDriverPayrollDetails,
    driverId
      ? {
          driverId,
          startDate,
          endDate,
        }
      : "skip"
  );

  return {
    details,
    isLoading: details === undefined,
  };
};

export const usePayrollSummary = (
  year: number,
  month: number,
  period: "first-half" | "second-half"
) => {
  const summary = useQuery(api.payroll.getPayrollSummary, {
    year,
    month,
    period,
  });

  return {
    summary,
    isLoading: summary === undefined,
  };
};

/**
 * Helper to calculate date range for standard pay periods
 */
export const getPayPeriodDates = (
  year: number,
  month: number,
  period: "first-half" | "second-half"
): { startDate: string; endDate: string } => {
  const monthStr = String(month).padStart(2, "0");

  if (period === "first-half") {
    return {
      startDate: `${year}-${monthStr}-01`,
      endDate: `${year}-${monthStr}-15`,
    };
  } else {
    // Calculate last day of month
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${monthStr}-16`,
      endDate: `${year}-${monthStr}-${lastDay}`,
    };
  }
};

/**
 * Helper to determine current pay period
 */
export const getCurrentPayPeriod = (): {
  year: number;
  month: number;
  period: "first-half" | "second-half";
  startDate: string;
  endDate: string;
} => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() is 0-indexed
  const day = now.getDate();

  const period: "first-half" | "second-half" =
    day <= 15 ? "first-half" : "second-half";

  const dates = getPayPeriodDates(year, month, period);

  return {
    year,
    month,
    period,
    ...dates,
  };
};
