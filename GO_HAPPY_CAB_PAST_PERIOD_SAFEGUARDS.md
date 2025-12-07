# Go Happy Cab: Past-Period Editing Safeguards
## Implementation Guide for Dispatch App

**Created:** December 5, 2025  
**Purpose:** Prevent dispatcher confusion and driver conflicts by restricting edits to past time periods  
**Priority:** Pre-launch enhancement (recommended)

---

## Problem Statement

Currently, the Dispatch App allows unrestricted editing of routes regardless of:
- Whether the date has passed
- Whether the AM/PM period has elapsed
- Whether a driver has already marked the route complete

### Real-World Scenarios This Causes

| Scenario | Current Behavior | Problem |
|----------|------------------|---------|
| Dispatcher reassigns 9AM pickup at 10AM | Allowed | New driver sees "pending" route for past time |
| Dispatcher edits yesterday's routes | Allowed | Could corrupt historical/billing data |
| Driver marks "Completed", dispatcher swaps driver | Allowed | Audit trail shows completion by wrong driver |
| Dispatcher deletes route after driver reported no-show | Allowed | No-show record lost for compliance |

---

## Proposed Safeguard Levels

### Level 1: Visual Warnings (Soft Block)
- Show warning banner when viewing past dates/periods
- Highlight past-period routes with different styling
- Require confirmation dialog for edits
- **Allows override** for legitimate corrections

### Level 2: UI Disabled State (Medium Block)
- Disable drag-drop for past periods
- Hide "X" unpair button on completed routes
- Disable "Copy Routes" for past dates
- **No override** in UI, requires backend access

### Level 3: Backend Validation (Hard Block)
- Mutations reject past-period changes
- Exception: Admin override with audit trail
- **Recommended** for completed routes

---

## Implementation Plan

### Phase 1: Time Boundary Helpers

**File:** `dispatch-app/utils/timeHelpers.ts` (new file)

```typescript
// ============================================================
// TIME BOUNDARY HELPERS
// Determines what can be edited based on current time
// ============================================================

/**
 * Get current date in ISO format (YYYY-MM-DD) using local timezone
 */
export const getTodayISO = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Get current period based on time of day
 * AM: Before 12:00 PM (noon)
 * PM: 12:00 PM and after
 * 
 * Note: This uses a simple noon cutoff. Adjust if your
 * dispatch operations have different AM/PM boundaries.
 */
export const getCurrentPeriod = (): 'AM' | 'PM' => {
  const now = new Date();
  return now.getHours() < 12 ? 'AM' : 'PM';
};

/**
 * Determine if a date/period combination is in the past
 * and therefore should be protected from editing
 */
export const isPastPeriod = (date: string, period: 'AM' | 'PM'): boolean => {
  const today = getTodayISO();
  
  // Past date = always past
  if (date < today) {
    return true;
  }
  
  // Future date = never past
  if (date > today) {
    return false;
  }
  
  // Same date: check period
  const currentPeriod = getCurrentPeriod();
  
  // If currently PM, then AM period has passed
  if (currentPeriod === 'PM' && period === 'AM') {
    return true;
  }
  
  return false;
};

/**
 * Get human-readable label for time status
 */
export const getPeriodStatusLabel = (date: string, period: 'AM' | 'PM'): string => {
  const today = getTodayISO();
  
  if (date < today) {
    return 'Past Date';
  }
  
  if (date > today) {
    return 'Future';
  }
  
  const currentPeriod = getCurrentPeriod();
  
  if (currentPeriod === 'PM' && period === 'AM') {
    return 'AM Complete';
  }
  
  if (period === currentPeriod) {
    return 'Active Now';
  }
  
  return 'Upcoming';
};

/**
 * Check if route can be modified based on status
 * Completed/no_show/cancelled routes should be protected
 */
export const isRouteEditable = (
  status: string,
  date: string,
  period: 'AM' | 'PM'
): { editable: boolean; reason?: string } => {
  
  // Terminal statuses = not editable
  const terminalStatuses = ['completed', 'no_show', 'cancelled', 'late_cancel'];
  if (terminalStatuses.includes(status)) {
    return { 
      editable: false, 
      reason: `Route already marked as ${status.replace('_', ' ')}` 
    };
  }
  
  // Past period = not editable (unless admin override)
  if (isPastPeriod(date, period)) {
    return { 
      editable: false, 
      reason: 'This time period has passed' 
    };
  }
  
  return { editable: true };
};

/**
 * Get editing permissions for current view
 * Returns flags for UI to use
 */
export const getEditPermissions = (date: string, period: 'AM' | 'PM') => {
  const past = isPastPeriod(date, period);
  const today = getTodayISO();
  
  return {
    canDragDrop: !past,
    canUnpair: !past,
    canCopyRoutes: date >= today,
    canDeleteRoutes: !past,
    showPastWarning: past,
    statusLabel: getPeriodStatusLabel(date, period),
  };
};
```

---

### Phase 2: Assignment Screen UI Updates

**File:** `dispatch-app/components/AssignmentScreen.tsx`

```tsx
// Add imports
import { 
  isPastPeriod, 
  getEditPermissions, 
  isRouteEditable 
} from '../utils/timeHelpers';

// Inside AssignmentScreen component:

export default function AssignmentScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>('AM');
  
  // NEW: Get editing permissions for current view
  const permissions = useMemo(
    () => getEditPermissions(selectedDate, activePeriod),
    [selectedDate, activePeriod]
  );

  // ... existing state and hooks ...

  return (
    <View style={styles.container}>
      {/* NEW: Past Period Warning Banner */}
      {permissions.showPastWarning && (
        <View style={styles.warningBanner}>
          <Ionicons name="time-outline" size={20} color="#856404" />
          <Text style={styles.warningText}>
            Viewing {permissions.statusLabel} — Editing disabled
          </Text>
        </View>
      )}

      {/* Date Navigator */}
      <DateNavigator 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate}
      />

      {/* Period Tabs with Status Indicator */}
      <View style={styles.periodTabs}>
        <PeriodTab 
          period="AM" 
          active={activePeriod === 'AM'}
          onPress={() => setActivePeriod('AM')}
          isPast={isPastPeriod(selectedDate, 'AM')}
        />
        <PeriodTab 
          period="PM" 
          active={activePeriod === 'PM'}
          onPress={() => setActivePeriod('PM')}
          isPast={isPastPeriod(selectedDate, 'PM')}
        />
      </View>

      {/* Children Column - Disable drag if past */}
      <ChildrenColumn 
        children={unassignedChildren}
        draggable={permissions.canDragDrop}
        onDragStart={permissions.canDragDrop ? handleDragStart : undefined}
      />

      {/* Drivers Column - Disable drop zones if past */}
      <DriversColumn 
        drivers={drivers}
        assignments={assignments}
        droppable={permissions.canDragDrop}
        showUnpairButton={permissions.canUnpair}
        onUnpair={permissions.canUnpair ? handleUnpair : undefined}
      />

      {/* Copy Routes Button - Disable for past dates */}
      <Button
        title="Copy Previous Day"
        onPress={handleCopyRoutes}
        disabled={!permissions.canCopyRoutes}
        style={!permissions.canCopyRoutes ? styles.disabledButton : undefined}
      />
    </View>
  );
}

// NEW: Period Tab with visual past indicator
const PeriodTab = ({ 
  period, 
  active, 
  onPress, 
  isPast 
}: {
  period: 'AM' | 'PM';
  active: boolean;
  onPress: () => void;
  isPast: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.periodTab,
      active && styles.periodTabActive,
      isPast && styles.periodTabPast,
    ]}
  >
    <Text style={[
      styles.periodTabText,
      active && styles.periodTabTextActive,
      isPast && styles.periodTabTextPast,
    ]}>
      {period}
      {isPast && ' ✓'}
    </Text>
  </Pressable>
);

// Add to StyleSheet
const additionalStyles = StyleSheet.create({
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  periodTabPast: {
    backgroundColor: '#e9ecef',
    borderColor: '#adb5bd',
  },
  periodTabTextPast: {
    color: '#6c757d',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
```

---

### Phase 3: Draggable Card Modifications

**File:** `dispatch-app/components/DraggableCard.tsx`

```tsx
// Add prop for disabled state
interface DraggableCardProps {
  child: Child;
  onDragStart?: (childId: string) => void;
  onDragEnd?: () => void;
  disabled?: boolean;  // NEW
}

export default function DraggableCard({ 
  child, 
  onDragStart, 
  onDragEnd,
  disabled = false,  // NEW
}: DraggableCardProps) {
  
  // Disable gesture if card is disabled
  const panGesture = Gesture.Pan()
    .enabled(!disabled)  // NEW: Disable gesture when past period
    .onStart(() => {
      if (disabled) return;
      onDragStart?.(child._id);
    })
    // ... rest of gesture handlers
  
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[
        styles.card,
        disabled && styles.cardDisabled,  // NEW: Visual disabled state
        animatedStyle,
      ]}>
        <View style={styles.cardContent}>
          <Text style={[
            styles.childName,
            disabled && styles.textDisabled,
          ]}>
            {child.firstName} {child.lastName}
          </Text>
          {/* ... rest of card content ... */}
        </View>
        
        {/* NEW: Lock icon when disabled */}
        {disabled && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#6c757d" />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// Add styles
const disabledStyles = StyleSheet.create({
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  textDisabled: {
    color: '#6c757d',
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
```

---

### Phase 4: Backend Validation (Hard Block)

**File:** `convex/assignments.ts`

Add to the `create` mutation:

```typescript
export const create = mutation({
  args: {
    date: v.string(),
    period: v.union(v.literal("AM"), v.literal("PM")),
    childId: v.id("children"),
    driverId: v.id("drivers"),
    status: v.string(),
    user: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    reminderMinutes: v.optional(v.number()),
    // NEW: Allow admin override
    adminOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // ========================================
    // NEW: PAST PERIOD VALIDATION
    // ========================================
    if (!args.adminOverride) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const currentPeriod = currentHour < 12 ? 'AM' : 'PM';
      
      // Block past dates
      if (args.date < today) {
        throw new Error(
          `Cannot create routes for past date (${args.date}). ` +
          `Use adminOverride for corrections.`
        );
      }
      
      // Block past periods on today
      if (args.date === today && 
          currentPeriod === 'PM' && 
          args.period === 'AM') {
        throw new Error(
          `Cannot create AM routes after noon. ` +
          `Use adminOverride for corrections.`
        );
      }
    }
    
    // Log admin override usage for audit
    if (args.adminOverride) {
      console.warn(
        `ADMIN OVERRIDE: Route created for past period ` +
        `${args.date} ${args.period} by ${args.user || 'unknown'}`
      );
    }

    // ... rest of existing create logic ...
  },
});
```

Add similar validation to `remove` mutation:

```typescript
export const remove = mutation({
  args: {
    id: v.id("routes"),
    user: v.optional(v.string()),
    adminOverride: v.optional(v.boolean()),  // NEW
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.id);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // ========================================
    // NEW: PROTECT COMPLETED ROUTES
    // ========================================
    const terminalStatuses = ['completed', 'no_show', 'cancelled', 'late_cancel'];
    
    if (!args.adminOverride && terminalStatuses.includes(assignment.status)) {
      throw new Error(
        `Cannot delete route with status "${assignment.status}". ` +
        `Route was already processed by driver. Use adminOverride for corrections.`
      );
    }

    // ========================================
    // NEW: PAST PERIOD VALIDATION
    // ========================================
    if (!args.adminOverride) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const currentPeriod = currentHour < 12 ? 'AM' : 'PM';
      
      if (assignment.date < today) {
        throw new Error(
          `Cannot delete routes for past date (${assignment.date}). ` +
          `Use adminOverride for corrections.`
        );
      }
      
      if (assignment.date === today && 
          currentPeriod === 'PM' && 
          assignment.period === 'AM') {
        throw new Error(
          `Cannot delete AM routes after noon. ` +
          `Use adminOverride for corrections.`
        );
      }
    }

    // Log admin override for audit
    if (args.adminOverride) {
      await ctx.db.insert("auditLogs", createAuditLog(
        "admin_override_delete",
        "route",
        args.id,
        {
          description: "Admin override: deleted protected route",
          date: assignment.date,
          period: assignment.period,
          originalStatus: assignment.status,
          overrideBy: args.user,
        },
        args.user
      ));
    }

    // ... rest of existing delete logic ...
  },
});
```

---

### Phase 5: Confirmation Dialog for Edge Cases

**File:** `dispatch-app/components/PastPeriodWarningModal.tsx` (new file)

```tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PastPeriodWarningModalProps {
  visible: boolean;
  periodLabel: string;  // e.g., "AM on Dec 5"
  actionType: 'assign' | 'unassign' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PastPeriodWarningModal({
  visible,
  periodLabel,
  actionType,
  onConfirm,
  onCancel,
}: PastPeriodWarningModalProps) {
  const actionLabels = {
    assign: 'assign a child',
    unassign: 'unassign a child', 
    delete: 'delete this route',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color="#ffc107" />
          </View>
          
          <Text style={styles.title}>Past Period Warning</Text>
          
          <Text style={styles.message}>
            You're trying to {actionLabels[actionType]} for{' '}
            <Text style={styles.bold}>{periodLabel}</Text>, which has already passed.
          </Text>
          
          <Text style={styles.subMessage}>
            This may affect driver records and billing accuracy.
            Are you sure you want to continue?
          </Text>

          <View style={styles.buttons}>
            <Pressable 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.confirmButton]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>
                Yes, Override
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  subMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

---

## Configuration Options

Add to app config or environment for flexibility:

```typescript
// config/dispatchSettings.ts

export const DISPATCH_SETTINGS = {
  // Time boundaries
  AM_PM_CUTOFF_HOUR: 12,  // 12:00 PM = noon
  
  // Safeguard levels
  PAST_DATE_EDITING: 'blocked',      // 'blocked' | 'warned' | 'allowed'
  PAST_PERIOD_EDITING: 'blocked',    // 'blocked' | 'warned' | 'allowed'
  COMPLETED_ROUTE_EDITING: 'blocked', // 'blocked' | 'warned' | 'allowed'
  
  // Grace periods (in minutes)
  AM_GRACE_PERIOD: 30,   // Allow AM edits until 12:30 PM
  PM_GRACE_PERIOD: 60,   // Allow PM edits until 1 hour after last pickup
  
  // Admin override
  REQUIRE_REASON_FOR_OVERRIDE: true,
  LOG_ALL_OVERRIDES: true,
};
```

---

## Testing Checklist

### Manual Testing Scenarios

| # | Scenario | Expected Behavior | Status |
|---|----------|-------------------|--------|
| 1 | View yesterday's routes | Warning banner shown, drag disabled | ☐ |
| 2 | View today's AM routes when it's PM | Warning banner, AM tab shows checkmark | ☐ |
| 3 | Try to drag child to driver (past period) | Card shows lock icon, drag doesn't start | ☐ |
| 4 | Try to unpair route (past period) | X button hidden or disabled | ☐ |
| 5 | Try "Copy Routes" for past date | Button disabled | ☐ |
| 6 | View today's PM routes when it's PM | No warning, full editing enabled | ☐ |
| 7 | View tomorrow's routes | No warning, full editing enabled | ☐ |
| 8 | Backend: Create route for past date | Mutation throws error | ☐ |
| 9 | Backend: Create with adminOverride | Mutation succeeds, audit logged | ☐ |
| 10 | Backend: Delete completed route | Mutation throws error | ☐ |

### Edge Case Testing

| # | Edge Case | Expected | Status |
|---|-----------|----------|--------|
| 1 | App open at 11:59 AM, clock turns 12:00 | AM tab should update to "past" on next action | ☐ |
| 2 | Timezone: Server in UTC, client in PST | Use client timezone for UI, server for mutations | ☐ |
| 3 | Multiple dispatchers editing same period | Real-time sync should show all changes | ☐ |
| 4 | Admin override with no reason provided | Block if REQUIRE_REASON_FOR_OVERRIDE is true | ☐ |

---

## Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Deploy UI warnings only (no blocking)
- Monitor how often dispatchers edit past periods
- Collect feedback on warning clarity

### Phase 2: UI Blocking (Week 2)
- Enable drag-drop disabling for past periods
- Keep backend permissive (allows override)
- Train dispatchers on admin override process

### Phase 3: Full Enforcement (Week 3+)
- Enable backend validation
- Require admin credentials for override
- Full audit logging

---

## Summary

This implementation provides:

1. **Visual Clarity** — Dispatchers immediately know when viewing past/editable periods
2. **Graceful Degradation** — UI disables before backend blocks
3. **Audit Trail** — All overrides logged for compliance
4. **Flexibility** — Admin override available for legitimate corrections
5. **Configuration** — Adjustable thresholds and enforcement levels

**Estimated Implementation Time:** 4-6 hours for full implementation

---

*Document prepared for Go Happy Cab Dispatch App enhancement.*
