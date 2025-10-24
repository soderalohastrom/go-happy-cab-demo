# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go Happy Cab Demo - A real-time scheduling system for child transportation management with calendar-based assignment tracking. 

**Two Apps Sharing Unified Convex Backend:**
- **POC App** (React + Vite) - Original demo at root, web-based dispatch interface
- **Dispatch App** (React Native + Expo) - Mobile-first dispatch app in `dispatch-app/`

Both apps connect to the same Convex deployment: `colorful-wildcat-524.convex.cloud`

## Development Commands

### POC App (Vite)
```bash
# Terminal 1: Convex backend sync (shared by both apps)
npx convex dev

# Terminal 2: Vite dev server
npm run dev           # Runs on localhost:5173

# Build and preview
npm run build
npm run preview
```

### Dispatch App (Expo)
```bash
# Terminal 1: Convex backend sync (if not already running)
npx convex dev

# Terminal 2: Expo dev server
cd dispatch-app
npx expo start        # Press 'i' for iOS, 'a' for Android
```

### Convex Operations
```bash
npx convex run seed:seedData              # Seed initial data
npx convex dashboard                      # Open Convex dashboard
npx convex logs                           # Stream live logs
npx convex run <function>                 # Run specific function
```

### Important: Updating Dispatch App After Schema Changes

**If you modify the Convex schema**, you must re-copy the generated types to dispatch-app:

```bash
cd dispatch-app/convex
rm -rf _generated
cp -r ../../convex/_generated .
```

This is required because Metro bundler (Expo's bundler) needs a local copy of the types and doesn't follow symlinks well.

## Architecture Overview

### POC App Frontend (Vite)
- **React 18** with Vite bundler for fast HMR
- **@dnd-kit** for drag-and-drop interactions with touch support
- **react-calendar** for date navigation and scheduling UI
- **TailwindCSS** for styling
- Local state managed via React hooks, synced with Convex

### Dispatch App Frontend (Expo)
- **React Native** with Expo Router for navigation
- **react-native-calendars** for month/date selection
- Touch-optimized native components (no web components)
- AM/PM period tabs for route management
- Real-time Convex sync via hooks in `hooks/useConvexRoutes.ts`
- Components: MonthCalendar, DateNavigator, AssignmentScreen

### Backend (Convex) - Unified for Both Apps
- Real-time database with reactive queries
- Automatic TypeScript type generation from schema
- WebSocket-based live synchronization
- Built-in audit logging for all mutations
- Deployment: `colorful-wildcat-524.convex.cloud`

### Data Flow
1. UI components use `useQuery` hooks for reactive data fetching
2. User actions trigger `useMutation` calls
3. Convex automatically syncs changes to all connected clients
4. Audit log captures all mutations for compliance

## Key Architectural Patterns

### Drag-and-Drop System
The app uses @dnd-kit with custom sensors optimized for both mouse and touch:
- `TouchSensor` with 100ms delay prevents accidental drags
- `PointerSensor` for desktop interactions
- Draggable children/drivers, droppable assignment slots
- Visual feedback during drag operations

### Date-based Assignment Model
- Assignments are keyed by ISO date string + period (AM/PM)
- Prevents double-booking via unique indexes
- Historical data preserved for all dates
- Calendar view shows assignment counts per period

### Convex Function Organization
- `children.ts` / `drivers.ts`: Entity CRUD operations
- `assignments.ts`: Complex assignment logic with conflict checking
- `seed.ts`: Initial data population
- All mutations include audit log entries

## Critical Implementation Details

### Convex Setup Requirements
1. **Environment Variable**: Must set `VITE_CONVEX_URL` in `.env.local`
2. **Dev Process**: Keep `npx convex dev` running during development
3. **Schema Changes**: Modify `convex/schema.ts` then restart convex dev

### Assignment Conflict Resolution
- Database indexes prevent duplicate assignments
- `getUnassigned*` queries filter available entities
- Frontend validates before attempting mutations
- Failed mutations show user-friendly error messages

### Touch Interaction Optimization
- Increased touch activation distance to 0
- Added delay to prevent scroll interference
- Custom drag overlay for better mobile UX
- Consistent behavior across iOS/Android browsers

## Common Development Tasks

### Adding New Entity Fields
1. Update schema in `convex/schema.ts`
2. Modify relevant queries/mutations in `convex/*.ts`
3. Update UI components to display/edit new fields
4. Run `npx convex dev` to sync schema

### Implementing New Features
1. Design Convex queries/mutations first
2. Test via `npx convex run` before UI integration
3. Add reactive queries to React components
4. Implement optimistic updates where appropriate

### Debugging Convex Issues
- Check browser console for WebSocket errors
- Verify `VITE_CONVEX_URL` is correct
- Use `npx convex logs` to see server-side errors
- Inspect data via Convex dashboard

## Testing Considerations

### Manual Testing Checklist
- [ ] Drag-drop works on desktop and mobile
- [ ] Assignments persist after page reload
- [ ] Calendar navigation updates assignments
- [ ] Conflict prevention working (no double-booking)
- [ ] Real-time sync between multiple tabs/devices

### Data Integrity Checks
- Verify audit log captures all changes
- Check indexes prevent invalid states
- Ensure cascading deletes handle references
- Test date boundary conditions (month transitions)

## Performance Optimizations

### Current Optimizations
- Indexed queries for fast date/period lookups
- Memoized filtering for unassigned lists
- Debounced calendar data fetching
- Efficient drag-drop with pointer capture

### Future Optimization Opportunities
- Implement virtual scrolling for large driver lists
- Add pagination for historical audit logs
- Cache calendar data with incremental updates
- Optimize bundle size with code splitting

## Known Constraints

1. **No Authentication**: Currently public access, auth system planned
2. **No Offline Support**: Requires active internet connection
3. **Limited Bulk Operations**: Single assignment creation only
4. **No Export Functionality**: Reports/CSV export not implemented
5. **Mobile App**: Currently web-only, React Native version possible

## Convex-Specific Gotchas

1. **Mutations must return quickly** - Move heavy computation to actions
2. **Queries are reactive by default** - Use `useQuery` not `useEffect`
3. **IDs are typed** - Use `v.id("tableName")` in schemas
4. **Indexes required for filters** - Add indexes for query performance
5. **Environment variables** - Use `VITE_` prefix for client-side access