import { useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import * as Linking from 'expo-linking';

interface PayrollDriver {
  name: string;
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
 * Requires:
 * - User authenticated with Clerk
 * - Google OAuth scopes configured in Clerk dashboard
 * - User has signed out/in to grant new permissions
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
  const { getToken } = useAuth();

  const exportToSheetsAction = useMutation(api.googleSheets.exportPayrollToSheets);

  const exportToNewSheet = async (
    drivers: PayrollDriver[],
    startDate: string,
    endDate: string,
    config: PayrollConfig
  ): Promise<ExportResult | null> => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Get OAuth token from Clerk
      const token = await getToken({ template: 'oauth_google' });

      if (!token) {
        throw new Error('No Google OAuth token available. Please sign out and sign back in to grant Google Sheets permissions.');
      }

      // Format data for Convex action
      const payrollData = drivers.map(d => ({
        driverName: d.name,
        employeeId: d.employeeId,
        totalTrips: d.totalTrips,
        pickups: d.pickups,
        noGos: d.noGos,
        preCancels: d.preCancels,
        totalPay: d.totalPay,
      }));

      // Call Convex action to create spreadsheet
      const result = await exportToSheetsAction({
        payrollData,
        startDate,
        endDate,
        payrollConfig: config,
        oauthToken: token,
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
