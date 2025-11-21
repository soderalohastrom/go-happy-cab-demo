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

  return {
    exportToNewSheet,
    isExporting,
    exportError,
    clearError: () => setExportError(null),
  };
};
