# Go Happy Cab: Child-Driver Pairing System Overview
## Pre-Launch Technical Analysis - CLAUDE CODE

**Created:** December 5, 2025
**Purpose:** Deep-dive into the assignment/pairing system before driver rollout
**Context:** 120+ children, 67+ drivers, Training Day imminent

---

## Executive Summary

The Go Happy Cab dispatch system uses a **date-keyed, period-based (AM/PM) pairing model**. Each assignment is a single record in the `routes` table linking one child to one driver for a specific date and period. The system is designed for a **daily dispatch workflow** where 85%+ of routes stay the same day-to-day, with the dispatcher making adjustments each morning.

**Key Design Principles:**
1. **Copy-Forward Model** - Start each day by copying previous day's assignments
2. **Visual Drag-Drop** - Intuitive child → driver pairing for exceptions
3. **Today-Only for Drivers** - Drivers see only current day's assignments
4. **No Time Validation** - Pairs can be created/modified at any time (by design)

---

## 1. The Routes Table: Core Data Structure

**Location:** [convex/schema.ts:327-384](convex/schema.ts#L327-L384)

```typescript
routes: defineTable({
  // === PRIMARY KEY COMPONENTS ===
  date: v.string(),                    // ISO format: "2025-12-05"
  period: v.union(v.literal("AM"), v.literal("PM")),
  childId: v.id("children"),

  // === ASSIGNMENT ===
  driverId: v.id("drivers"),
  type: v.union(v.literal("pickup"), v.literal("dropoff")),

  // === STATUS LIFECYCLE ===
  status: v.union(
    v.literal("draft"),           // Created but not finalized
    v.literal("scheduled"),       // Confirmed, awaiting execution
    v.literal("assigned"),        // Driver acknowledged
    v.literal("in_progress"),     // Pickup/dropoff underway
    v.literal("completed"),       // Successfully finished
    v.literal("cancelled"),       // Dispatcher cancelled
    v.literal("no_show"),         // Child didn't appear
    v.literal("late_cancel"),     // Last-minute cancellation
    v.literal("na"),              // Not applicable (school closed, etc.)
    v.literal("emergency_stop")   // Emergency situation
  ),

  // === TIMING (Optional) ===
  scheduledTime: v.optional(v.string()),  // Expected time "08:30"
  actualStartTime: v.optional(v.string()),
  actualEndTime: v.optional(v.string()),

  // === DRIVER TRACKING ===
  childPresent: v.optional(v.boolean()),
  childCondition: v.optional(v.string()),
  driverNotes: v.optional(v.string()),

  // === METADATA ===
  createdAt: v.string(),
  updatedAt: v.string(),
})
```

### Critical Indexes (Prevent Double-Booking)

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_child_date_period` | childId + date + period | **Prevents** same child assigned twice for same date/period |
| `by_driver_date_period` | driverId + date + period | Query driver's routes for a period |
| `by_date_period` | date + period | Get all routes for dispatch view |
| `by_driver_date` | driverId + date | Get all driver's routes for a day |

---

## 2. Copy Previous Day: The Daily Workflow

**Location:** [convex/assignments.ts](convex/assignments.ts)

### How It Works

When dispatcher taps "Copy Routes" for December 6th:

```
┌─────────────────────────────────────────────────────────────────┐
│  SOURCE: December 5th routes table                              │
│  ┌──────────┬────────┬────────┬────────────────┬─────────────┐  │
│  │ childId  │ date   │ period │ driverId       │ status      │  │
│  ├──────────┼────────┼────────┼────────────────┼─────────────┤  │
│  │ child_A  │ Dec 5  │ AM     │ driver_1       │ completed   │  │
│  │ child_A  │ Dec 5  │ PM     │ driver_1       │ completed   │  │
│  │ child_B  │ Dec 5  │ AM     │ driver_2       │ completed   │  │
│  │ child_B  │ Dec 5  │ PM     │ driver_2       │ no_show     │  │
│  └──────────┴────────┴────────┴────────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    copyFromLastValidDay()
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TARGET: December 6th routes table (NEW RECORDS)                │
│  ┌──────────┬────────┬────────┬────────────────┬─────────────┐  │
│  │ childId  │ date   │ period │ driverId       │ status      │  │
│  ├──────────┼────────┼────────┼────────────────┼─────────────┤  │
│  │ child_A  │ Dec 6  │ AM     │ driver_1       │ scheduled   │  │
│  │ child_A  │ Dec 6  │ PM     │ driver_1       │ scheduled   │  │
│  │ child_B  │ Dec 6  │ AM     │ driver_2       │ scheduled   │  │
│  │ child_B  │ Dec 6  │ PM     │ driver_2       │ scheduled   │  │
│  └──────────┴────────┴────────┴────────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Behaviors

1. **Status Resets to "scheduled"** - Previous day's completion status is not copied
2. **School Closure Check** - Children at closed schools are SKIPPED (not copied)
3. **Duplicate Prevention** - If route already exists for target date, it's skipped
4. **14-Day Lookback** - Smart copy searches up to 14 days back to find last valid schedule

### Three Copy Mutations Available

| Mutation | Use Case | Smart Features |
|----------|----------|----------------|
| `copyFromPreviousDay` | Copy yesterday → today | Simple, previous calendar day |
| `copyFromDate` | Copy specific date → target | Manual source date selection |
| `copyFromLastValidDay` | **PRIMARY** - Smart copy | Skips weekends, checks school closures, 14-day lookback |

---

## 3. Drag-and-Drop Pairing Logic

**Location:** [dispatch-app/components/AssignmentScreen.tsx](dispatch-app/components/AssignmentScreen.tsx)

### The Two-Phase Commit Model

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Visual State (In-Memory Only)                        │
│                                                                 │
│  ┌─────────────┐     DRAG      ┌─────────────────────────────┐  │
│  │  Children   │ ───────────▶  │  Driver Carpool Zone        │  │
│  │  (Unpaired) │               │  ┌─────┬─────┬─────┐        │  │
│  │             │               │  │ C1  │ C2  │ C3  │ max 3  │  │
│  │  [Child A]  │               │  └─────┴─────┴─────┘        │  │
│  │  [Child B]  │               │  Driver: João Silva         │  │
│  │  [Child C]  │               └─────────────────────────────┘  │
│  └─────────────┘                                                │
│                                                                 │
│  State: driverCarpools Map<driverId, childId[]>                 │
│  NOT YET PERSISTED TO DATABASE                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    "Confirm Routes" button
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Database Persistence                                  │
│                                                                 │
│  For each (driverId, [childIds]) in driverCarpools:             │
│    For each childId:                                            │
│      createRoute({                                              │
│        date: selectedDate,      // "2025-12-06"                 │
│        period: activePeriod,    // "AM" or "PM"                 │
│        driverId: driverId,                                      │
│        childId: childId,                                        │
│        type: "pickup" | "dropoff",                              │
│        status: "scheduled"                                      │
│      })                                                         │
│                                                                 │
│  Result: Individual route records in Convex                     │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Rules (Enforced During Drag)

| Rule | Enforcement | Error Handling |
|------|-------------|----------------|
| Max 3 children per driver | Frontend check in `handleDragEnd` | Alert: "Carpool Full" |
| No duplicate child in carpool | Frontend check | Alert: "Already Paired" |
| Child not already assigned | Database index `by_child_date_period` | Mutation fails |
| One-directional drag | UI constraint | Children → Drivers only |

### Unpairing (X Button)

- Removes child from `driverCarpools` Map in UI state
- If already persisted, calls `deleteRoute` mutation
- Route record is deleted from database (not soft-deleted)

---

## 4. Date and Time Constraints

### What IS Validated

| Constraint | Where | Behavior |
|------------|-------|----------|
| Child double-booking | Database index | Mutation fails if child already has route for date+period |
| Carpool size (max 3) | Frontend | Alert shown, drag rejected |
| School closure | Copy mutation | Child skipped (soft warning) |

### What IS NOT Validated

| Scenario | Current Behavior | Implication |
|----------|------------------|-------------|
| **Pairing after pickup time** | Allowed | Dispatcher can add 9AM child at 9:10AM |
| **Pairing for past dates** | Allowed | Can modify yesterday's routes |
| **Pairing far in future** | Allowed | Can create routes for next month |
| **AM/PM shift completion** | No check | Can modify PM routes during PM shift |
| **scheduledTime validation** | Optional field | Not required, not validated against current time |

### Design Rationale

This is **intentional flexibility** for dispatch operations:
- Late additions happen (parent calls at 8:50AM)
- Corrections needed after the fact (wrong driver logged)
- Pre-planning for known schedule changes
- Historical corrections for billing/compliance

---

## 5. Multi-Day Forward Copying

### Scenario: Copy → Copy → Copy (3 Days Ahead)

```
Today: December 5th

Action: Open Dec 6 → Copy from Dec 5
Result: Dec 6 routes created (source: Dec 5)

Action: Open Dec 7 → Copy from Dec 6
Result: Dec 7 routes created (source: Dec 6)

Action: Open Dec 8 → Copy from Dec 7
Result: Dec 8 routes created (source: Dec 7)
```

### Current Behavior

- **Each copy is independent** - Changes to Dec 6 after copying to Dec 7 don't propagate
- **No cascade updates** - If you edit Dec 6, Dec 7/8 retain original values
- **Fresh status** - Each copy resets status to "scheduled"
- **School closure checks** - Each copy checks target date for closures

### Potential Issues

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Copied routes for holiday | Children assigned to closed schools | Smart copy filters, but manual override possible |
| Driver vacation not captured | Routes assigned to unavailable driver | No current validation (future enhancement) |
| Child schedule change | Old schedule propagated forward | Dispatcher must manually adjust |

---

## 6. Driver App: Today-Only View

**Location:** Driver App at `/Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/`

### What Drivers See

```
┌──────────────────────────────────────────┐
│  Routes Tab - December 5, 2025           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  AM Pickups (3)                    │  │
│  │  ├── Maria Santos      ⏱️ 7:30 AM  │  │
│  │  ├── João Silva        ⏱️ 7:45 AM  │  │
│  │  └── Ana Pereira       ⏱️ 8:00 AM  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  PM Dropoffs (3)                   │  │
│  │  ├── Maria Santos      ⏱️ 3:00 PM  │  │
│  │  ├── João Silva        ⏱️ 3:15 PM  │  │
│  │  └── Ana Pereira       ⏱️ 3:30 PM  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Hard Constraints

| Capability | Status | Implementation |
|------------|--------|----------------|
| View today's routes | ✅ YES | `useTodayISO()` → query |
| View yesterday's routes | ❌ NO | No date navigation UI |
| View tomorrow's routes | ❌ NO | No date navigation UI |
| View any other date | ❌ NO | Hardcoded to system date |
| Modify routes | ❌ NO | Read-only display |
| Mark status (complete/no-show) | ✅ YES | Update mutations available |

### Query Flow

```typescript
// Driver app hardcodes TODAY
const today = useTodayISO();  // Always returns current date

// Query filtered to driver + today
const routes = useDriverRoutes(currentDriver._id, today);

// Backend query
api.assignments.getForDate({ date: today })
  .filter(route => route.driverId === currentDriver._id)
```

---

## 7. Pre-Launch Considerations

### Recommended Verifications

| Check | Why | How to Test |
|-------|-----|-------------|
| **Copy function works** | Core daily workflow | Open tomorrow, copy today, verify routes |
| **School closure filtering** | Avoid assigning closed schools | Add non-school day, copy, verify child skipped |
| **Carpool limits** | Max 3 children | Drag 4th child, verify rejection |
| **Driver sees today only** | Privacy/simplicity | Log in as driver, verify no date navigation |
| **Real-time sync** | Dispatch → Driver | Create route, verify driver app updates |

### Potential Enhancement Opportunities

| Enhancement | Effort | Value |
|-------------|--------|-------|
| Add "time of day" validation (optional warning) | Medium | Prevents late assignments |
| Driver availability calendar | High | Prevents assigning to unavailable drivers |
| Bulk status update for school closures | Low | Mark all children at school as "na" |
| "Tomorrow preview" for drivers | Low | Let drivers see next day (read-only) |

### Data Integrity Checks Before Go-Live

```bash
# Verify all children have school assignments
npx convex run children:getWithoutSchool

# Verify all drivers have employee IDs (for Clerk login)
npx convex run drivers:getWithoutEmployeeId

# Verify no orphaned routes (child/driver deleted)
npx convex run routes:getOrphaned

# Check for duplicate assignments (should be 0)
npx convex run routes:getDuplicates
```

---

## 8. System Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DISPATCH APP (Web/Mobile)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Calendar View  │  │  Pairing View   │  │  Smart Copy Section     │  │
│  │  (Date Select)  │  │  (Drag-Drop)    │  │  (Copy Previous Day)    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           └────────────────────┴────────────────────────┘               │
│                                │                                        │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │ Convex WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONVEX BACKEND                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  assignments.ts │  │  routes.ts      │  │  schema.ts              │  │
│  │  - getForDate   │  │  - createRoute  │  │  - routes table         │  │
│  │  - copyFrom*    │  │  - getById      │  │  - indexes              │  │
│  │  - create       │  │                 │  │  - validators           │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                 │ Convex WebSocket (real-time sync)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DRIVER APP (Mobile)                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Routes Screen (TODAY ONLY)                                     │    │
│  │  - View assigned children                                       │    │
│  │  - Mark pickup/dropoff complete                                 │    │
│  │  - Report no-shows                                              │    │
│  │  - Add driver notes                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Quick Reference: Key Functions

### Dispatch App Queries
| Function | Purpose | File |
|----------|---------|------|
| `getForDatePeriod` | Get routes for date + AM/PM | assignments.ts:57 |
| `getUnassignedChildren` | Children without routes for date | assignments.ts |
| `getAvailableDrivers` | Drivers with capacity for date | assignments.ts |
| `getLastValidScheduleDate` | Find last copyable date (14-day lookback) | assignments.ts |

### Dispatch App Mutations
| Function | Purpose | File |
|----------|---------|------|
| `create` | Create single route | assignments.ts |
| `deleteRoute` | Remove route (unpair) | assignments.ts |
| `copyFromLastValidDay` | Smart copy with school check | assignments.ts |
| `updateStatus` | Change route status | assignments.ts |

### Driver App Queries
| Function | Purpose | File |
|----------|---------|------|
| `getByClerkId` | Get driver from Clerk auth | drivers.ts |
| `getForDate` | Get all routes for date | assignments.ts |
| `useDriverRoutes` | Hook: filter to current driver | useDriverRoutes.ts |

---

*Document prepared for Training Day readiness review. System is fundamentally sound for daily dispatch operations with copy-forward workflow.*
