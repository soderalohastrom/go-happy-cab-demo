# Go Happy Cab - POC to Expo Router Migration Spec

**Created:** October 24, 2025  
**Target:** Convert React-Vite POC to React Native Expo Router dispatch app  
**Goal:** Mobile-first dispatcher app (iOS/Android/Web) with touch-optimized drag-and-drop

## Executive Summary

Convert the working React-Vite POC into a React Native Expo Router application to enable:
- ✅ Native mobile experience for non-technical dispatcher
- ✅ Touch-optimized drag-and-drop for assignment pairing
- ✅ iOS, Android, and Web deployment from single codebase
- ✅ Shared Convex backend with driver mobile app
- ✅ Real-time sync and notifications

## Architecture Decision

### Chosen Approach: Subdirectory Migration
Create `dispatch-app/` subdirectory using Expo Router while preserving original POC.

**Rationale:**
- Keep working POC as reference during migration
- Share existing `convex/` backend directory
- Enable side-by-side comparison during development
- Gradual feature-by-feature migration
- Future path to monorepo with driver app

### Technology Stack

**Frontend (Expo Router):**
- React Native 0.73+
- Expo Router v3 (file-based routing)
- Expo SDK 50+
- React Native Gesture Handler + Reanimated
- `@shopify/flash-list` for performant lists
- React Native Calendars for date picker

**Backend (Shared):**
- Convex real-time database (existing)
- Same schema as POC: `children`, `drivers`, `assignments`, `auditLog`
- Same mutations/queries, just called from React Native

**Drag & Drop Library:**
- `react-native-draggable-flatlist` - Native performance
- OR `@shopify/flash-list` with gesture handlers
- OR custom implementation with Reanimated 3

**Styling:**
- NativeWind (Tailwind for React Native)
- OR React Native StyleSheet
- Design tokens for consistency

## Feature Migration Map

### Phase 1: Core Infrastructure (Week 1)
**Status: 🟡 Planning**

1. **Setup Expo Router Project** (T-001)
   - [ ] Initialize: `npx create-expo-app dispatch-app --template tabs`
   - [ ] Install Convex: `npm install convex`
   - [ ] Configure TypeScript strict mode
   - [ ] Setup NativeWind/styling system
   - [ ] Configure Convex provider
   - [ ] Test basic query/mutation from React Native

2. **Connect to Existing Convex Backend** (T-002)
   - [ ] Point to same deployment as POC
   - [ ] Copy `.env.local` configuration
   - [ ] Test `useQuery(api.children.list)` works
   - [ ] Verify real-time sync between POC and new app

3. **Basic Navigation Structure** (T-003)
   - [ ] Bottom tabs: Calendar, Assign, Settings
   - [ ] Date context provider
   - [ ] Period (AM/PM) state management

### Phase 2: Calendar & Date Navigation (Week 1-2)
**Status: 🔴 Not Started**

4. **Calendar Component** (T-004)
   - [ ] Install `react-native-calendars`
   - [ ] Show assignment counts per date (AM/PM indicators)
   - [ ] Tap date to navigate to assignment view
   - [ ] Current date highlight
   - [ ] Month/year navigation

5. **Date Navigation Bar** (T-005)
   - [ ] Current date display header
   - [ ] Prev/Today/Next buttons
   - [ ] Calendar modal toggle
   - [ ] AM/PM period tabs

**Migration Notes:**
- POC uses `react-calendar` → Replace with `react-native-calendars`
- Desktop hover states → Replace with touch press feedback
- Mouse clicks → Touch gestures with haptic feedback

### Phase 3: Assignment Lists (Week 2)
**Status: 🔴 Not Started**

6. **Unassigned Children List** (T-006)
   - [ ] Use `@shopify/flash-list` for performance
   - [ ] Child card with emoji, name, "Needs driver" badge
   - [ ] Alphabetical sorting
   - [ ] Count badge in header
   - [ ] Empty state handling

7. **Unassigned Drivers List** (T-007)
   - [ ] Flash list implementation
   - [ ] Driver card with emoji, name, "Available" badge
   - [ ] Alphabetical sorting
   - [ ] Count badge in header
   - [ ] Empty state handling

8. **Active Routes List** (T-008)
   - [ ] Two-column responsive layout
   - [ ] Route card showing child ↔ driver pairing
   - [ ] Delete button with confirmation
   - [ ] Sort by child/driver toggle
   - [ ] Empty state with illustration

**Migration Notes:**
- POC uses React `map()` → Use `FlashList` for native performance
- CSS Grid layout → React Native Flexbox
- Hover effects → Touch press states with scale animation

### Phase 4: Touch-Optimized Drag & Drop (Week 2-3)
**Status: 🔴 Not Started - CRITICAL FEATURE**

9. **Draggable Children Cards** (T-009)
   - [ ] Long-press to initiate drag
   - [ ] Visual feedback (scale, shadow, haptic)
   - [ ] Drag overlay following finger
   - [ ] Cancel on release outside drop zone

10. **Droppable Driver Cards** (T-010)
    - [ ] Highlight on drag-over
    - [ ] Drop zone visual indicator
    - [ ] Reject if driver already assigned
    - [ ] Success animation on drop

11. **Bidirectional Drag Support** (T-011)
    - [ ] Drag child → driver (create assignment)
    - [ ] Drag driver → child (create assignment)
    - [ ] Drag within active routes (modify assignment)
    - [ ] Visual cues for valid/invalid drops

12. **Assignment Mutation on Drop** (T-012)
    - [ ] Call `api.assignments.create` on successful drop
    - [ ] Optimistic UI updates
    - [ ] Error handling with rollback
    - [ ] Success toast notification
    - [ ] Real-time sync to POC app

**Library Decision:**
```typescript
// Option A: react-native-draggable-flatlist
import DraggableFlatList from 'react-native-draggable-flatlist';

// Option B: Custom with Reanimated 3
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Recommendation: Start with Option A, optimize with Option B if needed
```

### Phase 5: Copy Previous Day Feature (Week 3)
**Status: 🔴 Not Started**

13. **Empty Date Detection** (T-013)
    - [ ] Query assignments for selected date
    - [ ] Show banner if count === 0
    - [ ] "Copy from previous day" action button
    - [ ] Loading state during copy operation

14. **Bulk Copy UI** (T-014)
    - [ ] Modal confirmation dialog
    - [ ] Show previous day's assignment count
    - [ ] Progress indicator during copy
    - [ ] Success message with count
    - [ ] Automatic list refresh

15. **Copy Mutation Integration** (T-015)
    - [ ] Call `api.assignments.copyFromPreviousDay`
    - [ ] Handle "no previous data" error
    - [ ] Handle "already exists" error
    - [ ] Audit log entry verification

**Migration Notes:**
- POC uses browser `alert()` → Use React Native Modal or Toast
- Desktop button → Large touch-friendly button (min 44x44 pts)

### Phase 6: Real-Time Features (Week 3-4)
**Status: 🔴 Not Started**

16. **Live Data Sync** (T-016)
    - [ ] Verify `useQuery` reactivity works
    - [ ] Test multi-device sync (POC ↔ Dispatch app)
    - [ ] Test driver app can see changes
    - [ ] Connection status indicator
    - [ ] Offline queue support

17. **Push Notifications Setup** (T-017)
    - [ ] Configure Expo notifications
    - [ ] Request permissions on iOS/Android
    - [ ] Store notification tokens in Convex
    - [ ] Test local notifications

18. **Assignment Change Notifications** (T-018)
    - [ ] Listen for assignment mutations
    - [ ] Trigger notification to affected drivers
    - [ ] Include child name, time, action in message
    - [ ] Deep link to assignment in driver app

**Integration Point:**
```typescript
// In driver mobile app - receives notifications
useQuery(api.assignments.getForDriver, { 
  driverId: currentDriver._id,
  date: today 
});

// Automatically updates when dispatcher creates assignment!
```

### Phase 7: Polish & Testing (Week 4)
**Status: 🔴 Not Started**

19. **Accessibility** (T-019)
    - [ ] VoiceOver/TalkBack labels
    - [ ] Dynamic type support
    - [ ] High contrast mode
    - [ ] Screen reader announcements

20. **Performance Optimization** (T-020)
    - [ ] Memoize expensive components
    - [ ] Optimize FlashList rendering
    - [ ] Reduce Convex query frequency
    - [ ] Profile JavaScript thread

21. **Error Handling** (T-021)
    - [ ] Network error states
    - [ ] Convex connection lost
    - [ ] Conflict resolution (double-booking)
    - [ ] User-friendly error messages

22. **Testing** (T-022)
    - [ ] Unit tests for business logic
    - [ ] Integration tests for mutations
    - [ ] Manual testing on iOS physical device
    - [ ] Manual testing on Android physical device
    - [ ] Web platform verification

## Migration Strategy

### Parallel Development Approach

**Keep POC Running:**
- Continue using React-Vite POC for daily operations
- New Expo app in development/testing mode
- Both apps share same Convex backend
- Real-time sync allows comparison

**Cutover Plan:**
1. Reach feature parity with POC
2. Test with actual dispatcher for 1 week
3. Verify touch drag-and-drop is superior
4. Switch to Expo app as primary
5. Keep POC as backup/reference

### Risk Mitigation

**Risk 1: Drag-and-drop harder than expected**
- Mitigation: Start with simple tap-to-assign as fallback
- Implement drag-drop as enhancement

**Risk 2: Performance issues on older devices**
- Mitigation: Use FlashList, profile on target devices
- Test on iPhone 8 / Pixel 4 as minimum

**Risk 3: Dispatcher finds mobile UI confusing**
- Mitigation: Heavy user testing during development
- Keep tablet/web option available

## File Structure

```
dispatch-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation
│   │   ├── index.tsx            # Calendar view
│   │   ├── assign.tsx           # Assignment interface
│   │   └── settings.tsx         # Settings/preferences
│   ├── +not-found.tsx           # 404 handler
│   └── _layout.tsx              # Root layout with providers
│
├── components/
│   ├── calendar/
│   │   ├── DateNavigator.tsx   # Date picker bar
│   │   └── MonthCalendar.tsx   # Full calendar modal
│   ├── assignments/
│   │   ├── ChildCard.tsx        # Draggable child card
│   │   ├── DriverCard.tsx       # Droppable driver card
│   │   ├── RouteCard.tsx        # Active assignment card
│   │   ├── EmptyBanner.tsx      # "Copy previous day" banner
│   │   └── DragDropZone.tsx     # Drag-drop container
│   └── common/
│       ├── Button.tsx           # Reusable button
│       ├── Card.tsx             # Base card component
│       └── LoadingState.tsx     # Loading indicators
│
├── hooks/
│   ├── useAssignments.ts        # Assignment queries/mutations
│   ├── useChildren.ts           # Children queries
│   ├── useDrivers.ts            # Driver queries
│   └── useDateContext.ts        # Current date state
│
├── providers/
│   ├── ConvexProvider.tsx       # Convex client setup
│   └── DateProvider.tsx         # Date selection context
│
├── lib/
│   ├── convex.ts                # Convex client config
│   ├── utils.ts                 # Date helpers, formatters
│   └── constants.ts             # Colors, sizes, tokens
│
├── convex/                      # Symlink to ../convex
├── package.json
├── tsconfig.json
├── app.json                     # Expo config
└── metro.config.js              # Metro bundler config
```

## Technical Decisions

### 1. Drag-and-Drop Library

**Recommended: `react-native-draggable-flatlist`**
- Pros: Battle-tested, good performance, supports gestures
- Cons: May need customization for our use case

**Alternative: Custom with Reanimated 3**
- Pros: Full control, optimized for our exact needs
- Cons: More development time, need gesture expertise

**Decision Point:** Start with library, build custom if performance issues

### 2. Styling Approach

**Recommended: NativeWind**
- Pros: Familiar Tailwind syntax, works on all platforms
- Cons: Learning curve if unfamiliar with Tailwind

**Alternative: StyleSheet with design tokens**
- Pros: Standard React Native, no extra dependencies
- Cons: More verbose, harder to maintain

### 3. Convex Integration

**Shared Backend Configuration:**
```typescript
// dispatch-app/lib/convex.ts
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

const convex = new ConvexReactClient(
  Constants.expoConfig?.extra?.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL!
);

export default convex;
```

**Environment Setup:**
```bash
# dispatch-app/.env.local
EXPO_PUBLIC_CONVEX_URL=<same URL as POC>
```

### 4. Navigation Structure

**Bottom Tabs (Primary):**
- 📅 **Calendar** - Month view with assignment indicators
- 🎯 **Assign** - Main drag-drop interface
- ⚙️ **Settings** - Preferences, about, logout (future)

**Modal Screens:**
- Calendar picker (full screen)
- Assignment details
- Confirmation dialogs

## Convex Schema Compatibility

**No schema changes needed!** The Expo app uses the exact same schema:

```typescript
// Already defined in convex/schema.ts
- children: { name, active, metadata }
- drivers: { name, active, metadata }
- assignments: { date, period, childId, driverId, status }
- auditLog: { timestamp, action, entityType, details }
```

**Mutations/Queries to Use:**
```typescript
// All existing functions work in React Native
api.assignments.create
api.assignments.copyFromPreviousDay
api.assignments.getForDatePeriod
api.assignments.remove
api.children.list
api.drivers.list
```

## Testing Plan

### Unit Tests
- Date formatting utilities
- Assignment conflict detection
- Sorting algorithms

### Integration Tests
- Create assignment flow
- Copy previous day flow
- Delete assignment flow
- Real-time sync verification

### Manual Testing Checklist
- [ ] Drag child to driver on iOS
- [ ] Drag child to driver on Android
- [ ] Drag driver to child (bidirectional)
- [ ] Copy 24 assignments from previous day
- [ ] Verify sync to driver mobile app
- [ ] Test on slow network
- [ ] Test offline mode
- [ ] Verify accessibility with VoiceOver/TalkBack

## Success Metrics

### Functional Requirements
- ✅ All POC features work in Expo app
- ✅ Touch drag-and-drop works smoothly (no lag)
- ✅ Real-time sync with driver app
- ✅ Works on iOS, Android, and Web

### UX Requirements
- ✅ Dispatcher can complete daily setup in < 2 minutes
- ✅ No training needed for touch interface
- ✅ Large touch targets (min 44x44 pts)
- ✅ Visual feedback for all actions

### Technical Requirements
- ✅ 60 FPS during drag operations
- ✅ < 100ms latency for mutations
- ✅ Works offline with sync queue
- ✅ Supports iOS 13+, Android 8+

## Timeline Estimate

**Week 1:** Setup + Calendar + Date Navigation (T-001 to T-005)  
**Week 2:** Lists + Drag-Drop Foundation (T-006 to T-012)  
**Week 3:** Copy Feature + Real-Time (T-013 to T-018)  
**Week 4:** Polish + Testing (T-019 to T-022)

**Total:** 4 weeks to feature parity + mobile optimization

## Next Steps for New Session

1. **Read this spec** and `STATUS.md` to understand current state
2. **Create `dispatch-app/` directory** and initialize Expo Router
3. **Setup Convex connection** and verify queries work
4. **Implement Phase 1** (Core Infrastructure)
5. **Regular commits** with descriptive messages
6. **Update this spec** with progress/blockers

## Questions to Resolve

- [ ] What is the minimum iOS/Android version to support?
- [ ] Should we support tablet landscape mode?
- [ ] Is web platform mandatory or nice-to-have?
- [ ] Should dispatcher see driver availability status?
- [ ] Do we need offline mode for dispatcher?
- [ ] Should we add multi-dispatcher support (conflict resolution)?

## Future Enhancements (Post-MVP)

- Driver availability calendar integration
- Batch assignment creation
- Route optimization suggestions
- Export to PDF/CSV
- Multi-language support
- Dark mode
- Tablet-optimized layout
- Voice commands for accessibility

---

**Status Legend:**
- 🔴 Not Started
- 🟡 Planning/In Progress
- 🟢 Complete
- ⚠️ Blocked/Issues

**Last Updated:** October 24, 2025  
**Next Review:** When starting migration work

