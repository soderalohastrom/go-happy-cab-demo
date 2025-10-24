# Driver Action Mutations - Ready for Phase 3!

**Date:** October 24, 2025  
**From:** Dispatch App Team  
**Status:** 🚀 Building Now (Est. 90 min)  
**Shared Convex:** `colorful-wildcat-524.convex.cloud`

---

## 📦 What We're Building for You

### Three Status Update Mutations

**Location:** `convex/driverActions.ts` (shared backend)

#### 1. `driverActions:updatePickupStatus`
Driver marks child as picked up successfully.

**Args:**
```typescript
{
  routeId: Id<"routes">,
  driverId: Id<"drivers">,
  timestamp: string (ISO format)
}
```

**What it does:**
- Updates route `status` to `"completed"`
- Creates audit log entry with pickup details
- Fires dispatch event for real-time sync to Dispatch App
- Returns updated route data

#### 2. `driverActions:updateNoShowStatus`
Driver reports child was not present at pickup location.

**Args:**
```typescript
{
  routeId: Id<"routes">,
  driverId: Id<"drivers">,
  reason: string (optional),
  timestamp: string (ISO format)
}
```

**What it does:**
- Updates route `status` to `"no_show"`
- Creates audit log with reason
- Fires dispatch event
- Returns updated route data

#### 3. `driverActions:updatePreCancelStatus`
Driver acknowledges parent gave advance notice of cancellation.

**Args:**
```typescript
{
  routeId: Id<"routes">,
  driverId: Id<"drivers">,
  noticeTime: string (when parent notified),
  timestamp: string (ISO format)
}
```

**What it does:**
- Updates route `status` to `"cancelled"`
- Creates audit log with notice time
- Fires dispatch event
- Returns updated route data

---

## 🔄 Dispatch Events System

### New Event Management

**Location:** `convex/dispatchEvents.ts` (shared backend)

#### Query Functions Available:

**`dispatchEvents:getRecent`**
```typescript
args: { limit?: number }  // default 100
returns: Array of recent dispatch events
```

**`dispatchEvents:getForRoute`**
```typescript
args: { routeId: Id<"routes"> }
returns: All events for specific route (event history)
```

### Event Structure
```typescript
{
  eventId: string,
  timestamp: string (ISO),
  eventType: "route_created" | "route_updated" | "status_changed",
  resourceType: "route",
  resourceId: string,
  actorId?: string,
  actorType: "driver" | "dispatcher",
  payload: {
    // Event-specific data
    routeId, childId, driverId, status, etc.
  }
}
```

---

## 🎯 How to Integrate (Phase 3)

### Step 1: Copy Updated Types
After we deploy (you'll see notification in your STATUS.md):

```bash
cd /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash
cp -r /Users/soderstrom/2025/October/go-happy-cab-demo/convex/_generated convex/
```

### Step 2: Create Driver Hooks
`hooks/useDriverActions.ts`:

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

export const usePickupStatus = () => {
  return useMutation(api.driverActions.updatePickupStatus);
};

export const useNoShowStatus = () => {
  return useMutation(api.driverActions.updateNoShowStatus);
};

export const usePreCancelStatus = () => {
  return useMutation(api.driverActions.updatePreCancelStatus);
};
```

### Step 3: Use in Your Three-Button UI
Example button implementation:

```typescript
const handlePickup = async (routeId: Id<"routes">) => {
  const updatePickup = usePickupStatus();
  
  await updatePickup({
    routeId,
    driverId: currentDriverId,
    timestamp: new Date().toISOString(),
  });
  
  // UI updates automatically via Convex reactivity!
};
```

---

## ✅ What You Get

### Automatic Benefits:
- ✅ **Real-time sync** - Dispatch App sees status changes instantly
- ✅ **Audit trail** - Every status change logged with full context
- ✅ **Event history** - Query all events for a route
- ✅ **Optimistic updates** - Returns updated route for immediate UI feedback
- ✅ **Type safety** - Full TypeScript support via `_generated`

### No Need to Handle:
- ❌ Manual audit logging (done automatically)
- ❌ Event creation (done automatically)
- ❌ Status validation (mutation handles it)
- ❌ Timestamp formatting (mutation normalizes it)

---

## 🧪 Testing the Mutations

### Manual Test via CLI:
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo

# Test pickup status
npx convex run driverActions:updatePickupStatus '{
  "routeId": "k9773hm9z4kjafmfs930sv80hs7t2gds",
  "driverId": "js7a5r5tgk5tx9p7epvmwsfk0x7t2mz9",
  "timestamp": "2025-10-24T15:30:00.000Z"
}'

# Verify in dashboard
npx convex dashboard
# Navigate to: routes table → find route → status should be "completed"
# Navigate to: dispatchEvents table → see new event
# Navigate to: auditLogs table → see audit entry
```

---

## 📊 Bidirectional Sync Flow

### Driver App → Dispatch App:
```
Driver presses "Picked Up" button
  ↓
driverActions:updatePickupStatus mutation
  ↓
Route status updated to "completed"
  ↓
Dispatch event created
  ↓
Dispatch App subscribed to route updates
  ↓
Dispatch App UI updates automatically (green checkmark appears)
```

### Dispatch App → Driver App:
```
Dispatcher creates new route
  ↓
assignments:create mutation
  ↓
Route inserted into database
  ↓
Dispatch event created
  ↓
Driver App subscribed to driver's routes
  ↓
Driver App UI shows new route (real-time)
```

---

## 📝 Current Status

**Phase 1-2:** 🏗️ Building mutations and events system (30 min)  
**Phase 3:** 🏗️ Integrating into Dispatch App UI (20 min)  
**Phase 4:** ⏳ Updating existing mutations (15 min)  
**Phase 5:** ⏳ Documentation updates (10 min)  
**Phase 6:** ⏳ Testing and verification (15 min)

**ETA:** ~90 minutes from now

---

## 🔔 Notification Plan

We'll update our STATUS.md when:
1. ✅ Mutations are deployed and tested
2. ✅ Types are ready to copy
3. ✅ Dispatch App integration complete
4. ✅ All tests passing

**You'll see in your STATUS.md:**
> 🎉 DISPATCH APP UPDATE: Driver action mutations ready!
> 
> Copy types from: `/Users/soderstrom/2025/October/go-happy-cab-demo/convex/_generated`
> 
> Functions available:
> - `driverActions:updatePickupStatus`
> - `driverActions:updateNoShowStatus`
> - `driverActions:updatePreCancelStatus`
>
> See `DRIVER_APP_MUTATIONS_READY.md` for integration guide.

---

## 🤝 Coordination

**What we need from you:**
- Let us build and test first (~90 min)
- Watch for our STATUS.md update
- Copy types when we notify you
- Integrate mutations in your Phase 3
- Test your three-button UI
- Report any issues in your STATUS.md

**What you can expect:**
- Clean, well-tested mutations
- Full TypeScript types
- Complete documentation
- Working examples in Dispatch App
- Support if you hit any issues

---

## 📍 Key Files

**Shared Backend (we manage):**
- `/Users/soderstrom/2025/October/go-happy-cab-demo/convex/driverActions.ts`
- `/Users/soderstrom/2025/October/go-happy-cab-demo/convex/dispatchEvents.ts`

**Your Integration (you manage):**
- `hooks/useDriverActions.ts` (create this)
- `app/(tabs)/routes/index.tsx` (add three buttons)
- Your STATUS.md (we'll coordinate via this)

---

**Building now! Check back in ~90 minutes.** 🚀🌺

**Mahalo for the great coordination!** 🤙

