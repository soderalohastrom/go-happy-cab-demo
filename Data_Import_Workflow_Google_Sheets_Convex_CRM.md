# Data Import Workflow: Google Sheets → Convex CRM

**Purpose:** Standardized process for migrating data from Google Sheets to Convex database with CRM UI integration.

**Project Context:**
- Convex Deployment: `colorful-wildcat-524.convex.cloud`
- Main project root: `/Users/soderstrom/2025/October/go-happy-cab-demo`
- Dispatch App: `dispatch-app/` (React Native + Expo)
- Import mutations file: `convex/importRealData.ts`

**Prerequisites:**
- Google Sheets MCP server connected with service account
- Convex MCP server connected to deployment
- `npx convex dev` running from project root (NOT from dispatch-app)

---

## Phase 1: Discovery & Assessment

**Step 1: Read Google Sheets Data**

```other
Use MCP tools: mcp__google-sheets__list_sheets → mcp__google-sheets__get_sheet_data
```

- Identify all sheets in the workbook
- Document column headers and sample data
- Note data formats (dates: MM/DD/YYYY, phone formats, etc.)

**Step 2: Read Convex Database Schema**

```other
Use MCP tools: mcp__convex__tables → mcp__convex__data
```

- List existing table schema and indexes
- Fetch sample records to understand current data structure
- Count total records

**Step 3: Correlation Analysis**

- Identify matching key fields (email, firstName+lastName, studentId, etc.)
- Create column mapping: `Sheets Column → Convex Field`
- Categorize columns:
    - **Existing & Populated** - Already in schema with data
    - **Existing but Sparse** - In schema but missing data
    - **Missing from Schema** - New columns to add

---

### Phase 2: Schema Extension

**Step 4: Add New Fields to Schema**

```typescript
// In convex/schema.ts
dateOfBirth: v.optional(v.string()),
jobTitle: v.optional(v.string()),
// etc.
```

**Step 5: Create Related Tables (if needed)**

```typescript
// New table for 1:N relationships
vehicles: defineTable({
  driverId: v.id("drivers"),
  // fields...
}).index("by_driver", ["driverId"])
```

**Step 6: Deploy Schema**

```Bash
npx convex dev --once
```

---

### Phase 3: Import Infrastructure

**Step 7: Create Import Mutation**

```typescript
export const importDriverDetailsFromSheets = internalMutation({
  args: {
    drivers: v.array(v.object({
      firstName: v.string(),
      email: v.optional(v.string()),
      // ... all sheet columns
    })),
  },
  handler: async (ctx, args) => {
    // Match by email (primary) or name (fallback)
    // Update existing records
    // Create related records (vehicles)
    // Return stats: updated, created, notFound, errors
  },
});
```

**Step 8: Add Helper Functions**

```typescript
function normalizeDate(dateStr: string): string {
  // MM/DD/YYYY → YYYY-MM-DD
}
```

---

### Phase 4: Execute Import

**Step 9: Transform Sheet Data**

```javascript
// Parse CSV/JSON from sheet into mutation format
const drivers = sheetData.map(row => ({
  firstName: row["First Name"],
  email: row["Email"],
  birthday: row["Birthday"],
  // ...
}));
```

**Step 10: Batch Import**

```Bash
# Import in batches of 20 to avoid timeouts
npx convex run importRealData:importDriverDetailsFromSheets --drivers "[batch1]"
npx convex run importRealData:importDriverDetailsFromSheets --drivers "[batch2]"
```

**Step 11: Verify Import**

```Bash
npx convex run importRealData:getDriverDataCompleteness
# Returns: { totalDrivers: 82, dataCompleteness: { birthday: 83%, ... } }
```

---

### Phase 5: UI Enhancement

**Step 12: Update Edit Form**

- Add new fields to form state
- Update `handleOpenEditModal` to populate from record
- Add form inputs (TextInput, Picker, etc.)
- Update `handleSubmit` to send new fields

**Step 13: Update Backend Mutation**

```typescript
// In convex/drivers.ts update mutation
dateOfBirth: v.optional(v.string()),
jobTitle: v.optional(v.string()),
// ...
```

**Step 14: Copy Generated Types**

```Bash
cd dispatch-app/convex && rm -rf _generated && cp -r ../../convex/_generated .
```

---

## Results Tracking Template

| **Metric**          | **Count**   |
| ------------------- | ----------- |
| Records in Sheets   | 66          |
| Records in Convex   | 82          |
| Matched & Updated   | 64          |
| Not Found           | 2           |
| New Related Records | 63 vehicles |
| Errors              | 0           |

---

## Completed Imports

### Drivers Import (Nov 24, 2025)
- **Source:** Google Sheet `1fd-JljNiATTqgr-T9RfEAO4FZRoNcnG_qwHuKHkoXGM`
- **New Schema Fields:** `dateOfBirth`, `jobTitle`, `licenseStateOfIssue`, `licenseZipCode`
- **New Table:** `vehicles` (year, make, model, color, plateNumber, vin)
- **Import Mutation:** `importRealData:importDriverDetailsFromSheets`
- **Results:** 64 drivers updated, 63 vehicles created
- **UI Updated:** DriversContent.tsx Edit modal with License Information section

### Parent/Guardian Import (Nov 25, 2025)
- **Source:** Google Sheet `1AJ2pvYuwX_A8AOv8elo9aNugzysVaHVHfMx3mXK0egA`
- **Type:** Data enrichment (no schema extension needed)
- **Matching Keys:** `childFirstName + childLastName` (case-insensitive)
- **Import Mutation:** `importRealData:importParentDetailsFromSheets`
- **Results:**
  - ~158 parents linked to 112 children
  - ~102 addresses updated
  - Parent1 completeness: 0% → 88%
  - Parent2 completeness: 13% → 62%
  - Complete addresses: 0% → 71%
- **Special Handling:**
  - Combined child names (e.g., "Andrea/Isabel") split and processed separately
  - Phone normalization to `(XXX) XXX-XXXX` format
  - Parent slot logic: fill parent1 first, then parent2 if parent1 exists
  - Address enrichment for records with "Unknown" city or empty zip

### Special Needs/Medical Import (Nov 25, 2025)
- **Source:** Google Sheet `14oZ8sg_cMupmx2Gm8SoUwM9cv2964l284l94eu_J0xA`
- **Type:** Data enrichment (no schema extension needed)
- **Matching Keys:** `childFirstName + childLastName` (case-insensitive)
- **Import Mutation:** `importRealData:importSpecialNeedsFromSheets`
- **Results:**
  - 90 children updated, 30 not found (name mismatches or vans)
  - homeLanguage completeness: 0% → 80%
  - specialNeeds completeness: 0% → 79%
  - medicalInfo completeness: 0% → 36%
  - teacher completeness: 0% → 19%
  - transportationNotes completeness: 0% → 12%
  - boosterSeat completeness: 0% → 4%
  - seizureProtocol: 1 child flagged
- **Special Handling:**
  - `parseSpecialNeeds()` - Parses "Autism - NV - Extreme Behavior" into structured array
  - `parseEquipmentNeeds()` - Extracts booster, locks, wheelchair, harness, etc.
  - Combined names (e.g., "Andrea/Isabel") split and processed separately
  - Builds transportationNotes from handoff requirements, safety vest, camera, ride assistant flags
  - Only updates empty/null fields to preserve existing data

---

## Key Implementation Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Database schema definitions |
| `convex/importRealData.ts` | Import mutations and helpers |
| `convex/drivers.ts` | Driver CRUD operations |
| `convex/children.ts` | Children CRUD operations |
| `dispatch-app/components/DriversContent.tsx` | Driver edit form UI |
| `dispatch-app/components/ChildrenContent.tsx` | Children edit form UI |
| `dispatch-app/hooks/useConvexRoutes.ts` | React hooks for Convex |

---

## Common Gotchas

1. **Always run `npx convex dev` from project root**, not from dispatch-app
2. **Copy generated types after schema changes:**
   ```bash
   cd dispatch-app/convex && rm -rf _generated && cp -r ../../convex/_generated .
   ```
3. **Use `internalMutation` for import functions** (not public mutations)
4. **Batch imports in groups of 20** to avoid Convex timeout limits
5. **Match by email first** (most reliable), then fallback to name matching
6. **Normalize dates** from MM/DD/YYYY to ISO YYYY-MM-DD format

