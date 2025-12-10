# Cathey Global CRM Import Overview

## Purpose

Import Google Contacts into a **Global CRM contact directory** that is completely separate from the Dispatch App's operational data. This CRM functions like Google Contacts - a free-form contact list organized by Labels.

---

## Separation of Concerns (CRITICAL)

### Dispatch App Tables (DO NOT TOUCH)
These tables drive the core dispatch functionality and must remain untouched by the CRM import:

- `drivers` - Driver records for route assignments
- `children` - Student/rider records
- `schools` - School location data
- `districts` - School district data
- `schoolContacts` - School staff contacts
- `routes` - Daily route assignments
- `assignments` - Child-to-driver pairings

### Global CRM Table (SEPARATE)
The CRM import writes ONLY to this dedicated table:

- **`crmContacts`** - Standalone contact directory with Labels support

The `crmContacts` table has its own unique fields that don't exist in dispatch tables:
- `labels` (array of strings) - Google Contacts-style labels
- `source` - Import source tracking (e.g., "google_contacts_csv")
- `sourceRowId` - Row reference for deduplication

---

## Schema: crmContacts

Located in `convex/schema.ts` (lines ~1069-1122):

```typescript
crmContacts: defineTable({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  middleName: v.optional(v.string()),
  organizationName: v.optional(v.string()),
  organizationTitle: v.optional(v.string()),
  organizationDepartment: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  alternatePhone: v.optional(v.string()),
  address: v.optional(v.string()),
  labels: v.array(v.string()),       // Google Contacts labels
  notes: v.optional(v.string()),
  source: v.string(),                 // Import tracking
  sourceRowId: v.optional(v.string()), // Row deduplication
  createdAt: v.string(),
  updatedAt: v.string(),
  isActive: v.boolean(),
})
```

---

## Import Script

### File: `scripts/import-csv-contacts.cjs`

This CommonJS script reads a CSV file and imports contacts to the `crmContacts` table via the Convex HTTP client.

**Usage:**
```bash
node scripts/import-csv-contacts.cjs
```

**CSV Input File:**
> **TO BE DETERMINED** - A cleaned/scrubbed CSV will be provided. Update the `CSV_FILE` constant in the script:
> ```javascript
> const CSV_FILE = path.join(__dirname, "YOUR_CLEANED_CSV.csv");
> ```

**Current CSV reference (needs cleaning):** `scripts/contacts_cathey.csv`

### CSV Column Mapping

The script expects Google Contacts CSV export format with these columns (0-indexed):

| Column Index | Field |
|--------------|-------|
| 0 | First Name |
| 1 | Middle Name |
| 2 | Last Name |
| 10 | Organization Name |
| 11 | Organization Title |
| 12 | Organization Department |
| 14 | Notes |
| 16 | Labels (separated by " ::: ") |
| 18 | Email 1 Value |
| 20 | Email 2 Value |
| 24 | Phone 1 Value |
| 26 | Phone 2 Value |
| 28 | Phone 3 Value |
| 34 | Address 1 Formatted |

### Data Quality Filters

The import script applies these minimum requirements:

1. **Must have identity**: First Name, Last Name, OR Organization Name
2. **Must have contact method**: Phone OR Email

Rows missing both identity AND contact info are skipped as garbage data.

---

## Convex Backend Functions

### File: `convex/crmImport.ts`

> **NOTE:** This file may need updates to align with the simplified schema. The `bulkCreate` mutation should be verified before running import.

Key functions:
- `analyzeContacts` - Query to preview/analyze contacts before import
- `importContacts` - Mutation to insert contacts
- `clearAll` - Mutation to wipe CRM table for re-import
- `getImportStats` - Query for import statistics

### File: `convex/crm.ts`

CRUD operations for the CRM contacts table used by the UI.

---

## Data Quality Analysis (Original CSV)

Analysis of `contacts_cathey.csv` showed:

| Metric | Count | % |
|--------|-------|---|
| Total rows | 1,119 | 100% |
| Has Name OR Org | 972 | 86.9% |
| Has Phone OR Email | 973 | 87.0% |
| **Complete contacts** | **967** | **86.4%** |
| Garbage (empty) | 141 | 12.6% |

A cleaner CSV with pre-scrubbed data will improve import quality.

---

## UI Component

### File: `dispatch-app/components/CrmContactsContent.tsx`

Table view with Labels sidebar for filtering contacts. Displays:
- Contact name (First Last or Organization)
- Phone
- Email
- Labels (as tags)

Accessible via the `/crm` route in the Dispatch App (4th tab or dedicated route).

---

## Pre-Import Checklist

Before running the import:

1. [ ] Obtain cleaned CSV file
2. [ ] Update `CSV_FILE` path in `scripts/import-csv-contacts.cjs`
3. [ ] Verify `npx convex dev` is running or run `npx convex deploy`
4. [ ] Verify `crmImport:bulkCreate` mutation exists and matches schema
5. [ ] Confirm CRM table is empty: `npx convex run crm:getStats`
6. [ ] Run import: `node scripts/import-csv-contacts.cjs`
7. [ ] Verify import: `npx convex run crm:getStats`

---

## Next Steps

1. **Provide cleaned CSV** - Scrubbed data with garbage rows removed
2. **Update script** - Point to new CSV filename
3. **Verify Convex functions** - Ensure `bulkCreate` mutation is deployed
4. **Run import** - Execute the import script
5. **Verify in UI** - Check `/crm` route displays contacts with Labels

---

*Document created: December 9, 2025*
*Status: Awaiting cleaned CSV input file*
