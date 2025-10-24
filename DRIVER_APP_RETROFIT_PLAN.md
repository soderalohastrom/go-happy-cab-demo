# Driver App Retrofit Plan

**Last Updated:** October 24, 2025  
**Goal:** Streamline Driver App to core functionality + integrate with unified Convex

## ✅ What We're Keeping

### 1. **Clerk Authentication** (CRITICAL - Already Working)
- Driver login state
- Per-driver data routing
- Session management
- This was the main POC accomplishment - preserve it!

### 2. **UI Structure & Layout**
- Nice looking interface
- Tab-based navigation
- General screen structure
- Color scheme and styling

### 3. **Core Screens**
- Routes screen (retrofit with real data)
- Profile/settings (keep basic)
- Login/auth screens (working with Clerk)

## ❌ What We're Removing/Disabling

### 1. **Badges System** (ENTIRE FEATURE)
- Misunderstood requirement
- Only needed: Simple icon for "new pickup" flash to parent
- Remove: `packages/badges/`, badge tracking, achievement system

### 2. **Performance Metrics** (From Schema)
- `performanceMetrics` object in drivers table
- `totalRoutes`, `onTimeRate`, `safetyScore`, etc.
- Keep basic driver info only

### 3. **Messaging System** (FOR NOW)
- `packages/messaging/` - comment out/disable
- Will integrate SMS via Twilio later, not in-app messaging

### 4. **Notifications Package** (COMPLEX VERSION)
- `packages/notifications/` - simplify dramatically
- Only need: Basic push for route assignments
- Remove: Achievement notifications, badge earning, complex logic

### 5. **Offline Package** (COMPLEX VERSION)
- `packages/offline/` - remove for now
- Convex handles sync, don't need complex offline queue
- Can add simple offline detection later if needed

### 6. **Web Dispatch Interface**
- `app/(web)/` - not needed, we have separate Dispatch App
- Driver App is mobile-only

### 7. **Test Infrastructure** (FOR NOW)
- Extensive TDD setup with Detox, contract tests, etc.
- Focus on working features first, add tests later
- Keep test files but don't block on them

## 🎯 Core Features to Implement

### 1. **Today's Routes View** (Priority 1)
**Replace:** Mock data in `app/(tabs)/routes/index.tsx`  
**With:** Real Convex queries

```typescript
// Query driver's assigned routes for today
const todayRoutes = useQuery(api.assignments.getDriverRoutesForDate, {
  driverId: currentDriver._id,
  date: new Date().toISOString().split('T')[0],
});
```

**Display:**
- AM Pickup routes (7:00-9:00)
- PM Dropoff routes (14:00-16:00)
- Child name, address, special needs, pickup time
- Route status (scheduled, in_progress, completed)

### 2. **Three-Button Action System** (Priority 1)
**For each route, driver can:**

**Button 1: "Picked Up" ✅**
```typescript
const markPickup = useMutation(api.assignments.updateRouteStatus);
// Updates route status to "in_progress" or "completed"
// Creates audit log entry
// Triggers dispatch event for real-time sync
```

**Button 2: "No-Go" ❌**
```typescript
const markNoGo = useMutation(api.assignments.updateRouteStatus);
// Child wasn't at pickup location
// Updates status to "no_show"
// Creates audit log + dispatch event
// Will trigger SMS to parent (future)
```

**Button 3: "Pre-Cancel" 🔔**
```typescript
const markPreCancel = useMutation(api.assignments.updateRouteStatus);
// Parent gave advance notice
// Updates status to "cancelled"
// Different from no-show (not driver's fault)
// Creates audit log + dispatch event
```

### 3. **Address Display** (Priority 2)
**Show for each route:**
- Child's pickup address
- Parent contact info (phone)
- Special instructions/notes

**From unified schema:**
```typescript
children.address: {
  street, city, state, zip
}
```

### 4. **Maps Integration** (Priority 3 - Future)
**Not immediate, but plan for:**
- "Navigate" button per route
- Opens Apple/Google Maps with address
- Estimated time to destination
- Route optimization (multiple stops)

## 🔧 Technical Implementation Steps

### Phase 1: Convex Connection (30 min)
1. ✅ Create `.env.local` in driver app
2. ✅ Set `EXPO_PUBLIC_CONVEX_URL=https://colorful-wildcat-524.convex.cloud`
3. ✅ Copy `_generated` from root `convex/` to driver app `convex/`
4. ✅ Test connection with simple query

### Phase 2: Update Driver Schema Fields (15 min)
**Keep from existing schema:**
- Basic fields: `employeeId`, `firstName`, `lastName`, `email`, `phone`
- Auth: `pin`, `biometricEnabled`, `status`
- Emergency: `emergencyContact`
- Clerk: Any Clerk-specific fields

**Remove/Comment Out:**
- `performanceMetrics` object
- `badgeCount`, `mentorshipHours`
- Complex `preferences` (keep simple version)
- `certifications` array (not needed for POC)

**Or better yet:** Don't modify driver app's schema file, just use the unified schema's `drivers` table.

### Phase 3: Routes Screen Retrofit (45 min)
1. ✅ Remove mock data from `routes/index.tsx`
2. ✅ Add Convex query for today's driver routes
3. ✅ Filter by current logged-in driver's ID (from Clerk)
4. ✅ Display routes in clean list (AM section, PM section)
5. ✅ Add three buttons per route
6. ✅ Connect buttons to Convex mutations

### Phase 4: Mutations for Status Updates (30 min)
**Create new file:** `convex/driverActions.ts`

```typescript
export const updateRouteStatus = mutation({
  args: {
    routeId: v.id("routes"),
    newStatus: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("no_show"),
      v.literal("cancelled")
    ),
    driverId: v.id("drivers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update route status
    await ctx.db.patch(args.routeId, {
      status: args.newStatus,
      updatedAt: new Date().toISOString(),
      // If completed, set actual times
      ...(args.newStatus === "completed" && {
        actualStartTime: new Date().toISOString(),
      }),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      timestamp: Date.now(),
      action: "status_updated",
      entityType: "route",
      entityId: args.routeId,
      performedBy: args.driverId,
      details: {
        oldStatus: "...", // fetch from route
        newStatus: args.newStatus,
        notes: args.notes,
      },
    });

    // Create dispatch event for real-time sync
    await ctx.db.insert("dispatchEvents", {
      type: args.newStatus === "no_show" ? "no_show" : "status_change",
      routeId: args.routeId,
      driverId: args.driverId,
      timestamp: Date.now(),
      data: { newStatus: args.newStatus },
    });

    return { success: true };
  },
});
```

### Phase 5: Real-time Sync Test (15 min)
1. Open Dispatch App on one device/tab
2. Open Driver App on another
3. Dispatch assigns route to driver
4. Driver sees new route appear (Convex subscription)
5. Driver clicks "Picked Up"
6. Dispatch sees status update in real-time
7. 🎉 Celebrate bidirectional sync!

## 📦 Files to Modify

### Driver App Files
**Must Change:**
- `app/(tabs)/routes/index.tsx` - Replace mock data, add 3-button system
- `convex/schema.ts` - Use unified schema (or point to root)
- `.env.local` - Create with unified Convex URL

**Create New:**
- `convex/driverActions.ts` - Status update mutations
- `hooks/useDriverRoutes.ts` - Convex query hooks

**Comment Out / Disable:**
- `packages/badges/` - Entire directory
- `packages/messaging/` - For now
- `packages/notifications/` - Simplify later
- `packages/offline/` - Not needed yet
- `app/(web)/` - Not used

### Root Convex Files (Shared Backend)
**Create New:**
- `convex/driverActions.ts` - Driver-specific mutations
- `convex/dispatchEvents.ts` - Event tracking for sync

**Modify:**
- `convex/assignments.ts` - Add driver queries if needed

## 🚨 Critical Decisions

### Decision 1: Schema Strategy
**Option A:** Use root's unified schema entirely
- Pros: Single source of truth, already working
- Cons: Driver app's Convex folder becomes just `_generated`

**Option B:** Keep driver app's schema, merge carefully
- Pros: Preserves driver-specific fields
- Cons: Risk of conflicts, duplicate definitions

**Recommendation:** **Option A** - Use unified schema from root

### Decision 2: _generated Directory
**Same as Dispatch App:** Must copy `_generated` from root after any schema changes
```bash
cd /path/to/driver-app/convex
rm -rf _generated
cp -r /path/to/root/convex/_generated .
```

### Decision 3: Clerk Integration
**Keep it!** Don't touch authentication code. It's working and critical.
- Driver login determines which routes they see
- User context flows through app
- Session management already solid

## 🎨 UI Mockup for Routes Screen

```
┌─────────────────────────────────────┐
│  Today's Routes - Oct 24, 2025      │
│  Logged in as: John Smith  [Logout] │
├─────────────────────────────────────┤
│                                     │
│  ☀️ AM PICKUP ROUTES (3)            │
│  ─────────────────────────          │
│  👧 Emma Anderson                   │
│  📍 123 Main St, Marin, CA          │
│  📞 (415) 555-0123                  │
│  🕐 Pickup: 7:30 AM                 │
│  [✅ Picked Up] [❌ No-Go] [🔔 Pre-Cancel] │
│  ─────────────────────────          │
│  👧 Lucas Chen                      │
│  📍 456 Oak Ave, Marin, CA          │
│  📞 (415) 555-0124                  │
│  🕐 Pickup: 7:45 AM                 │
│  [✅ Picked Up] [❌ No-Go] [🔔 Pre-Cancel] │
│  ─────────────────────────          │
│                                     │
│  🌆 PM DROPOFF ROUTES (2)           │
│  ─────────────────────────          │
│  👧 Emma Anderson                   │
│  📍 123 Main St, Marin, CA          │
│  🕐 Dropoff: 3:00 PM                │
│  [✅ Dropped Off] [❌ No-Go] [🔔 Pre-Cancel] │
│  ─────────────────────────          │
└─────────────────────────────────────┘
```

## ⏰ Time Estimates

- **Phase 1** (Convex Connection): 30 min
- **Phase 2** (Schema Update): 15 min
- **Phase 3** (Routes Screen): 45 min
- **Phase 4** (Mutations): 30 min
- **Phase 5** (Sync Test): 15 min
- **Cleanup** (Comment out packages): 15 min

**Total:** ~2.5 hours of focused work

## 📋 Success Criteria

✅ Driver can log in with Clerk  
✅ Driver sees only their assigned routes for today  
✅ Routes show correct child names, addresses, times  
✅ Three buttons work and update status  
✅ Status changes appear in Dispatch App in real-time  
✅ Audit logs created for all driver actions  
✅ No crashes, clean UI, fast performance  

## 🚀 Ready to Start?

Once you approve this plan, I'll begin executing Phase 1!

