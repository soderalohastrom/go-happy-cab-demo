# TASKS.md - School Calendar Modal Feature

## Feature: School Year Calendar Interface

**Purpose:** Visual calendar modal for managing non-school days and daily schedules per school. Allows dispatchers to fine-tune imported school data through a click-to-toggle calendar interface.

**Branch:** `feature/school-calendar-modal` (create before starting)

---

## Task List

### Phase 1: Convex Backend Mutations
- [ ] Add `addNonSchoolDay` mutation to `convex/schools.ts`
- [ ] Add `removeNonSchoolDay` mutation to `convex/schools.ts`
- [ ] Add `bulkUpdateNonSchoolDays` mutation for batch save operations
- [ ] Add `upsertSchoolSchedule` mutation (create or update schedule times)
- [ ] Test mutations via `npx convex run` commands

### Phase 2: React Hooks
- [ ] Add `useNonSchoolDays(schoolId)` hook in `dispatch-app/hooks/useConvexRoutes.ts`
- [ ] Add `useSchoolSchedule(schoolId)` hook
- [ ] Add `useSchoolDetails(schoolId)` hook (combines school + schedule + nonSchoolDays)
- [ ] Add mutation hooks for calendar save operations

### Phase 3: UI Components
- [ ] Create `SchoolCalendarModal.tsx` - main modal wrapper
- [ ] Create `MonthGrid.tsx` - renders M-F grid for a single month
- [ ] Create `DayCell.tsx` - individual clickable day cell
- [ ] Create `ScheduleEditor.tsx` - time input fields for AM/PM times
- [ ] Style components with consistent design language

### Phase 4: Integration
- [ ] Add "Calendar" button to school cards in `SchoolsContent.tsx`
- [ ] Wire up modal open/close state
- [ ] Connect calendar grid to `nonSchoolDays` data
- [ ] Connect schedule editor to `schoolSchedules` data
- [ ] Implement local state tracking for unsaved changes
- [ ] Implement Save button with bulk mutation call
- [ ] Add unsaved changes warning on close

### Phase 5: Polish & Testing
- [ ] Test on web viewport (primary use case)
- [ ] Test on mobile (iOS simulator)
- [ ] Handle edge cases: empty schedules, missing firstDay/lastDay
- [ ] Add loading states during save
- [ ] Verify Convex real-time sync after save

---

## Specification Details

### 1. Entry Point
**Location:** School card in `SchoolsContent.tsx`
**Trigger:** New "Calendar" button alongside existing "Edit" button
**Applies To:** Schools only (Districts have no calendar)

### 2. Modal Layout (Desktop-First)

```
+------------------------------------------------------------------+
|  [School Name] - School Year Calendar                        [x] |
+------------------------------------------------------------------+
|                                                                  |
|  +-- Aug 2025 --+  +-- Sep 2025 --+  +-- Oct 2025 --+           |
|  | M  T  W  T  F |  | M  T  W  T  F |  | M  T  W  T  F |          |
|  |    .  .  .  1 |  | 1  2  3  4  5 |  | .  .  1  2  3 |          |
|  | 4  5  6  7  8 |  | X  9 10 11 12 |  | 6  7  8  9 10 |          |
|  | ...          |  | ...           |  | ...           |          |
|  +---------------+  +---------------+  +---------------+          |
|                                                                  |
|  +-- Nov 2025 --+  +-- Dec 2025 --+  +-- Jan 2026 --+           |
|  | ...          |  | X  X  X  X  X |  | ...           |  (cont.) |
|  +---------------+  +---------------+  +---------------+          |
|                                                                  |
|  ... (Feb, Mar, Apr, May, Jun)                                   |
|                                                                  |
+------------------------------------------------------------------+
|  Legend:  [ ] School Day   [X] Non-School Day   [.] Weekend      |
+------------------------------------------------------------------+
|                                                                  |
|  Daily Schedule                                                  |
|  +------------------------------------------------------------+  |
|  | AM Start:     [8:45 AM ]    PM Release:   [3:15 PM ]      |  |
|  | Min Day:      [12:30 PM]    Aftercare:    [6:00 PM ]      |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
|                              [ Cancel ]    [ Save Changes ]      |
+------------------------------------------------------------------+
```

### 3. Calendar Grid Behavior

| Click Target | Action |
|--------------|--------|
| School day (white) | Toggle to non-school day (marked X, red bg) |
| Non-school day (X) | Toggle back to school day |
| Weekend (greyed) | No action (disabled) |
| Day outside school year | Disabled (before firstDay or after lastDay) |

**Visual States:**
- `#FFFFFF` (white) - Regular school day
- `#FFEBEE` (light red) with "X" - Non-school day
- `#F5F5F5` (grey) - Weekend or out-of-range
- `#E3F2FD` (light blue) - Today indicator

### 4. Data Model

**Read on modal open:**
```typescript
// From schools table
school.firstDay  // "2025-08-13"
school.lastDay   // "2026-06-05"

// From schoolSchedules table
schedule.amStartTime       // "8:45 AM"
schedule.pmReleaseTime     // "3:15 PM"
schedule.minDayDismissalTime // "12:30 PM"
schedule.pmAftercare       // "6:00 PM"

// From nonSchoolDays table
nonSchoolDays[]  // Array of { date: "YYYY-MM-DD", description?: string }
```

**Write on Save:**
```typescript
// Bulk update non-school days
bulkUpdateNonSchoolDays({
  schoolId,
  toAdd: [{ date: "2025-12-23", description: "Winter Break" }, ...],
  toRemove: ["2025-09-02", ...]  // dates that were unmarked
})

// Update schedule times
upsertSchoolSchedule({
  schoolId,
  amStartTime: "8:45 AM",
  pmReleaseTime: "3:15 PM",
  minDayDismissalTime: "12:30 PM",
  pmAftercare: "6:00 PM"
})
```

### 5. Convex Mutations to Add

```typescript
// convex/schools.ts additions

// Add a single non-school day
export const addNonSchoolDay = mutation({
  args: {
    schoolId: v.id("schools"),
    date: v.string(),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("nonSchoolDays")
      .withIndex("by_school_date", q =>
        q.eq("schoolId", args.schoolId).eq("date", args.date))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("nonSchoolDays", {
      schoolId: args.schoolId,
      date: args.date,
      description: args.description,
    });
  }
});

// Remove a single non-school day
export const removeNonSchoolDay = mutation({
  args: {
    schoolId: v.id("schools"),
    date: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nonSchoolDays")
      .withIndex("by_school_date", q =>
        q.eq("schoolId", args.schoolId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  }
});

// Bulk update for calendar save
export const bulkUpdateNonSchoolDays = mutation({
  args: {
    schoolId: v.id("schools"),
    toAdd: v.array(v.object({
      date: v.string(),
      description: v.optional(v.string())
    })),
    toRemove: v.array(v.string())
  },
  handler: async (ctx, args) => {
    let added = 0, removed = 0;

    // Remove dates
    for (const date of args.toRemove) {
      const existing = await ctx.db
        .query("nonSchoolDays")
        .withIndex("by_school_date", q =>
          q.eq("schoolId", args.schoolId).eq("date", date))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
        removed++;
      }
    }

    // Add dates
    for (const day of args.toAdd) {
      const existing = await ctx.db
        .query("nonSchoolDays")
        .withIndex("by_school_date", q =>
          q.eq("schoolId", args.schoolId).eq("date", day.date))
        .first();
      if (!existing) {
        await ctx.db.insert("nonSchoolDays", {
          schoolId: args.schoolId,
          date: day.date,
          description: day.description,
        });
        added++;
      }
    }

    return { added, removed };
  }
});

// Upsert school schedule
export const upsertSchoolSchedule = mutation({
  args: {
    schoolId: v.id("schools"),
    amStartTime: v.string(),
    pmReleaseTime: v.string(),
    minDayDismissalTime: v.optional(v.string()),
    minimumDays: v.optional(v.string()),
    earlyRelease: v.optional(v.string()),
    pmAftercare: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { schoolId, ...scheduleData } = args;

    const existing = await ctx.db
      .query("schoolSchedules")
      .withIndex("by_school", q => q.eq("schoolId", schoolId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, scheduleData);
      return existing._id;
    } else {
      return await ctx.db.insert("schoolSchedules", {
        schoolId,
        ...scheduleData,
      });
    }
  }
});
```

### 6. React Hooks to Add

```typescript
// dispatch-app/hooks/useConvexRoutes.ts additions

export function useSchoolDetails(schoolId: Id<"schools"> | null) {
  return useQuery(
    api.schools.getSchoolDetails,
    schoolId ? { schoolId } : "skip"
  );
}

export function useAddNonSchoolDay() {
  return useMutation(api.schools.addNonSchoolDay);
}

export function useRemoveNonSchoolDay() {
  return useMutation(api.schools.removeNonSchoolDay);
}

export function useBulkUpdateNonSchoolDays() {
  return useMutation(api.schools.bulkUpdateNonSchoolDays);
}

export function useUpsertSchoolSchedule() {
  return useMutation(api.schools.upsertSchoolSchedule);
}
```

### 7. Component Structure

```
dispatch-app/components/
├── SchoolsContent.tsx          # Add "Calendar" button to school cards
├── SchoolCalendarModal.tsx     # NEW - Main modal wrapper
├── calendar/                   # NEW - Calendar sub-components
│   ├── MonthGrid.tsx          # Renders M-F grid for one month
│   ├── DayCell.tsx            # Single clickable day
│   └── ScheduleEditor.tsx     # Time input fields
```

### 8. Mobile Considerations

On smaller screens (width < 768px):
- Show 2 months per row instead of 4
- Make modal full-screen with vertical scroll
- Schedule editor remains at bottom

### 9. Future Enhancements (Out of Scope)

- [ ] Description popup when marking non-school days
- [ ] Bulk select (drag to select multiple days)
- [ ] Copy non-school days from one school to another
- [ ] Export/import calendar data as CSV
- [ ] Early out days management (separate from closures)

---

## Pre-Implementation Checklist

- [ ] Other LLM agent commits current Dispatch work
- [ ] Create feature branch: `git checkout -b feature/school-calendar-modal`
- [ ] Verify `convex/schools.ts` has no uncommitted changes from other agent
- [ ] Review existing `getSchoolDetails` query (already returns nonSchoolDays!)

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/schools.ts` | Add 4 new mutations |
| `dispatch-app/hooks/useConvexRoutes.ts` | Add 5 new hooks |
| `dispatch-app/components/SchoolsContent.tsx` | Add Calendar button |
| `dispatch-app/components/SchoolCalendarModal.tsx` | NEW file |
| `dispatch-app/components/calendar/MonthGrid.tsx` | NEW file |
| `dispatch-app/components/calendar/DayCell.tsx` | NEW file |
| `dispatch-app/components/calendar/ScheduleEditor.tsx` | NEW file |

---

*Created: 2025-12-01*
*Feature Owner: Scotty*
