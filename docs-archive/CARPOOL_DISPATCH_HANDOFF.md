# Carpool Dispatch App - Session Handoff Document

**Created:** October 31, 2025
**Branch:** `feature/carpool-dispatch`
**Worktree Location:** `/Users/soderstrom/2025/October/go-happy-carpool-tree/`
**Original Codebase:** `/Users/soderstrom/2025/October/go-happy-cab-demo/` (master branch - unchanged)

---

## 🎯 Mission Overview

### Objective
Build **carpool-enabled dispatch UI** in the React Vite POC App (web-based dispatcher interface) to support **1-3 children per driver** assignments.

### Key Discovery
The real-world data shows **drivers are assigned to multiple children** (carpools), not 1:1 pairings. The current POC app only supports single child-driver pairs. This worktree implements carpool support.

### Driver App Status
**The Driver App (React Native) ALREADY handles carpools perfectly!**

Evidence from Driver App screenshots:
- ✅ Expandable route cards showing multiple children
- ✅ Individual 3-button sets per child:
  - ✓ Criança no Carro (Child in Car)
  - ✗ Não Compareceu (No Show)
  - ⚠ Pré-Cancelado (Pre-Cancelled)
- ✅ Scrollable UI supporting 3 children max per driver
- ✅ "Plenty of room, and scroll if needed" - Driver App team

**Your job:** Create the route assignments (in Dispatch App) that the Driver App already consumes.

**No changes needed in Driver App** - it's production-ready for carpools!

---

## 📁 Environment Setup

### Git Worktree Structure
```
/Users/soderstrom/2025/October/
├── go-happy-cab-demo/          # Original (master branch) - UNTOUCHED
│   ├── src/                    # POC App (Vite)
│   ├── dispatch-app/           # Dispatch App (Expo)
│   └── convex/                 # Shared Convex backend
│
└── go-happy-carpool-tree/      # THIS WORKTREE (feature/carpool-dispatch)
    ├── src/                    # POC App - MODIFY HERE
    ├── dispatch-app/           # Dispatch App - MODIFY HERE
    └── convex/                 # Convex backend - MODIFY HERE
```

### Critical Convex Dev Setup
⚠️ **ALWAYS run `npx convex dev` from the MAIN repo only:**
```bash
# CORRECT - From main repo (even when working in worktree)
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev

# WRONG - Never from worktree or app subdirectories
cd /Users/soderstrom/2025/October/go-happy-carpool-tree  # ❌
npx convex dev  # ❌ Will fail or corrupt deployment
```

See [CONVEX_DEV_WORKFLOW.md](CONVEX_DEV_WORKFLOW.md) for details.

### Project Stack
- **POC App (src/):** React 18 + Vite + TailwindCSS + @dnd-kit
- **Dispatch App (dispatch-app/):** React Native + Expo Router
- **Backend:** Convex (`colorful-wildcat-524.convex.cloud`)
- **Deployment:** Netlify (POC App only)

---

## 🎨 Design Specifications

### 1. One-Directional Drag (Child → Driver Only)

**Current Behavior:**
- Both children AND drivers are draggable
- Can drag driver onto child (creates assignment)
- Can drag child onto driver (creates assignment)

**New Behavior:**
- **Only children draggable** (child → driver)
- **Drivers are drop zones only** (no drag capability)
- Remove `useDraggable` from `DraggableDriver` component
- Keep `useDroppable` for receiving children
- Update cursor: `cursor-pointer` instead of `cursor-move`

**Why:** Carpools are built by adding children to a driver, not vice versa. One direction simplifies the mental model.

### 2. Driver Card Carpool UI (Vertical Child Stacking)

**Visual Design:**
```
┌─────────────────────────────────┐
│ 🚗 João Silva                   │
│ 🚕 Available                    │
│                                 │
│ 👧 Emma Thompson                │ <- 1st child (card expands)
│ 👧 Olivia Martinez              │ <- 2nd child (expands more)
│ 👧 Sophia Chen                  │ <- 3rd child (max limit)
│                                 │
│ Riders: 3              [✓ Done] │ <- Counter + button
└─────────────────────────────────┘
```

**Implementation Details:**
- **Child List:** Vertical stack, small text (`text-sm`), indented
- **Card Height:** Grows dynamically (`min-h-[120px]` → `min-h-[240px]` with 3 kids)
- **Counter:** Bottom-left, `text-xs text-blue-700`
- **Done Button:** Bottom-right, prominent (see specs below)
- **Max Limit:** 3 children per driver (validate on drop)
- **Empty State:** Show "🚕 Available" when no children assigned

**State Management (Two-Stage):**
```javascript
// Temporary state (before "Done" clicked)
const [driverCarpools, setDriverCarpools] = useState<Map<string, string[]>>();
// Key: driverId, Value: array of childIds

// Permanent state (after "Done" clicked)
// → Creates routes in Convex via createAssignment mutation
```

### 3. Prominent "Done" Checkmark Button

**Visual Specs:**
- **Shape:** Circular (`rounded-full`)
- **Size:** 48px diameter (`w-12 h-12`)
- **Icon:** White checkmark ✓ (`text-white text-2xl`)
- **Color:** Green (`bg-green-500 hover:bg-green-600`)
- **Shadow:** Large shadow (`shadow-lg`)
- **Position:** Bottom-right of driver card
- **Disabled State:** Gray (`bg-gray-300`) when no children assigned

**Behavior:**
```javascript
const handleDoneClick = async (driverId) => {
  const childIds = driverCarpools.get(driverId);

  // Create route for each child in carpool
  for (const childId of childIds) {
    await createAssignment({
      date: selectedDate,
      period: activeTab,
      childId,
      driverId,
      status: 'scheduled',
    });
  }

  // Show success toast
  showToast(`✅ Carpool created: ${driver.name} → ${childIds.length} riders`);

  // Clear temporary state
  setDriverCarpools(prev => {
    const next = new Map(prev);
    next.delete(driverId);
    return next;
  });
};
```

### 4. Paired Assignments Display (Carpool Groups)

**Expandable Card Design:**
```
┌─────────────────────────────────────────┐
│ AM Routes - Oct 31, 2025                │
├─────────────────────────────────────────┤
│ 🚗 João Silva (3 riders)      [X] [˅]   │ <- Click to expand
│   ├─ 👧 Emma Thompson          [x]      │
│   ├─ 👧 Olivia Martinez         [x]      │
│   └─ 👧 Sophia Chen             [x]      │
└─────────────────────────────────────────┘
```

**Features:**
- **Driver Header:** Bold, shows total rider count
- **Expand/Collapse:** Click driver name or chevron icon
- **Child List:** Indented, with individual remove buttons
- **Group Remove:** [X] button removes entire carpool
- **Visual Grouping:** Subtle border/background to group children

---

## 🗄️ Schema & Import Script Changes

### 1. Add `assignedBadgeId` to Children Schema

**File:** `convex/schema.ts` (around line 166)

```typescript
children: defineTable({
  // ... existing fields ...

  // NEW: For badge-based carpool auto-pairing
  assignedBadgeId: v.optional(v.string()),

  // ... rest of schema ...
})
```

### 2. Update Import Script to Capture Badge

**File:** `convex/importRealData.ts`

**In `importChildren` function (line ~171):**
```typescript
const childData = {
  // ... existing fields ...

  // NEW: Capture assigned_badge_id from CSV
  assignedBadgeId: safeString(row.assigned_badge_id),

  // ... rest of fields ...
};
```

**Update `createInitialRoutes` for badge-based carpools (line ~361):**
```typescript
// Group children by assignedBadgeId
const carpoolGroups = new Map<string, typeof allChildren>();

allChildren.forEach(child => {
  if (child.assignedBadgeId) {
    if (!carpoolGroups.has(child.assignedBadgeId)) {
      carpoolGroups.set(child.assignedBadgeId, []);
    }
    carpoolGroups.get(child.assignedBadgeId)!.push(child);
  }
});

// Create routes for each carpool
for (const [badgeId, children] of carpoolGroups.entries()) {
  const driver = drivers.find(d => d.employeeId === badgeId);

  if (!driver) continue;

  // Validate max 3 children
  if (children.length > 3) {
    errors.push(`Badge ${badgeId} has ${children.length} children (max 3)`);
    continue;
  }

  // Create route for each child in carpool
  for (const child of children) {
    // Create AM + PM routes...
  }
}
```

---

## 🛠️ Implementation Phases

### Phase 1: Git Worktree Setup ✅ COMPLETE
- [x] Created worktree at `/Users/soderstrom/2025/October/go-happy-carpool-tree/`
- [x] Branch: `feature/carpool-dispatch`
- [x] Verified independence from master

### Phase 2: Schema & Import Script
**Files:** `convex/schema.ts`, `convex/importRealData.ts`

**Tasks:**
1. Add `assignedBadgeId` field to children table
2. Update `importChildren` to capture badge from CSV
3. Update `createInitialRoutes` to create carpool routes by badge
4. Test import with real data

### Phase 3: POC App UI Changes
**File:** `src/App.jsx`

**Tasks:**
1. Remove driver drag capability (keep drop only)
2. Add carpool state management (Map of driverId → childIds)
3. Update driver card UI (vertical child stack, counter, Done button)
4. Update paired assignments display (expandable carpool groups)

### Phase 4: Testing & Validation
- Test with 1, 2, 3 children per driver
- Verify max 3 validation
- Test import with badge associations
- Deploy to Netlify for client review

---

## ⚠️ Critical Gotchas

### 1. Convex Dev Must Run from Main Repo
```bash
# ALWAYS from main repo
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev
```

### 2. Two-Stage State Management
- **Temporary:** React state (`driverCarpools`) before "Done"
- **Permanent:** Convex routes after "Done" clicked

### 3. Max 3 Children Validation
Enforce in TWO places:
- UI drag handler (prevent drop)
- Import script (validate badges)

### 4. Driver App Needs Zero Changes
It already handles carpools perfectly!

---

## ✅ Success Criteria

- [ ] Schema updated with `assignedBadgeId`
- [ ] Import script creates badge-based carpools
- [ ] Driver drag removed (one-directional only)
- [ ] Children stack vertically on driver cards
- [ ] Rider counter shows correct count
- [ ] Prominent "Done" button creates routes
- [ ] Paired assignments show carpool groups
- [ ] Max 3 children validation works
- [ ] Client approves workflow

---

## 💡 Pro Tips

1. **Use TodoWrite** to track progress
2. **Commit frequently** with descriptive messages
3. **Test with real CSV data** from Google Sheets
4. **Check Convex dashboard** to verify routes
5. **Deploy to Netlify** for client preview

---

## 🚀 Ready to Build!

This worktree is your safe experimentation space. Main codebase stays untouched on master.

**When ready to merge:**
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo
git checkout master
git merge feature/carpool-dispatch
```

Good luck! 🚗👧👧👧 Mahalo! 🌺