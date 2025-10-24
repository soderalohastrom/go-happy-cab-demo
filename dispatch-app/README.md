# Go Happy Cab - Dispatch App

Mobile-first React Native dispatch application for child transportation route management.

## Quick Start

```bash
# Terminal 1: Start Convex backend (from project root)
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev

# Terminal 2: Start Expo dev server
cd /Users/soderstrom/2025/October/go-happy-cab-demo/dispatch-app
npx expo start

# Then press:
# 'i' for iOS Simulator
# 'a' for Android Emulator
# or scan QR code with Expo Go app
```

## Project Structure

```
dispatch-app/
├── app/
│   ├── (tabs)/
│   │   └── index.tsx          # Main dispatch screen
│   └── _layout.tsx            # Root layout with ConvexProvider
├── components/
│   ├── MonthCalendar.tsx      # Calendar view with route indicators
│   ├── DateNavigator.tsx      # Date navigation controls
│   └── AssignmentScreen.tsx   # Route management interface
├── hooks/
│   └── useConvexRoutes.ts     # Convex query/mutation hooks
├── convex/
│   └── _generated/            # Convex TypeScript types (copied)
└── lib/
    └── convex.ts              # Convex client setup
```

## Features

### Calendar View
- 📅 Month calendar with route indicators
- 🟢 Green dot: Both AM & PM routes scheduled
- 🟠 Orange dot: Only AM or PM scheduled
- Touch-optimized date selection

### Route Management
- 🌅 AM Pickup routes
- 🌇 PM Dropoff routes
- Tab-based period switching
- Real-time route counts

### Assignment Interface
- Active routes display (child → driver pairs)
- Unassigned children horizontal scroll
- Available drivers horizontal scroll
- Copy from previous day button
- Remove route with confirmation

### Real-Time Sync
- Instant updates across all connected devices
- Live route status changes
- Automatic refresh on data changes

## Convex Integration

This app connects to the **unified Convex deployment** shared with the POC app:
- **Deployment:** `colorful-wildcat-524.convex.cloud`
- **Environment:** Set in `.env.local` (not tracked in git)

### Convex Hooks

All Convex operations use hooks from `hooks/useConvexRoutes.ts`:

**Query Hooks:**
- `useRoutesForDatePeriod(date, period)` - Get routes for AM/PM
- `useRouteDateRange(startDate, endDate)` - Calendar month data
- `useUnassignedChildren(date, period)` - Children needing assignment
- `useUnassignedDrivers(date, period)` - Available drivers

**Mutation Hooks:**
- `useCreateRoute()` - Create new assignment
- `useCopyFromPreviousDay()` - Bulk copy yesterday's routes
- `useRemoveRoute()` - Delete assignment

## ⚠️ Important: Schema Changes

**If the Convex schema changes**, you must re-copy the generated types:

```bash
cd dispatch-app/convex
rm -rf _generated
cp -r ../../convex/_generated .
```

Then restart Expo with cache clearing:
```bash
npx expo start --clear
```

**Why?** Metro bundler (Expo's bundler) needs a local copy of Convex types. It doesn't follow symlinks well, so we maintain a copy of the `_generated` directory.

**When to do this:**
- After modifying `convex/schema.ts`
- After adding new Convex functions
- After pulling changes that affect Convex code
- If you see TypeScript errors about missing Convex types

## Environment Setup

Create `.env.local` (not tracked in git):

```bash
# Convex Configuration
EXPO_PUBLIC_CONVEX_URL=https://colorful-wildcat-524.convex.cloud
CONVEX_DEPLOYMENT=dev:colorful-wildcat-524
```

## Data Model

The app uses the unified Convex schema with these key tables:

- **routes** - Child-driver assignments with AM/PM periods
- **children** - Full child records (firstName, lastName, addresses, medical info)
- **drivers** - Full driver records (firstName, lastName, performance metrics)
- **parents** - Parent contact information
- **auditLogs** - Compliance and reporting
- **dispatchEvents** - Cross-app event sync

## Development Tips

### Hot Reloading
- Code changes trigger automatic reload
- Convex queries update in real-time
- No need to manually refresh

### Testing Real-Time Sync
1. Open app on multiple devices/simulators
2. Make a change on one device
3. See instant update on other devices
4. Works with POC app too!

### Debugging
- Press `j` in Expo to open DevTools
- Check Convex logs: `npx convex logs` (from root)
- View Convex data: `npx convex dashboard` (from root)

### Common Issues

**Build Error: Cannot resolve Convex types**
→ Re-copy `_generated` directory (see "Schema Changes" above)

**App shows old data**
→ Clear cache: `npx expo start --clear`

**Convex connection fails**
→ Check `.env.local` has correct `EXPO_PUBLIC_CONVEX_URL`
→ Verify `npx convex dev` is running in Terminal 1

## Dependencies

Key packages:
- `expo` - React Native framework
- `expo-router` - File-based navigation
- `convex` - Real-time backend client
- `react-native-calendars` - Calendar components
- `@expo/vector-icons` - Icon library

## Build for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android

# Web (yes, Expo can build for web too!)
npx expo build:web
```

## Related Documentation

- [PHASE1_COMPLETE.md](../PHASE1_COMPLETE.md) - Unified Convex integration
- [PHASE2_COMPLETE.md](../PHASE2_COMPLETE.md) - Calendar UI implementation
- [CLAUDE.md](../CLAUDE.md) - Full project documentation
