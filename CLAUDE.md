# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go Happy Cab Demo - A real-time scheduling system for child transportation management with calendar-based assignment tracking. 

**Two Apps Sharing Unified Convex Backend:**
- **POC App** (React + Vite) - Original demo at root, web-based dispatch interface
- **Dispatch App** (React Native + Expo) - Mobile-first dispatch app in `dispatch-app/`

Both apps connect to the same Convex deployment: `colorful-wildcat-524.convex.cloud`

**Phase 9: Schools Management (Nov 21, 2025 - IN PROGRESS)**
- 5 new Convex tables: districts, schools, schoolContacts, schoolSchedules, nonSchoolDays
- Schools tab in Dispatch App with Districts/Schools segmented control
- Add District and Add School functionality with validation

**Phase 10: Push Notifications Infrastructure (Nov 22, 2025 - COMPLETE)**
- **New Table:** `notifications` for tracking sent messages
- **Backend Logic:** `notifications.ts` with `sendRouteNotification` action
- **Internal API:** Secured sensitive queries with `internalQuery`
- **Cron Jobs:** `scheduleReminder` for automated alerts
- **Localization:** Backend-side message formatting (English/Portuguese)

**Phase 12: SMS Switchboard Integration (Nov 24, 2025 - PHASE 2 COMPLETE)**
- **5 New Tables:** `smsTemplates`, `smsMessages`, `smsRecipients`, `smsCampaigns`, `twilioConfig`
- **Backend Functions:** Full CRUD for templates, messages, recipients with bilingual support
- **SMS Dashboard:** 5-screen React Native UI (Dashboard, Send, Messages, Recipients, Templates)
- **168 Recipients:** 91 parents + 77 drivers synced from existing data
- **18 Templates:** Bilingual (EN/PT-BR) for pickup, dropoff, delay, emergency, schedule events
- **Phase 3 (Future):** Twilio API integration after A2P 10DLC approval

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
# Terminal 1: Convex backend sync (REQUIRED - from main project root!)
npx convex dev

# Terminal 2: Expo dev server
cd dispatch-app
npx expo start        # Press 'i' for iOS, 'a' for Android
```

**⚠️ CRITICAL:** See [CONVEX_DEV_WORKFLOW.md](CONVEX_DEV_WORKFLOW.md) for correct Convex dev setup!
- **NEVER** run `npx convex dev` from dispatch-app or driver-app directories
- **ALWAYS** run from main project root (`/Users/soderstrom/2025/October/go-happy-cab-demo`)

### Convex Operations
```bash
# Test Data
npx convex run seed:seedData              # Seed initial test data (18 children, 12 drivers)
npx convex dashboard                      # Open Convex dashboard
npx convex logs                           # Stream live logs
npx convex run <function>                 # Run specific function

# Production Data Import (from Google Sheets CSV exports)
npx convex run importRealData:clearAllData                           # Clear test data first
npx convex run importRealData:importChildren --csv "paste_csv_here" # Import ~120 children
npx convex run importRealData:importDrivers --csv "paste_csv_here"  # Import ~67 drivers
npx convex run importRealData:createInitialRoutes --date "2025-10-28" # Auto-pair routes
npx convex run importRealData:getImportStats                        # Verify import success

# Schools Data Import (from Google Sheets via Python script)
python3 import_school_data.py                                        # Import districts, schools, contacts, schedules, non-school days
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
- **react-native-gesture-handler** + **react-native-reanimated** for drag-and-drop pairing
- **react-native-calendars** for month/date selection
- Touch-optimized native components (no web components)
- AM/PM period tabs for route management
- **Side-by-side columns** for children and drivers with drag-to-pair workflow
- Real-time Convex sync via hooks in `hooks/useConvexRoutes.ts`
- Components: MonthCalendar, DateNavigator, AssignmentScreen, DraggableCard, DropZone

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

### Dispatcher Daily Workflow (Core Purpose)
The Dispatch App is designed for early-morning route assignment:
1. **Copy Previous Day** - 85%+ routes stay the same day-to-day
2. **Drag-to-Pair** - Side-by-side columns for easy child → driver pairing
3. **X to Unpair** - Quick removal of routes that need reassignment
4. **Real-time Sync** - Changes instantly notify drivers via dispatch events

### Drag-and-Drop System
**POC App (Vite):** Uses @dnd-kit with custom sensors for mouse and touch:
- `TouchSensor` with 100ms delay prevents accidental drags
- `PointerSensor` for desktop interactions
- Draggable children/drivers, droppable assignment slots

**Dispatch App (Expo):** Uses react-native-gesture-handler + reanimated:
- **Drag Overlay Pattern** ensures dragged card floats above all UI elements.
- **Coordinate Space Correction** for perfect finger tracking:
  - **Native (iOS/Android):** Uses `position: absolute` + wrapperOffsetY correction
  - **Web:** Uses `position: fixed` for viewport-relative positioning (commit 59591ee)
  - Raw gesture coordinates work correctly on web without scroll correction
- Pan gesture for smooth dragging.
- Drop zone collision detection via absolute window coordinates.
- Side-by-side columns (children | drivers) for intuitive pairing.
- Visual feedback: semi-transparent overlay and highlighted drop zones.

### Date-based Assignment Model
- Assignments are keyed by ISO date string + period (AM/PM)
- Prevents double-booking via unique indexes (`by_child_date_period`, `by_driver_date_period`)
- Historical data preserved for all dates
- Calendar view shows assignment counts per period for both active and inactive tabs.

### Schools Data Model
- **Purpose**: Track school districts, schedules, and non-school days for accurate pickup times and rate lookup
- **Tables**: 5 tables in hierarchical structure
  - `districts` - District names, client info, billing rates
  - `schools` - School details linked to districts via `districtId`
  - `schoolContacts` - Primary/Secondary/Afterschool contacts per school
  - `schoolSchedules` - AM start, PM release, minimum days, early release times
  - `nonSchoolDays` - Individual date records for holidays and closures
- **Rate Lookup Flow**: Children → Schools → Districts → Billing Rates
- **Import Workflow**: Google Sheets → Python script (`import_school_data.py`) → Convex import mutations
- **UI**: 4th tab in Dispatch App for managing districts and schools with segmented control

### Convex Function Organization
- `children.ts` / `drivers.ts`: Entity CRUD operations
- `assignments.ts`: Complex assignment logic with conflict checking
- `schools.ts`: District and school CRUD operations, import mutations for CSV data
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
6. **Google Shared Drive API** - When using Google Drive API with Shared Drives (Team Drives), you MUST include `supportsAllDrives: true` parameter in all Drive API calls. Service accounts have 0 bytes storage quota and cannot create files in their own Drive - use Shared Drives instead for organization-owned storage with unlimited capacity.
7. **Web Platform Compatibility** - When building for web with Expo Router + React Native:
   - **`expo-router` Link Component**: The `<Link>` component can cause `CSSStyleDeclaration` errors on web due to how it applies styles. Use `<Pressable>` with `router.push()` instead for web-compatible navigation.
   - **`react-navigation` ThemeProvider**: Can conflict with `react-native-web`'s styling engine. For web-only layouts, rely on `useColorScheme` hook directly instead of wrapping with `ThemeProvider`.
   - **Platform-Specific Files**: Use `.web.tsx` extensions for web-specific implementations that bypass problematic native libraries (e.g., `DraggableCard.web.tsx` to avoid `react-native-reanimated` on web).

## Production Data Import Process

### Overview
Go Happy Cab serves ~120 children and ~67 Brazilian drivers in Marin County. Production data is maintained in Google Sheets and imported via CSV files.

### Import Workflow

**1. Google Sheets → CSV Export**
- User exports `children.csv` and `drivers.csv` from master Google Sheets
- CSV column specs documented in [SCHEMA_UPDATES.md](SCHEMA_UPDATES.md)
- Includes GPS coordinates, languages, special needs, equipment requirements

**2. Clear Test Data**
```bash
npx convex run importRealData:clearAllData
# Returns: { success: true, deletedCount: 300, message: "Cleared 300 records..." }
```

**3. Import Children (~120 records)**
```bash
npx convex run importRealData:importChildren --csv "child_id,first_name,last_name,..."
# Returns: { success: true, imported: 120, errors: 0, message: "Imported 120 children..." }
```

**4. Import Drivers (~67 records)**
```bash
npx convex run importRealData:importDrivers --csv "driver_id,badge_id,first_name,..."
# Returns: { success: true, imported: 67, errors: 0, message: "Imported 67 drivers..." }
```

**5. Create Initial Route Assignments**
```bash
npx convex run importRealData:createInitialRoutes --date "2025-10-28"
# Auto-pairs children with drivers (round-robin for now, badge-based pairing coming)
# Returns: { success: true, created: 240, targetDate: "2025-10-28", message: "Created 240 route pairs..." }
```

**6. Verify Import Success**
```bash
npx convex run importRealData:getImportStats
# Returns: {
#   totalChildren: 120,
#   totalDrivers: 67,
#   totalRoutes: 240,
#   childrenWithSpecialNeeds: 45,
#   childrenWithGPS: 118,
#   driversWithLanguage: 65,
#   childrenByLanguage: { "Spanish": 80, "Portuguese": 30, "English": 10 },
#   driversByLanguage: { "Portuguese": 60, "English": 7 }
# }
```

### CSV Field Mappings

**Children CSV → Convex Schema:**
- `child_id` → `studentId`
- `badge_id` → Used for route pairing (if provided)
- `special_needs` → Parsed as comma-separated array
- `home_latitude`, `home_longitude` → `homeAddress.coordinates`
- `school_latitude`, `school_longitude` → `schoolAddress.coordinates`
- `pickup_time`, `class_start_time`, `class_end_time` → Schedule fields
- `ride_type`, `pickup_notes`, `home_language` → Operational fields

**Drivers CSV → Convex Schema:**
- `driver_id` → `studentId` (for reference)
- `badge_id` → `employeeId` (primary identifier)
- `primary_language`, `availability_am`, `availability_pm` → Operational fields
- `special_equipment` → Vehicle capabilities (e.g., "Car Seats, Wheelchair Accessible")
- `start_date` → Driver hire date

### Badge-Based Route Pairing
- Children with `badge_id` values (e.g., `BADGE023`) will be auto-paired with matching drivers
- Children without `badge_id` remain unassigned for manual drag-and-drop assignment
- Badge format: `BADGE001` through `BADGE069`

### Data Validation
The import script performs validation:
- Required fields checked (names, IDs, contact info)
- GPS coordinates parsed as floats (decimal degrees)
- Special needs parsed as arrays
- Duplicate prevention via unique indexes
- Error reporting with detailed messages

### Related Documentation
- [SCHEMA_UPDATES.md](SCHEMA_UPDATES.md) - Complete CSV column specifications and schema changes
- [HANDOFF_UI_UPDATES.md](HANDOFF_UI_UPDATES.md) - UI enhancement opportunities for Driver App
- [convex/importRealData.ts](convex/importRealData.ts) - Import script source code

### Common Import Issues
1. **CSV parsing errors** - Ensure no commas in address fields (use quotes)
2. **Missing coordinates** - Import still succeeds, GPS features unavailable for those records
3. **Invalid badge IDs** - Routes won't auto-create, manual assignment required
4. **Duplicate records** - Clear data first or handle duplicates in Google Sheets before export