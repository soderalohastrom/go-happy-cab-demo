# Go Happy Cab - Dispatch App (Expo Router)

Mobile-first dispatcher application for managing child-driver transportation assignments. Built with React Native and Expo Router, deployed to iOS, Android, and Web.

## 🎯 Purpose

This is the **mobile-optimized version** of the Go Happy Cab POC, designed for:
- Touch-based drag-and-drop assignment interface
- Native iOS and Android apps for non-technical dispatcher
- Web version for desktop/tablet use
- Real-time sync with driver mobile app via shared Convex backend

## 🏗️ Architecture

**Frontend:** React Native 0.81 + Expo Router v6 + TypeScript  
**Backend:** Shared Convex deployment with POC app (`../convex/`)  
**Platform:** iOS 13+, Android 8+, Web (Safari, Chrome, Firefox)

## 📱 Shared Backend

This app uses the **same Convex database** as:
- `../src/` - Original React-Vite POC
- `/cab-driver-mobile-dash/` - Driver mobile dashboard

Changes made in the dispatch app instantly sync to driver phones! 🚀

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Convex deployment running (`npx convex dev` in parent directory)

### Installation

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on specific platform
npm run ios       # iOS Simulator
npm run android   # Android Emulator
npm run web       # Browser
```

### Environment Setup

The `.env.local` file is already configured to use the shared Convex backend:

```bash
EXPO_PUBLIC_CONVEX_URL=https://rugged-mule-519.convex.cloud
CONVEX_DEPLOYMENT=dev:rugged-mule-519
```

## 📂 Project Structure

```
dispatch-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # Home/Calendar view (WIP)
│   │   └── two.tsx          # Assignment interface (WIP)
│   └── _layout.tsx          # Root layout with ConvexProvider
├── lib/
│   └── convex.ts            # Convex client configuration
├── convex.json              # Points to ../convex/ (shared backend)
├── .env.local               # Environment variables (gitignored)
└── app.json                 # Expo configuration
```

## 🔗 Convex Integration

The app connects to the parent `convex/` directory:

```typescript
// lib/convex.ts - Configured to use shared backend
import { ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

// app/_layout.tsx - ConvexProvider wraps entire app
<ConvexProvider client={convex}>
  {/* All screens have access to Convex */}
</ConvexProvider>

// app/(tabs)/index.tsx - Example query
const children = useQuery(api.children.list);
```

## 🧪 Testing Convex Connection

The home tab (`app/(tabs)/index.tsx`) displays a connection test:
1. Start the app: `npm start`
2. Press `w` for web or `i` for iOS simulator
3. You should see "✅ Connected to Convex!" with list of children

## 📋 Development Roadmap

See `../MIGRATION_SPEC.md` for the complete 4-week migration plan.

**Phase 1: Core Infrastructure** ✅ Complete
- [x] Expo Router project setup
- [x] Convex client connection
- [x] Shared backend verification

**Phase 2: Calendar & Navigation** 🔜 Next
- [ ] Calendar component with assignment indicators
- [ ] Date navigation (prev/today/next)
- [ ] AM/PM period tabs

**Phase 3: Assignment Interface** 🔜 Upcoming
- [ ] Unassigned children/drivers lists
- [ ] Active routes display
- [ ] Touch-optimized drag-and-drop

**Phase 4: Copy Feature** 🔜 Upcoming
- [ ] Empty date detection
- [ ] Copy from previous day

## 🔄 Real-Time Sync Test

1. Open this dispatch app
2. Open the POC web app (`cd .. && npm run dev`)
3. Make a change in one app → see it instantly in the other!

## 📝 Available Scripts

```bash
# Development
npm start              # Start Expo dev server (choose platform)
npm run ios            # Open in iOS Simulator
npm run android        # Open in Android Emulator  
npm run web            # Open in web browser

# Type Checking
npm run ts:check       # Run TypeScript checks

# Building
npx expo prebuild      # Generate native projects
npx eas build          # Build for production (requires EAS)
```

## 🎨 Styling

Currently using React Native StyleSheet. Migration plan includes:
- Option A: NativeWind (Tailwind for React Native)
- Option B: React Native StyleSheet with design tokens

## 🐛 Troubleshooting

**"Missing EXPO_PUBLIC_CONVEX_URL"**
- Ensure `.env.local` exists with correct Convex URL
- Restart Metro bundler: `npm start` (press `r` to reload)

**"Cannot connect to Convex"**
- Verify parent POC's Convex deployment is running
- Check network connection
- Verify URL in `.env.local` matches `../env.local`

**TypeScript errors on `api.*`**
- Run `npx convex dev` in parent directory to generate types
- Check `../convex/_generated/api.d.ts` exists

## 📚 Resources

- **Expo Router Docs:** https://docs.expo.dev/router/introduction/
- **Convex React Native:** https://docs.convex.dev/client/react/react-native
- **Migration Spec:** `../MIGRATION_SPEC.md`
- **Project Status:** `../STATUS.md`

## 🤝 Related Apps

- **POC Web App** (`../src/`) - Original proof of concept
- **Driver Mobile App** (`/cab-driver-mobile-dash/`) - Driver route viewing app

All three apps share the same Convex backend for real-time synchronization!

---

**Status:** 🟡 In Development (Phase 1 Complete)  
**Last Updated:** October 24, 2025  
**Next:** Implement calendar navigation (Phase 2)

