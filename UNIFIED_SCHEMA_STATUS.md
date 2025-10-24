# Unified Convex Schema Integration - Status Update

## ✅ Completed (Phase 1)

1. **Created unified schema** (`convex/schema.ts`)
   - Merged driver app's comprehensive schema with dispatch POC
   - Supports both dispatch and driver app workflows
   - Added `routes` table (replaces `assignments`) with AM/PM periods
   - Includes audit logs, notifications, messages, dispatch events
   
2. **Updated existing functions** to work with unified schema
   - `children.ts` - Now queries `firstName`/`lastName` instead of `name`
   - `drivers.ts` - Now queries `firstName`/`lastName` instead of `name`
   - `seed.ts` - Completely rewritten to populate unified schema

3. **Cleaned up invalid files**
   - Removed files with hyphens (Convex doesn't allow hyphens in filenames)
   - Removed: `schema-unified.ts`, `schema-poc-backup.ts`, `routesUnified.ts`, etc.

## ⚠️ Current Blocker: Schema Validation

**Problem**: The existing Convex deployment has old POC data that doesn't match the new schema:
- Old data: `{name: "John", active: true, metadata: {}}`
- New schema: `{firstName: string, lastName: string, createdAt: string, ...}`

Convex won't allow the schema push until existing data matches the new schema.

## 🎯 Solutions (Pick One)

### Option A: Fresh Convex Deployment ⭐ RECOMMENDED

**Why**: This was the original plan - create a unified deployment for both apps

**Steps**:
```bash
# 1. Create new deployment
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex init  # Create new project or deployment

# 2. Update .env.local with new URL
# EXPO_PUBLIC_CONVEX_URL=https://NEW_DEPLOYMENT.convex.cloud

# 3. Push schema and seed data
npx convex dev  # Schema will push cleanly
npx convex run seed:seedData  # Populate with unified data

# 4. Update dispatch-app/.env.local to point to same deployment
# 5. Update driver app to point to same deployment
```

**Pros**:
- Clean start, no migration issues
- Both apps share deployment from day 1
- Follows the integration plan

**Cons**:
- Loses POC demo data (but that's mock data anyway)
- Need to update env files

### Option B: Manual Dashboard Clear

**Steps**:
1. Open Convex dashboard: https://dashboard.convex.dev/d/rugged-mule-519
2. Go to Data tab
3. Manually delete all rows from: `children`, `drivers`, `assignments`, `auditLog`
4. Restart `npx convex dev` - schema will validate
5. Run `npx convex run seed:seedData`

**Pros**:
- Keep same deployment URL
- Quick fix

**Cons**:
- Manual steps required
- Still need to update dispatch-app to use this deployment

### Option C: Temporary Optional Fields

Make all new schema fields optional, clear data programmatically, then make required again. This is more complex and not recommended.

## 📋 Remaining Phase 1 Tasks

- [ ] Decide on solution (A, B, or C)
- [ ] Execute chosen solution
- [ ] Verify unified schema is active
- [ ] Seed unified data (18 children, 12 drivers, 100 routes)
- [ ] Test queries from both POC app and dispatch app
- [ ] Update dispatch-app/.env.local to point to unified deployment
- [ ] Commit unified schema changes

## 📝 Files Modified

- `convex/schema.ts` - Now contains unified schema (19KB, ~650 lines)
- `convex/children.ts` - Updated queries for unified schema
- `convex/drivers.ts` - Updated queries for unified schema  
- `convex/seed.ts` - Completely rewritten for unified data
- Deleted: All files with hyphens in names

## 🎯 Next Steps After Resolution

Once schema is active and seeded:

1. **Test dispatch app** - Verify POC still works with unified schema
2. **Test calendar queries** - Ensure date-based queries work
3. **Begin Phase 2** - Calendar component in dispatch-app
4. **Update driver app** - Point to unified deployment
5. **Test real-time sync** - Dispatch ↔ Driver communication

## 💡 Recommendation

**Go with Option A** - Fresh deployment. It's the cleanest path and aligns with the integration plan. The POC data is just mock data, so there's nothing to preserve.

Command to execute:
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo
# Kill current convex dev
pkill -f "convex dev"

# If you want to keep using the same deployment,
# just go to dashboard and manually clear the tables.
# Then restart convex dev.

# OR create a new deployment:
# npx convex init --configure-new
```

