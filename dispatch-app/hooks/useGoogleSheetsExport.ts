import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import * as Linking from 'expo-linking';

interface PayrollDriver {
  driverName: string;
  employeeId: string;
  totalTrips: number;
  pickups: number;
  noGos: number;
  preCancels: number;
  totalPay: number;
}

interface PayrollConfig {
  pickupRate: number;
  noGoRate: number;
  preCancelRate: number;
}

interface ExportResult {
  url: string;
  spreadsheetId: string;
  summary: {
    totalDrivers: number;
    totalPay: number;
  };
}

interface AssignmentDriver {
  driverId: string;
  driverName: string;
  children: Array<{
    childId: string;
    childName: string;
    grade: string;
    schoolName: string;
  }>;
}

interface AssignmentExportResult {
  url: string;
  spreadsheetId: string;
  summary: {
    totalDrivers: number;
    totalAssignments: number;
  };
}

interface DistrictData {
  districtId: string;
  districtName: string;
  schools: Array<{
    schoolId: string;
    schoolName: string;
    children: Array<{
      childId: string;
      childName: string;
      grade: string;
    }>;
  }>;
}

interface DistrictExportResult {
  url: string;
  spreadsheetId: string;
  summary: {
    totalDistricts: number;
    totalChildren: number;
  };
}

/**
 * Hook for exporting payroll data to Google Sheets
 *
 * Uses service account authentication (backend-only).
 * No user OAuth required - works in walled garden distribution.
 *
 * Usage:
 * ```tsx
 * const { exportToNewSheet, isExporting, exportError } = useGoogleSheetsExport();
 *
 * const handleExport = async () => {
 *   const result = await exportToNewSheet(drivers, startDate, endDate, config);
 *   if (result) {
 *     Alert.alert('Success!', `Exported ${result.summary.totalDrivers} drivers`);
 *   }
 * };
 * ```
 */
export const useGoogleSheetsExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportToSheetsAction = useAction(api.googleSheets.exportPayrollToSheets);
  const exportAssignmentsAction = useAction(api.googleSheets.exportAssignmentsToSheets);
  const exportDistrictsAction = useAction(api.googleSheets.exportDistrictsToSheets);

  const exportToNewSheet = async (
    drivers: PayrollDriver[],
    startDate: string,
    endDate: string,
    config: PayrollConfig
  ): Promise<ExportResult | null> => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Call Convex action to create spreadsheet
      // Data is already formatted by PayrollReport component
      const result = await exportToSheetsAction({
        payrollData: drivers,
        startDate,
        endDate,
        payrollConfig: config,
      });

      if (result.success) {
        // Open spreadsheet in browser
        await Linking.openURL(result.spreadsheetUrl);

        return {
          url: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
          summary: {
            totalDrivers: result.totalDrivers,
            totalPay: result.totalPay,
          },
        };
      }

      return null;
    } catch (error: any) {
      console.error('Google Sheets export error:', error);
      setExportError(error.message || 'Unknown error occurred');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const exportAssignmentsToNewSheet = async (
    drivers: AssignmentDriver[],
    selectedDate: string,
    selectedPeriod: "AM" | "PM"
  ): Promise<AssignmentExportResult | null> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const result = await exportAssignmentsAction({
        assignmentData: drivers,
        selectedDate,
        selectedPeriod,
      });

      if (result.success) {
        await Linking.openURL(result.spreadsheetUrl);

        return {
          url: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
          summary: {
            totalDrivers: result.totalDrivers,
            totalAssignments: result.totalAssignments,
          },
        };
      }

      return null;
    } catch (error: any) {
      console.error('Google Sheets assignments export error:', error);
      setExportError(error.message || 'Unknown error occurred');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const exportDistrictsToNewSheet = async (
    districts: DistrictData[],
    selectedDate: string,
    selectedPeriod: "AM" | "PM"
  ): Promise<DistrictExportResult | null> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const result = await exportDistrictsAction({
        districtData: districts,
        selectedDate,
        selectedPeriod,
      });

      if (result.success) {
        await Linking.openURL(result.spreadsheetUrl);

        return {
          url: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
          summary: {
            totalDistricts: result.totalDistricts,
            totalChildren: result.totalChildren,
          },
        };
      }

      return null;
    } catch (error: any) {
      console.error('Google Sheets districts export error:', error);
      setExportError(error.message || 'Unknown error occurred');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToNewSheet,
    exportAssignmentsToNewSheet,
    exportDistrictsToNewSheet,
    isExporting,
    exportError,
    clearError: () => setExportError(null),
  };
};
