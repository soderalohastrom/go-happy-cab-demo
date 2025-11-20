"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { google } from 'googleapis';
import { internal } from "./_generated/api";

/**
 * Export payroll to Google Sheets
 *
 * Creates a professionally formatted spreadsheet with:
 * - Summary tab: Driver payroll data with totals
 * - Configuration tab: Pay rates and date range
 *
 * Requires OAuth token from Clerk with Google Sheets scopes:
 * - https://www.googleapis.com/auth/spreadsheets
 * - https://www.googleapis.com/auth/drive.file
 */
export const exportPayrollToSheets = action({
  args: {
    payrollData: v.array(v.object({
      driverName: v.string(),
      employeeId: v.string(),
      totalTrips: v.number(),
      pickups: v.number(),
      noGos: v.number(),
      preCancels: v.number(),
      totalPay: v.number(),
    })),
    startDate: v.string(),
    endDate: v.string(),
    payrollConfig: v.object({
      pickupRate: v.number(),
      noGoRate: v.number(),
      preCancelRate: v.number(),
    }),
    oauthToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Initialize Google Sheets API with OAuth token
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: args.oauthToken });
      const sheets = google.sheets({ version: 'v4', auth });

      const title = `Go Happy Cab Payroll - ${args.startDate} to ${args.endDate}`;

      // Create spreadsheet with 2 tabs
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title },
          sheets: [
            { properties: { title: 'Summary', gridProperties: { frozenRowCount: 1 }}},
            { properties: { title: 'Configuration' }}
          ]
        }
      });

      const spreadsheetId = createResponse.data.spreadsheetId!;

      // Prepare Summary data
      const summaryRows = [
        ['Driver Name', 'Employee ID', 'Total Trips', 'Pick-ups', 'No-gos', 'Pre-cancels', 'Total Pay'],
        ...args.payrollData.map(d => [
          d.driverName, d.employeeId, d.totalTrips,
          d.pickups, d.noGos, d.preCancels, d.totalPay
        ]),
        [''],
        [
          'TOTALS', '',
          args.payrollData.reduce((s, d) => s + d.totalTrips, 0),
          args.payrollData.reduce((s, d) => s + d.pickups, 0),
          args.payrollData.reduce((s, d) => s + d.noGos, 0),
          args.payrollData.reduce((s, d) => s + d.preCancels, 0),
          args.payrollData.reduce((s, d) => s + d.totalPay, 0)
        ]
      ];

      // Write Summary data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: summaryRows }
      });

      // Prepare Configuration data
      const configRows = [
        ['Payment Rates', 'Amount'],
        ['Pick-up Rate', `$${args.payrollConfig.pickupRate}`],
        ['No-go Rate', `$${args.payrollConfig.noGoRate}`],
        ['Pre-cancel Rate', `$${args.payrollConfig.preCancelRate}`],
        [''],
        ['Pay Period', ''],
        ['Start Date', args.startDate],
        ['End Date', args.endDate],
        ['Export Date', new Date().toLocaleString()],
      ];

      // Write Configuration data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Configuration!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: configRows }
      });

      // Apply formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 7 }
              }
            },
            // Bold header row
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            },
            // Bold totals row
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: summaryRows.length - 1,
                  endRowIndex: summaryRows.length
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 1, green: 0.95, blue: 0.8 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            },
            // Currency formatting for pay column
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 },
                cell: {
                  userEnteredFormat: {
                    numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            }
          ]
        }
      });

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // Create audit log
      await ctx.runMutation(internal.auditLogs.create, {
        action: "PAYROLL_EXPORT",
        resource: "payroll",
        resourceId: spreadsheetId,
        userType: "dispatcher",
        category: "data_access",
        severity: "info",
        description: `Exported payroll report to Google Sheets for period ${args.startDate} to ${args.endDate}`,
        details: {
          spreadsheetId,
          spreadsheetUrl,
          dateRange: `${args.startDate} to ${args.endDate}`,
          totalDrivers: args.payrollData.length,
          totalPay: args.payrollData.reduce((s, d) => s + d.totalPay, 0),
        },
        complianceFlags: {
          requiresRetention: true,
          sensitiveData: true,
          regulatoryRelevant: true,
          exportRestricted: false,
          retentionPeriodYears: 7,
        },
      });

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        totalDrivers: args.payrollData.length,
        totalPay: args.payrollData.reduce((s, d) => s + d.totalPay, 0),
      };
    } catch (error: any) {
      console.error('Google Sheets export failed:', error);
      throw new Error(`Failed to export: ${error.message}`);
    }
  },
});
