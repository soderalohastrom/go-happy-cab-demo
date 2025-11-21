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
 * Uses Google Service Account authentication (no user OAuth required).
 * Spreadsheets are created in the shared "Go Happy Cab Payroll" folder.
 *
 * Required environment variables:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * - GOOGLE_PAYROLL_FOLDER_ID
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
  },
  handler: async (ctx, args) => {
      try {
        // Retrieve service account credentials from environment
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
        const folderId = process.env.GOOGLE_PAYROLL_FOLDER_ID;

        if (!serviceAccountEmail || !serviceAccountKey || !folderId) {
          throw new Error('Missing Google service account environment variables');
        }

        // Initialize Google APIs with service account using credentials object
        // Fix PEM header format: -----BEGIN PRIVATE KEY----- must be on one line
        let formattedKey = serviceAccountKey
          .replace(/\\n/g, '\n')  // Convert \n to actual newlines
          .replace(/-----BEGIN\nPRIVATE\nKEY-----/g, '-----BEGIN PRIVATE KEY-----')  // Fix header
          .replace(/-----END\nPRIVATE\nKEY-----/g, '-----END PRIVATE KEY-----');  // Fix footer

        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            private_key: formattedKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Verify we can access the target Shared Drive folder
        // IMPORTANT: Shared Drives require supportsAllDrives: true
        try {
          await drive.files.get({
            fileId: folderId,
            fields: 'id, name, capabilities',
            supportsAllDrives: true  // Required for Shared Drives!
          });
          console.log(`Successfully verified access to Shared Drive folder: ${folderId}`);

          // Check storage quota (not applicable for Shared Drives, but useful for debugging)
          const about = await drive.about.get({
            fields: 'storageQuota'
          });
          console.log('Service Account Storage Quota:', JSON.stringify(about.data.storageQuota, null, 2));

        } catch (folderError: any) {
          console.error(`Failed to access target folder ${folderId}:`, folderError.message);
          throw new Error(`Service account cannot access Shared Drive ${folderId}. Please ensure the folder is shared with ${serviceAccountEmail} as Content Manager or Manager.`);
        }

        const title = `Go Happy Cab Payroll - ${args.startDate} to ${args.endDate}`;

        // Create spreadsheet directly in the Shared Drive using Drive API
        // IMPORTANT: Shared Drives require supportsAllDrives: true
        const createResponse = await drive.files.create({
          requestBody: {
            name: title,
            parents: [folderId],
            mimeType: 'application/vnd.google-apps.spreadsheet',
          },
          fields: 'id',
          supportsAllDrives: true  // Required for Shared Drives!
        });

        const spreadsheetId = createResponse.data.id!;

        // Initialize sheets: Rename default "Sheet1" to "Summary" and add "Configuration"
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: 0,
                    title: 'Summary',
                    gridProperties: { frozenRowCount: 1 }
                  },
                  fields: 'title,gridProperties.frozenRowCount'
                }
              },
              {
                addSheet: {
                  properties: { title: 'Configuration' }
                }
              }
            ]
          }
        });

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

        // TODO: Re-enable audit log once internal mutation is properly detected
        // Create audit log
        // await ctx.runMutation(internal.auditLogs.create, {
        //   action: "PAYROLL_EXPORT",
        //   resource: "payroll",
        //   resourceId: spreadsheetId,
        //   userType: "dispatcher",
        //   category: "data_access",
        //   severity: "info",
        //   description: `Exported payroll report to Google Sheets for period ${args.startDate} to ${args.endDate}`,
        //   details: {
        //     spreadsheetId,
        //     spreadsheetUrl,
        //     dateRange: `${args.startDate} to ${args.endDate}`,
        //     totalDrivers: args.payrollData.length,
        //     totalPay: args.payrollData.reduce((s, d) => s + d.totalPay, 0),
        //   },
        //   complianceFlags: {
        //     requiresRetention: true,
        //     sensitiveData: true,
        //     regulatoryRelevant: true,
        //     exportRestricted: false,
        //     retentionPeriodYears: 7,
        //   },
        // });

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
