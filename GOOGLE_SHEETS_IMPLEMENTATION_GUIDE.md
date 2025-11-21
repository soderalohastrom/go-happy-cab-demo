# 🚀 Google Sheets Export - Complete Implementation Guide

**For:** Cursor IDE Development
**Project:** Go Happy Cab Payroll System
**Date:** November 14, 2025

---

## ⚠️ DEPRECATION NOTICE

**This guide is OUTDATED and uses Clerk OAuth approach.**

The actual implementation uses **Google Service Account authentication** instead, which is better suited for walled garden distribution (ABM/Managed Google Play) where users don't authenticate individually.

**For the actual working implementation, see:**
- [GOOGLE_API_ISSUES.md](GOOGLE_API_ISSUES.md) - Complete troubleshooting log with final Shared Drive solution
- [convex/googleSheets.ts](convex/googleSheets.ts) - Working service account implementation
- [dispatch-app/hooks/useGoogleSheetsExport.ts](dispatch-app/hooks/useGoogleSheetsExport.ts) - Frontend hook (no Clerk)

**Key differences from this guide:**
- ❌ No Clerk OAuth scopes required
- ✅ Service account with JWT authentication
- ✅ Google Shared Drive for unlimited storage (service accounts have 0 bytes quota)
- ✅ `supportsAllDrives: true` required for Shared Drive API calls
- ✅ No user sign-in required (perfect for walled garden apps)

---

## ⚡ Quick Start (DEPRECATED - See above for actual implementation)

This guide provides EVERYTHING needed to implement Google Sheets export for payroll reports.

**What you'll build:**
- One-click export from Dispatch App → Google Sheets
- Professional formatting (headers, totals, currency)
- Audit trail logging
- Zapier/n8n automation ready

**Time estimate:** 4-6 hours

---

## 📁 Files You'll Create/Modify

### New Files (3)
1. `convex/googleSheets.ts` - Backend Convex actions
2. `dispatch-app/hooks/useGoogleSheetsExport.ts` - Frontend hook  
3. `convex/internal/auditLogs.ts` - Audit logging (if doesn't exist)

### Modified Files (2)
1. `convex/schema.ts` - Add PAYROLL_EXPORT action
2. `dispatch-app/components/PayrollReport.tsx` - Add export button

---

## 🎯 Phase 1: Install Dependencies

```bash
# Backend (root directory)
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npm install googleapis

# Frontend (dispatch-app)
cd dispatch-app
npm install googleapis @types/googleapis
```

**Verify installation:**
```bash
npm list googleapis
# Should show: googleapis@129.0.0+
```

---

## 🔐 Phase 2: Configure Clerk OAuth

**Action Required:** Add Google Sheets API scopes to Clerk

### Steps:
1. Open https://dashboard.clerk.com
2. Select your Go Happy Cab application
3. Go to: **User & Authentication** → **Social Connections**
4. Click **Google** provider → **Edit**
5. Add these scopes:
   ```
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/drive.file
   ```
6. **Save**

### ⚠️ Important
After adding scopes, users MUST sign out and sign back in to grant new permissions.

---

## 💾 Phase 3: Backend Implementation

### File: `convex/googleSheets.ts` (NEW)

Create this file in the `convex/` directory:

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { google } from 'googleapis';

/**
 * Export payroll to Google Sheets
 * Creates formatted spreadsheet with Summary + Configuration tabs
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
      // Initialize Google Sheets API
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
      await ctx.runMutation("internal.auditLogs.create", {
        action: "PAYROLL_EXPORT",
        entityType: "payroll",
        details: {
          spreadsheetId,
          spreadsheetUrl,
          dateRange: `${args.startDate} to ${args.endDate}`,
          totalDrivers: args.payrollData.length,
          totalPay: args.payrollData.reduce((s, d) => s + d.totalPay, 0),
        },
        complianceFlags: {
          requiresAudit: true,
          sensitiveData: true,
          regulatoryCompliance: true,
          parentNotification: false,
          medicalInformation: false,
        }
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
```

---

### File: `convex/schema.ts` (MODIFY)

Add PAYROLL_EXPORT to the action enum in audit logs:

```typescript
// Find the auditLogs table definition
auditLogs: defineTable({
  // ... existing fields ...
  action: v.union(
    v.literal("CREATE"),
    v.literal("UPDATE"),
    v.literal("DELETE"),
    // ... other existing actions ...
    v.literal("PAYROLL_EXPORT"),  // <-- ADD THIS LINE
  ),
  // ... rest of schema ...
})
```

---

### File: `convex/internal/auditLogs.ts` (NEW if doesn't exist)

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    action: v.union(
      v.literal("CREATE"),
      v.literal("UPDATE"),
      v.literal("DELETE"),
      v.literal("PAYROLL_EXPORT"),
      // ... other actions ...
    ),
    entityType: v.string(),
    details: v.optional(v.any()),
    complianceFlags: v.object({
      requiresAudit: v.boolean(),
      sensitiveData: v.boolean(),
      regulatoryCompliance: v.boolean(),
      parentNotification: v.boolean(),
      medicalInformation: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      action: args.action,
      entityType: args.entityType,
      timestamp: new Date().toISOString(),
      details: args.details || {},
      complianceFlags: args.complianceFlags,
    });
  },
});
```

---

### Deploy Backend

```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex deploy
```

---

## 📱 Phase 4: Frontend Implementation

### File: `dispatch-app/hooks/useGoogleSheetsExport.ts` (NEW)

```typescript
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
  ) => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Get OAuth token
      const token = await getToken({ template: 'oauth_google' });
      
      if (!token) {
        throw new Error('No Google OAuth token. Please sign out and sign back in.');
      }

      // Format data
      const payrollData = drivers.map(d => ({
        driverName: d.name,
        employeeId: d.employeeId,
        totalTrips: d.totalTrips,
        pickups: d.pickups,
        noGos: d.noGos,
        preCancels: d.preCancels,
        totalPay: d.totalPay,
      }));

      // Call Convex action
      const result = await exportToSheetsAction({
        payrollData,
        startDate,
        endDate,
        payrollConfig: config,
        oauthToken: token,
      });

      if (result.success) {
        // Open in browser
        await Linking.openURL(result.spreadsheetUrl);
        return {
          url: result.spreadsheetUrl,
          spreadsheetId: result.spreadsheetId,
          summary: result,
        };
      }

      return null;
    } catch (error: any) {
      setExportError(error.message);
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
```

---

### File: `dispatch-app/components/PayrollReport.tsx` (MODIFY)

Add this to your existing PayrollReport component:

```typescript
// Add imports
import { useGoogleSheetsExport } from '../hooks/useGoogleSheetsExport';
import { Alert, ActivityIndicator, Linking } from 'react-native';

// Inside component
export default function PayrollReport() {
  const { exportToNewSheet, isExporting, exportError } = useGoogleSheetsExport();

  // Your existing state...
  
  const handleExportToGoogleSheets = async () => {
    if (!driverPayroll || driverPayroll.length === 0) {
      Alert.alert('No Data', 'No payroll data to export');
      return;
    }

    const config = {
      pickupRate: 30,
      noGoRate: 25,
      preCancelRate: 20,
    };

    const result = await exportToNewSheet(
      driverPayroll,
      startDate,
      endDate,
      config
    );

    if (result) {
      Alert.alert(
        'Export Successful! 🎉',
        `${result.summary.totalDrivers} drivers\n$${result.summary.totalPay.toFixed(2)} total`,
        [
          { text: 'View Sheet', onPress: () => Linking.openURL(result.url) },
          { text: 'Done', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert('Export Failed', exportError || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      {/* Your existing UI */}
      
      {/* Add export buttons section */}
      <View style={styles.exportSection}>
        <TouchableOpacity
          style={[styles.exportButton, styles.csvButton]}
          onPress={handleExportCSV}
        >
          <Text style={styles.exportButtonText}>📄 Export CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, styles.sheetsButton]}
          onPress={handleExportToGoogleSheets}
          disabled={isExporting || !driverPayroll?.length}
        >
          {isExporting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View>
              <Text style={styles.exportButtonText}>📊 Export to Sheets</Text>
              <Text style={styles.exportButtonSubtext}>Formatted spreadsheet</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {exportError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {exportError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  exportSection: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  csvButton: {
    backgroundColor: '#6B7280',
  },
  sheetsButton: {
    backgroundColor: '#0F9D58', // Google green
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButtonSubtext: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
});
```

---

## ✅ Phase 5: Testing

### Test Checklist

- [ ] Install all dependencies
- [ ] Configure Clerk OAuth scopes
- [ ] Deploy Convex backend
- [ ] Sign out/in to grant new permissions
- [ ] Select date range with data
- [ ] Click "Export to Sheets"
- [ ] Verify loading state
- [ ] Verify sheet opens in browser
- [ ] Check Summary tab formatting
- [ ] Check Configuration tab data
- [ ] Verify audit log created
- [ ] Test error handling (no internet)

### Manual Test

```bash
# Start Convex
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev

# Start Dispatch App
cd dispatch-app
npx expo start
# Press 'i' for iOS
```

---

## 🚀 Phase 6: Deployment

```bash
# Deploy Convex
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex deploy --prod

# Build Dispatch App
cd dispatch-app
eas build --platform ios --profile preview
```

---

## 🔗 Integration & Automation

### Zapier Workflow Example

**New Payroll → Slack Notification:**

```
Trigger: Google Sheets - New Spreadsheet
Filter: Title contains "Go Happy Cab Payroll"
Action: Slack - Send Message
Channel: #payroll-reports
Message: "📊 New payroll: {{title}}\n{{url}}"
```

### Benefits of Integration

- **Automatic notifications** when payroll exported
- **QuickBooks integration** (create bills automatically)
- **Email summaries** to accounting team
- **Archive to backup** folder
- **SMS notifications** to drivers

---

## 🔧 Troubleshooting

### "No OAuth token available"

**Solution:** User needs to sign out and sign back in to grant Sheets permission

### Export button disabled

**Check:**
- Is there payroll data for the selected date range?
- Is `isExporting` stuck at `true`?
- Console errors?

### Sheet created but missing data

**Check Convex logs:**
```bash
npx convex logs | grep "GoogleSheets"
```

### Rate limit errors

**Wait 30 seconds between exports** - Google API has rate limits

---

## 📊 Success Metrics

Track these after deployment:
- Exports per week
- Success rate (target: >95%)
- Average export time (target: <10s)
- Zapier workflows created
- Time saved vs CSV method

---

## 🎯 Next Steps After Implementation

1. ✅ Test with real payroll data
2. ✅ Train dispatchers on new feature
3. ✅ Set up Zapier notification workflow
4. ✅ Monitor Convex logs for errors
5. ✅ Gather user feedback

---

## 📚 Additional Resources

- **Google Sheets API:** https://developers.google.com/sheets/api
- **Clerk OAuth:** https://clerk.com/docs/authentication/social-connections
- **Convex Actions:** https://docs.convex.dev/functions/actions
- **Zapier:** https://zapier.com/apps/google-sheets/integrations

---

**Mahalo for implementing this feature! 🌺**

This transforms payroll from manual CSV → one-click professional spreadsheets ready for automation.

---

*Questions? Check troubleshooting section or add comments in code for future reference.*
