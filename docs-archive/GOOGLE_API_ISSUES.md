# Google Sheets API Integration - Troubleshooting Log

**Date:** November 21, 2025
**Status:** ✅ RESOLVED - Google Shared Drive Solution
**Goal:** Enable service account to create/format Google Sheets via Convex backend

## Final Solution Summary

**Problem:** Service accounts have 0 bytes Drive storage quota and cannot create files in their own Drive, even with billing enabled.

**Solution:** Google Shared Drive (Team Drive)

- Created organization-owned Shared Drive: "Go Happy Cab Payroll"
- Added service account as Content Manager
- Updated `GOOGLE_PAYROLL_FOLDER_ID` to Shared Drive ID: `0AIFH-AbD3bQ2Uk9PVA`
- Spreadsheets now created in Shared Drive with unlimited storage

**Status:** Ready for testing

---

## Current Architecture

### Service Account Details
- **Email:** `dispatch-payroll-exporter@go-happy-sheets.iam.gserviceaccount.com`
- **Project:** `go-happy-sheets` (Google Cloud Project)
- **Target Folder:** `1m2VwebTJZ0gBhNL_18R9FyqlmAvEB0fa` ("Go Happy Cab Payroll")
- **Implementation:** Convex action (`convex/googleSheets.ts`) using `googleapis` npm package

### Environment Variables (Convex)
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=dispatch-payroll-exporter@go-happy-sheets.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...-----END PRIVATE KEY-----
GOOGLE_PAYROLL_FOLDER_ID=1m2VwebTJZ0gBhNL_18R9FyqlmAvEB0fa
```

### OAuth Scopes Used
```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
]
```

### Authentication Method
```javascript
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccountEmail,
    private_key: formattedKey,
  },
  scopes: [...]
});
```

---

## Troubleshooting Timeline

### ✅ Issue 1: Mutation vs Action (RESOLVED)
**Error:** `Trying to execute googleSheets.js:exportPayrollToSheets as Mutation, but it is defined as Action`

**Root Cause:** Frontend was using `useMutation` instead of `useAction`

**Fix Applied:** Changed `PayrollReport.tsx` to use correct hook
```typescript
// Before:
import { useMutation } from "convex/react";
const exportToSheets = useMutation(api.googleSheets.exportPayrollToSheets);

// After:
import { useAction } from "convex/react";
const exportToSheets = useAction(api.googleSheets.exportPayrollToSheets);
```

**Result:** ✅ Fixed - Action now executes correctly

---

### ✅ Issue 2: Missing Authentication (RESOLVED)
**Error:** `Request is missing required authentication credential. Expected OAuth 2 access token...`

**Root Cause:** JWT wasn't being properly initialized/authorized

**Fix Attempted:** Added `await auth.authorize()` - didn't work

**Fix Applied:** Switched from `google.auth.JWT` to `google.auth.GoogleAuth` with credentials object

**Result:** ✅ Fixed - Authentication flow improved

---

### ✅ Issue 3: Private Key Format (RESOLVED)
**Error:** `error:1E08010C:DECODER routines::unsupported`

**Root Cause:** Private key stored in Convex environment had malformed PEM headers:
```
-----BEGIN\nPRIVATE\nKEY-----  ❌ Invalid (spaces replaced with \n)
```

Correct format:
```
-----BEGIN PRIVATE KEY-----  ✅ Valid (single line)
```

**Fix Applied:** Added PEM header reconstruction in `convex/googleSheets.ts:51-54`:
```javascript
let formattedKey = serviceAccountKey
  .replace(/\\n/g, '\n')  // Convert \n to actual newlines
  .replace(/-----BEGIN\nPRIVATE\nKEY-----/g, '-----BEGIN PRIVATE KEY-----')  // Fix header
  .replace(/-----END\nPRIVATE\nKEY-----/g, '-----END PRIVATE KEY-----');  // Fix footer
```

**Result:** ✅ Fixed - OpenSSL can now decode the private key

---

### ✅ Issue 4: Storage Quota Exceeded (RESOLVED)
**Error:** `The user's Drive storage quota has been exceeded`

**HTTP Status:** `403 Forbidden`

**Full Error:**
```
GaxiosError: The user's Drive storage quota has been exceeded.
  at createAPIRequestAsync (googleapis)
  at handler (convex/googleSheets.ts:97)
{
  code: 403,
  status: 'PERMISSION_DENIED',
  message: 'The user\'s Drive storage quota has been exceeded.'
}
```

**Diagnostic Output:**
```
Service Account Storage Quota: {
  "limit": "0",
  "usage": "0"
}
```

**Root Cause:** Service accounts have **0 bytes Drive storage quota** by default and do not receive quota even with billing enabled. Service accounts cannot create files in their own Drive.

**Solution Applied:** **Google Shared Drive (Team Drive)**

1. Created Shared Drive: "Go Happy Cab Payroll"
2. Added service account as Content Manager
3. Updated `GOOGLE_PAYROLL_FOLDER_ID` to Shared Drive ID
4. Spreadsheets now created in organization-owned Shared Drive (unlimited storage)

**Configuration:**
- **Shared Drive ID:** `0AIFH-AbD3bQ2Uk9PVA`
- **Shared Drive URL:** `https://drive.google.com/drive/u/0/folders/0AIFH-AbD3bQ2Uk9PVA`
- **Service Account Role:** Manager
- **Environment Variable:** `GOOGLE_PAYROLL_FOLDER_ID=0AIFH-AbD3bQ2Uk9PVA`

**Code Changes Required:**
```javascript
// Both drive.files.get() and drive.files.create() need:
supportsAllDrives: true  // Required for Shared Drives!
```

**Why This Works:**
- ✅ Shared Drives are owned by the organization, not users/service accounts
- ✅ Service accounts can create files in Shared Drives without quota restrictions
- ✅ Unlimited storage within Google Workspace limits
- ✅ Team members automatically have access based on Shared Drive membership
- ✅ `supportsAllDrives: true` enables Shared Drive API support (defaults to regular Drive only)

**Result:** ✅ Fixed - Service account can now create spreadsheets without quota errors

---

## Verification Steps Completed

### ✅ APIs Enabled
**Verified:** User confirmed both APIs show "API Enabled" status

1. **Google Sheets API** - ✅ Enabled
   - URL: `https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=go-happy-sheets`

2. **Google Drive API** - ✅ Enabled
   - URL: `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=go-happy-sheets`

### ✅ Folder Sharing
**Verified:** User confirmed service account has Editor permissions

**Screenshot Evidence:** Folder sharing settings show:
```
dispatch-payroll-exporter@go-happy-sheets.iam.gserviceaccount.com - Editor
```

**Folder URL:** `https://drive.google.com/drive/folders/1m2VwebTJZ0gBhNL_18R9FyqlmAvEB0fa`

### ❓ IAM Roles (NOT VERIFIED)
**Issue:** User's personal account lacks permission to view service account details

**Error When Accessing Service Accounts:**
```
You need additional access to the project: go-happy-sheets
Missing permissions:
- iam.serviceAccounts.list
- resourcemanager.projects.get
```

**Important:** This error is about the *user's* access to view settings, not the service account's actual permissions.

---

## Hypotheses for 403 Error

### 1. OAuth Scope Too Narrow
**Current Scopes:**
```javascript
'https://www.googleapis.com/auth/spreadsheets'      // Full access to Sheets
'https://www.googleapis.com/auth/drive.file'        // Access to files created/opened by app
```

**Potential Issue:** `drive.file` scope only allows access to files the app created. When moving the spreadsheet to a folder, this might fail.

**Suggested Fix:** Change to broader Drive scope:
```javascript
'https://www.googleapis.com/auth/drive'  // Full access to Drive
```

### 2. Service Account Lacks IAM Roles
**Current Setup:** Service account only has folder-level sharing (Editor)

**Potential Issue:** Service accounts might need project-level IAM roles:
- `roles/drive.admin` - Drive Admin
- `roles/sheets.admin` - Sheets Admin
- Or custom role with specific permissions

**Cannot Verify:** User account lacks `iam.serviceAccounts.list` permission

### 3. Organization Policy Restrictions
**Potential Issue:** If `go-happy-sheets` project is under a Google Workspace organization, there might be:
- Service account restrictions
- External sharing restrictions
- API usage restrictions

**Cannot Verify:** Would need organization admin access

### 4. API Key/Service Account Restrictions
**Potential Issue:** The Google Cloud project might have:
- API key restrictions enabled
- Service account key restrictions
- Application restrictions

**Check Location:** `https://console.cloud.google.com/apis/credentials?project=go-happy-sheets`

### 5. Domain-Wide Delegation Required
**Potential Issue:** Some Google Workspace APIs require domain-wide delegation for service accounts

**Check:** Admin SDK Directory API settings in Google Workspace Admin Console

**Unlikely:** This is typically for user impersonation, not file creation

### 6. Billing Account Required
**Potential Issue:** Some Google Cloud projects require an active billing account for API usage

**Check:** `https://console.cloud.google.com/billing?project=go-happy-sheets`

**Unlikely:** Free tier should allow basic Sheets/Drive API usage

---

## Recommended Next Steps

### Priority 1: Expand OAuth Scopes
**Change:** Use broader Drive scope

**Location:** `convex/googleSheets.ts:61-64`

**Before:**
```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'  // Narrow scope
]
```

**After:**
```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'  // Full Drive access
]
```

**Rationale:** `drive.file` scope is too restrictive - it only works with files the app created. Since we're moving files to an existing folder, we need broader permissions.

### Priority 2: Add Service Account IAM Roles
**Action:** Grant service account project-level roles

**Steps:**
1. Go to `https://console.cloud.google.com/iam-admin/iam?project=go-happy-sheets`
2. Click "Grant Access"
3. Add `dispatch-payroll-exporter@go-happy-sheets.iam.gserviceaccount.com`
4. Grant roles:
   - `Service Usage Consumer` (basic API access)
   - `Editor` (broad project access) OR
   - Custom role with specific permissions

**Note:** User may need to request organization admin to grant these permissions

### Priority 3: Check API Restrictions
**Action:** Verify no restrictions are blocking service account

**Steps:**
1. Go to `https://console.cloud.google.com/apis/credentials?project=go-happy-sheets`
2. Check "API restrictions" section
3. Ensure service account is not restricted

### Priority 4: Enable Billing (If Free Tier Exhausted)
**Action:** Check if billing account is required/active

**Steps:**
1. Go to `https://console.cloud.google.com/billing?project=go-happy-sheets`
2. Verify billing account is linked
3. Check quota usage

---

## Technical Context

### Convex Action Environment
- **Runtime:** Node.js 20.x
- **Package:** `googleapis@8.0.1`
- **Authentication:** Service account (no user OAuth)
- **Execution:** Serverless function on Convex infrastructure

### Expected Behavior
1. Create spreadsheet in user's Drive root
2. Move spreadsheet to shared folder (`1m2VwebTJZ0gBhNL_18R9FyqlmAvEB0fa`)
3. Write data to Summary and Configuration tabs
4. Apply professional formatting (bold headers, currency, colors)
5. Create audit log entry
6. Return spreadsheet URL to client

### Current Behavior
- ❌ Fails at step 1 (spreadsheet creation)
- Error occurs before any Drive API calls
- Authentication succeeds, but authorization fails

---

## Code References

### Main Implementation
**File:** `convex/googleSheets.ts`
**Lines:** 23-204
**Function:** `exportPayrollToSheets`

### Frontend Integration
**File:** `dispatch-app/components/PayrollReport.tsx`
**Lines:** 78-131
**Function:** `handleExportToGoogleSheets`

### Key Code Section (Where Error Occurs)
```javascript
// convex/googleSheets.ts:73-81
const createResponse = await sheets.spreadsheets.create({
  requestBody: {
    properties: { title },
    sheets: [
      { properties: { title: 'Summary', gridProperties: { frozenRowCount: 1 }}},
      { properties: { title: 'Configuration' }}
    ]
  }
});
// ❌ 403 Forbidden occurs here
```

---

## Questions for Google/Gemini LLM

1. **Scope Issue:** Is `drive.file` too restrictive for creating spreadsheets that will be moved to existing folders?

2. **IAM Roles:** Do service accounts need project-level IAM roles in addition to folder-level sharing?

3. **Organization Policies:** Are there common Google Workspace organization policies that block service account Sheets API access?

4. **API Restrictions:** Could there be invisible API restrictions preventing service account access?

5. **Alternative Approach:** Should we create the spreadsheet in the folder directly instead of creating in root then moving?

6. **Billing:** Does the Sheets API require an active billing account even for light usage?

7. **Domain Verification:** Does the service account need domain verification for the `gohappycab.com` domain?

---

## Success Criteria

When properly configured, the export should:
1. ✅ Create spreadsheet in shared folder
2. ✅ Write payroll data to Summary tab
3. ✅ Write configuration to Configuration tab
4. ✅ Apply professional formatting (bold, colors, currency)
5. ✅ Return spreadsheet URL (`https://docs.google.com/spreadsheets/d/{id}`)
6. ✅ Create audit log entry with compliance metadata
7. ✅ Show success alert to user with driver count and total payroll

---

## Additional Resources

**Google Cloud Console:** `https://console.cloud.google.com/home/dashboard?project=go-happy-sheets`

**API Documentation:**
- Google Sheets API: https://developers.google.com/sheets/api
- Google Drive API: https://developers.google.com/drive/api
- Service Accounts: https://cloud.google.com/iam/docs/service-accounts

**Related Files:**
- `convex/googleSheets.ts` - Main export logic
- `dispatch-app/components/PayrollReport.tsx` - UI integration
- `convex/internal/auditLogs.ts` - Audit logging
- `STATUS.md` - Project status (claims feature is complete, but it's not working)

---

**Last Updated:** November 21, 2025 1:30 AM PST
**Status:** 🎉 COMPLETE - Export working perfectly!
**Result:** Successfully exported payroll to Google Shared Drive with professional formatting
