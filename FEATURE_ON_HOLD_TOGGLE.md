# Feature: On Hold / Hide Toggle

## Overview

Add an "On Hold / Hide" toggle to Children and Drivers entity cards that allows dispatchers to temporarily remove entities from the active scheduling pool without deleting them.

**Problem:** Imported data includes children and drivers who aren't currently needing service (on leave, vacation, inactive, etc.). These entities clutter the dispatch view and make it appear the dispatcher isn't completing their work ("What about these kids!").

**Solution:** A toggle that "greys out" entities in the management screens while completely removing them from the dispatch assignment pool. Entities remain searchable and easily reactivated.

---

## User Stories

### As a Dispatcher:
- I want to hide children who aren't currently receiving rides so my dispatch view only shows active children
- I want to hide drivers who are on leave so I don't accidentally try to assign them routes
- I want to easily find and reactivate hidden entities when they return to service
- I want hidden entities to remain visible (greyed out) in the Children/Drivers tabs so I don't lose track of them

### As an Administrator:
- I want to see at a glance which entities are on hold vs active
- I want the system to maintain data integrity (no deletion, just status change)

---

## Functional Requirements

### 1. UI: Toggle Switch on Entity Cards

**Location:** Children tab cards, Drivers tab cards (middle-right, before existing icons)

**Label:** "On Hold" with toggle switch

**Visual States:**
| State | Toggle | Card Appearance |
|-------|--------|-----------------|
| Active | OFF (left) | Normal appearance |
| On Hold | ON (right) | Greyed out (opacity ~0.5), still readable |

### 2. Schema Changes

Add to `children` table:
```typescript
onHold: v.optional(v.boolean()),  // default: false/undefined = active
onHoldSince: v.optional(v.string()),  // ISO date when put on hold
onHoldReason: v.optional(v.string()),  // Optional reason (future enhancement)
```

Add to `drivers` table:
```typescript
onHold: v.optional(v.boolean()),
onHoldSince: v.optional(v.string()),
onHoldReason: v.optional(v.string()),
```

### 3. Dispatch Pool Filtering

**AssignmentScreen behavior:**
- `getUnassignedChildren` query: Filter OUT children where `onHold === true`
- `getAvailableDrivers` query: Filter OUT drivers where `onHold === true`
- Children/Drivers on hold do NOT appear in the draggable/droppable pools

**Copy Previous Day behavior:**
- Children on hold are SKIPPED during copy (like school closures)
- If a child was assigned yesterday but put on hold today, they won't copy forward

### 4. Historical Data Preservation

- Past assignments remain unchanged (snapshots in time)
- Putting a child on hold does NOT affect yesterday's routes
- Only affects today and future scheduling

### 5. Card UI Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│  [Avatar]  Maria Santos                                         │
│            Lincoln Elementary • Grade 3                         │
│                                                                 │
│            On Hold [====○    ]     [📍] [📞] [✏️] [🗑️]         │
│                    ↑ toggle                                     │
└─────────────────────────────────────────────────────────────────┘

When ON HOLD:
┌─────────────────────────────────────────────────────────────────┐
│  [Avatar]  Maria Santos                        (opacity: 0.5)   │
│            Lincoln Elementary • Grade 3                         │
│                                                                 │
│            On Hold [    ●====]     [📍] [📞] [✏️] [🗑️]         │
│                    ↑ toggle (still interactive!)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Out of Scope (Future Enhancements)

- **Archive feature** - Full removal from lists (soft delete)
- **On Hold reason field** - Why entity is on hold
- **Bulk on-hold operations** - Select multiple and toggle
- **On Hold report** - List all entities currently on hold
- **Schools/Districts on hold** - Hold at these levels (consider later)

---

## Technical Implementation Plan

### Phase 1: Schema & Backend
1. Add `onHold`, `onHoldSince` fields to children schema
2. Add `onHold`, `onHoldSince` fields to drivers schema
3. Create `toggleOnHold` mutations for both entities
4. Update `getUnassignedChildren` to filter out on-hold
5. Update `getAvailableDrivers` to filter out on-hold
6. Update `copyFromLastValidDay` to skip on-hold children

### Phase 2: Children Card UI
1. Add toggle switch component to ChildCard
2. Implement greyed-out visual state (opacity styling)
3. Wire toggle to mutation
4. Test in Children tab

### Phase 3: Drivers Card UI
1. Add toggle switch component to DriverCard
2. Implement greyed-out visual state
3. Wire toggle to mutation
4. Test in Drivers tab

### Phase 4: Dispatch Integration Testing
1. Verify on-hold children don't appear in assignment pool
2. Verify on-hold drivers don't appear as drop targets
3. Verify copy-forward skips on-hold entities
4. Verify past assignments unaffected

---

## Acceptance Criteria

### Children On Hold
- [ ] Toggle switch visible on each child card
- [ ] Toggling ON greys out the card (opacity ~0.5)
- [ ] Toggling OFF restores normal appearance
- [ ] On-hold children do NOT appear in dispatch assignment pool
- [ ] On-hold children are SKIPPED during copy-previous-day
- [ ] On-hold children remain searchable in Children tab
- [ ] Past assignments for on-hold children remain unchanged

### Drivers On Hold
- [ ] Toggle switch visible on each driver card
- [ ] Toggling ON greys out the card (opacity ~0.5)
- [ ] Toggling OFF restores normal appearance
- [ ] On-hold drivers do NOT appear as drop targets in dispatch
- [ ] On-hold drivers remain searchable in Drivers tab
- [ ] Past assignments with on-hold drivers remain unchanged

---

*Feature designed for Go Happy Cab Dispatch App - December 2025*
