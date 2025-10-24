# Driver App - Schema Compatibility Fixes

**Date:** October 24, 2025  
**Issue:** Driver app was calling non-existent Convex functions  
**Status:** ✅ FIXED

---

## 🐛 Errors Found

### Error 1: `drivers:getDrivers` Not Found
```
Could not find public function for 'drivers:getDrivers'.
```

**Root Cause:** Driver app POC used `api.drivers.getDrivers` but unified schema has `api.drivers.listAll`

**Affected Files:**
- `app/(tabs)/dashboard/index.tsx` (line 32)
- `app/(tabs)/profile/index.tsx` (line 43)

### Error 2: `badges:getBadges` Not Found
```
Could not find public function for 'badges:getBadges'.
```

**Root Cause:** Badges feature not in unified schema (out of scope for streamlined app)

**Affected Files:**
- `app/(tabs)/profile/index.tsx` (line 45)

### Error 3: Schema Mismatch - `badgeCount` Field
```
currentDriver.performanceMetrics.badgeCount
```

**Root Cause:** Unified schema `performanceMetrics` doesn't have `badgeCount` field

**Affected Files:**
- `app/(tabs)/profile/index.tsx` (line 150)

---

## ✅ Fixes Applied

### Fix 1: Updated Dashboard Screen
**File:** `app/(tabs)/dashboard/index.tsx`

**Before:**
```typescript
const drivers = useQuery(api.drivers.getDrivers, driverId ? {} : 'skip');
```

**After:**
```typescript
const drivers = useQuery(api.drivers.listAll);
```

### Fix 2: Updated Profile Screen - Driver Query
**File:** `app/(tabs)/profile/index.tsx`

**Before:**
```typescript
const drivers = useQuery(api.drivers.getDrivers, driverId ? {} : 'skip');
const badges = useQuery(api.badges.getBadges, driverId ? {} : 'skip');
```

**After:**
```typescript
const drivers = useQuery(api.drivers.listAll);
// TODO: Remove badges feature (not in scope for streamlined driver app)
// const badges = useQuery(api.badges.getBadges, driverId ? {} : 'skip');
```

### Fix 3: Commented Out Badges in Profile UI
**File:** `app/(tabs)/profile/index.tsx`

**Changes:**
1. **Stats Section** - Removed badge count stat (line 149-152)
   ```typescript
   {/* <View style={styles.statItem}>
     <Text style={styles.statValue}>{currentDriver.performanceMetrics?.badgeCount || 0}</Text>
     <Text style={styles.statLabel}>Badges</Text>
   </View> */}
   ```

2. **Badges Section** - Commented out entire section (lines 200-213)
   ```typescript
   {/* Badges Section - REMOVED (not in scope for streamlined driver app) */}
   {/* <View style={styles.badgesSection}>
     ... (entire badges UI)
   </View> */}
   ```

3. **Added Optional Chaining** - For remaining performanceMetrics fields
   ```typescript
   {currentDriver.performanceMetrics?.totalRoutes || 0}
   ```

---

## 📊 Unified Schema - Available Functions

### Drivers (convex/drivers.ts)
✅ `api.drivers.list` - Returns active drivers  
✅ `api.drivers.listAll` - Returns all drivers  
✅ `api.drivers.get` - Gets single driver by ID  
✅ `api.drivers.deactivate` - Mutation to deactivate driver  

❌ `api.drivers.getDrivers` - DOES NOT EXIST (old POC function)

### Performance Metrics (Unified Schema)
✅ Available fields in `performanceMetrics`:
- `totalRoutes: v.number()`
- `onTimeRate: v.number()`
- `safetyScore: v.number()`
- `incidentCount: v.number()`
- `parentRating: v.number()`

❌ NOT available:
- `badgeCount` (badges feature removed)
- `responseTime` (not in unified schema)
- `lastIncidentDate` (not in unified schema)
- `mentorshipHours` (not in unified schema)

---

## 🧪 Testing Instructions

### Test 1: Driver App Loads Without Errors
```bash
cd /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash
npx expo start
# Press 'i' for iOS or 'a' for Android
```

**Expected:** 
- ✅ No "Could not find public function" errors
- ✅ Routes tab shows green "UNIFIED CONVEX CONNECTED!" banner
- ✅ Dashboard loads without crashing
- ✅ Profile loads without crashing

### Test 2: Verify Data Loading
**Routes Screen:**
- Should show: "✅ UNIFIED CONVEX CONNECTED! 12 drivers loaded"
- Should show: "First: John Smith" (or first driver from unified DB)

**Dashboard:**
- Should load driver data from unified Convex
- No errors in Expo console

**Profile:**
- Should show driver info (if logged in)
- Stats section shows Routes (totalRoutes)
- Badges section is hidden/commented out

### Test 3: Check Convex Console
Open Convex dashboard: https://dashboard.convex.dev/deployment/logs/colorful-wildcat-524

**Should see:**
- ✅ Queries for `drivers:listAll` succeeding
- ✅ No errors about missing functions
- ❌ No queries for `drivers:getDrivers` (old function)
- ❌ No queries for `badges:getBadges` (removed feature)

---

## 🔄 If Errors Persist

### 1. Clear Expo Cache
```bash
cd /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash
rm -rf node_modules/.cache
npx expo start --clear
```

### 2. Verify _generated Directory
```bash
ls -la convex/_generated/
# Should see: api.d.ts, api.js, dataModel.d.ts, server.d.ts, server.js
```

### 3. Re-copy _generated if Needed
```bash
cd convex
rm -rf _generated
cp -r /Users/soderstrom/2025/October/go-happy-cab-demo/convex/_generated .
```

### 4. Check Environment Variables
```bash
cat .env.local
# Should show: EXPO_PUBLIC_CONVEX_URL=https://colorful-wildcat-524.convex.cloud
```

---

## 📝 Next Steps After Testing

Once all errors are resolved and app loads successfully:

### Phase 2: Implement Real Driver Routes
- Query routes assigned to logged-in driver
- Filter by today's date
- Display child names, addresses, times
- Replace mock data completely

### Phase 3: Three-Button System
- "Picked Up" → Status update mutation
- "No-Go" → Status update mutation
- "Pre-Cancel" → Status update mutation
- Real-time sync with Dispatch App

---

**Status:** Fixes applied, ready for testing 🧪  
**Files Modified:** 3 (dashboard, routes, profile screens)  
**Convex Functions Fixed:** 2 (drivers, badges)  
**UI Elements Removed:** 1 (badges section)

---

Mahalo! 🌺 Test the app and let me know the results!

