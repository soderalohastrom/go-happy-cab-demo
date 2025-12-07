# Go Happy Cab - Progress Log

Append-only session log. Each session adds an entry at the top.

---

## 2025-12-06 — Claude Code Session

### Completed: On Hold / Hide Toggle Feature (FULL IMPLEMENTATION)

**Schema Changes:**
- Added `onHold` (boolean) and `onHoldSince` (string) fields to both `children` and `drivers` tables
- Added `by_on_hold` index to both tables for efficient filtering

**Backend Mutations:**
- `children.toggleOnHold` - Toggle on-hold status with timestamp
- `drivers.toggleOnHold` - Toggle on-hold status with timestamp

**Dispatch Pool Filtering:**
- `getUnassignedChildren` now filters out on-hold children
- `getUnassignedDrivers` now filters out on-hold drivers
- On-hold entities won't appear in drag-drop pairing columns

**Copy-Forward Logic:**
- `copyFromLastValidDay` skips on-hold children with proper logging
- Skipped children tracked in response with reason "On Hold"

**UI Implementation:**
- Children cards: Orange toggle switch with greyed-out styling (opacity 0.5)
- Drivers cards: Matching toggle with same visual treatment
- Toggle provides instant visual feedback (no confirmation dialog)

### Files Modified
- `convex/schema.ts` - Schema fields and indexes
- `convex/children.ts` - toggleOnHold mutation
- `convex/drivers.ts` - toggleOnHold mutation
- `convex/assignments.ts` - Query filtering and copy-forward logic
- `dispatch-app/components/ChildrenContent.tsx` - UI toggle
- `dispatch-app/components/DriversContent.tsx` - UI toggle

### Bugfix: AuditLogs Schema
- Added `copied`, `skipped`, `closedSchools` fields to `auditLogs.details` schema
- Fixed copy-forward operation failing due to schema validation error

### Verified & Ready to Merge
- All 7 implementation tasks passing in TASKS.json
- Copy-forward tested and working
- Types synced to dispatch-app

---

## 2025-12-05 — Claude Code Session

### Completed
- Twilio SMS integration (`twilioActions.ts`) - code working, blocked on A2P 10DLC registration
- Merged `feature/twilio-online` branch to master
- Created comprehensive system overview: `CLAUDE_DRIVER_CHILD_SYSTEM_OVERVIEW_PRELAUNCH.md`
- Documented child/driver pairing logic, copy-forward workflow, date constraints

### New Feature Started: On Hold / Hide Toggle
- Created feature spec: `FEATURE_ON_HOLD_TOGGLE.md`
- Initialized `TASKS.json` with 8 acceptance-criteria tasks
- Pivoted from STATUS.md to PROGRESS.md workflow

### Key Decisions
- On Hold = "soft archive" - greyed out but searchable, easily reactivated
- Affects Children and Drivers only (Schools/Districts deferred)
- On-hold entities removed from dispatch pool but visible in management tabs
- Past assignments unaffected (snapshot in time)

### Next Session
- Implement schema changes (onHold, onHoldSince fields)
- Create toggleOnHold mutations
- Update dispatch queries to filter on-hold entities
- Build toggle UI on entity cards

---

## Pre-2025-12-05 — Project History

Major milestones completed before PROGRESS.md adoption:
- Phase 9: Schools Management (5 tables, Schools tab, Add District/School)
- Phase 10: Push Notifications Infrastructure
- Phase 12: SMS Switchboard Integration (Phase 2 complete)
- Calendar-based assignment system with drag-drop pairing
- Smart copy-forward with school closure filtering
- Search filtering on Children/Drivers/Schools/Districts tabs

See `STATUS.md` for detailed historical record.
