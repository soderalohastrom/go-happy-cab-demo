# Go Happy Cab - Calendar Scheduling Setup Guide

## Overview

Your app has been upgraded with:
- ✅ **Convex Backend** - Real-time database with sync
- ✅ **Calendar Interface** - Navigate and schedule any date
- ✅ **Date-based Assignments** - Persistent child-driver pairings
- ✅ **Historical Data** - All assignments are saved by date
- ✅ **Audit Logging** - Track all changes automatically

## Setup Instructions

### Step 1: Create a Convex Account

1. Go to https://dashboard.convex.dev
2. Sign up or log in with GitHub/Google
3. Click "Create a new project"
4. Name it something like "go-happy-cab"

### Step 2: Get Your Deployment URL

After creating the project, Convex will show you a deployment URL that looks like:
```
https://xxxx-yyyy-zzzz.convex.cloud
```

Copy this URL - you'll need it next.

### Step 3: Configure Environment Variables

1. Open the `.env.local` file in this project
2. Replace the placeholder with your actual Convex URL:

```bash
VITE_CONVEX_URL=https://your-actual-deployment-url.convex.cloud
```

### Step 4: Deploy Convex Schema

Run this command to deploy your database schema to Convex:

```bash
npx convex dev
```

This will:
- Upload your schema (children, drivers, assignments, audit log)
- Start watching for changes
- Generate TypeScript types

**Keep this terminal running** - it syncs your local Convex functions with the cloud.

### Step 5: Seed Initial Data

In a **new terminal**, run:

```bash
npx convex run seed:seedData
```

This will populate your database with the initial children and drivers from your demo data.

### Step 6: Start the Development Server

In another terminal, run:

```bash
npm run dev
```

Your app should now be running at http://localhost:5173

## How to Use the New Features

### Calendar Navigation

- **Today Button** - Jump to today's date
- **Prev/Next** - Navigate day by day
- **Calendar Button** - Open month view to jump to any date
- **Date Indicators** - See assignment counts on calendar (orange=AM, blue=PM)

### Creating Assignments

1. Select a date using the calendar or navigation buttons
2. Choose AM or PM period
3. Drag a child to a driver (or vice versa)
4. Assignment is instantly saved to Convex!

### Key Features

- **Persistence** - All assignments are saved to the database
- **Real-time Sync** - Changes appear instantly across all connected clients
- **Historical View** - Select any past date to see what was scheduled
- **Future Scheduling** - Schedule assignments for future dates
- **Conflict Prevention** - Can't assign same child/driver twice in same period
- **Audit Trail** - Every change is logged automatically

## Database Schema

### Tables Created

1. **children** - Master list of children
2. **drivers** - Master list of drivers
3. **assignments** - Date-specific pairings
4. **auditLog** - Change tracking

### Available Convex Functions

#### Queries (Read Data)
- `children.list` - Get all active children
- `drivers.list` - Get all active drivers
- `assignments.getForDate` - Get assignments for a specific date
- `assignments.getForDatePeriod` - Get assignments for date + period
- `assignments.getUnassignedChildren` - Get unassigned children
- `assignments.getUnassignedDrivers` - Get unassigned drivers
- `assignments.getForDateRange` - Get summary for calendar view

#### Mutations (Write Data)
- `children.create` - Add new child
- `drivers.create` - Add new driver
- `assignments.create` - Create an assignment
- `assignments.remove` - Delete an assignment
- `assignments.copyFromDate` - Copy assignments to another date

## Next Steps (Future Enhancements)

### Phase 2 - Reporting (Recommended Next)
- Driver utilization reports
- Child transportation history
- Weekly/monthly summaries
- Export to CSV/PDF

### Phase 3 - Bulk Operations
- Copy week of assignments
- Recurring schedule templates
- Batch import/export

### Phase 4 - Advanced Features
- User authentication
- Role-based permissions (admin vs driver)
- Push notifications
- SMS/Email reminders
- Mobile app

## Troubleshooting

### "Cannot connect to Convex"
- Check that `VITE_CONVEX_URL` in `.env.local` is correct
- Make sure `npx convex dev` is running
- Restart your dev server after changing `.env.local`

### "No data showing"
- Run the seed script: `npx convex run seed:seedData`
- Check Convex dashboard to verify data exists
- Open browser console to check for errors

### "Assignment creation fails"
- Check for conflicts (child/driver already assigned)
- Verify the child and driver exist in database
- Check browser console for error messages

## Development Workflow

1. **Keep `npx convex dev` running** in one terminal
2. **Run `npm run dev`** in another terminal
3. **Make changes** to Convex functions in `convex/` folder
4. **Changes auto-sync** to Convex cloud
5. **React app auto-reloads** when you edit components

## File Structure

```
go-happy-cab-demo/
├── convex/
│   ├── schema.ts              # Database schema
│   ├── children.ts            # Children queries/mutations
│   ├── drivers.ts             # Drivers queries/mutations
│   ├── assignments.ts         # Assignments queries/mutations
│   ├── seed.ts               # Seed data script
│   └── tsconfig.json         # TypeScript config
├── src/
│   ├── components/
│   │   └── DateNavigator.jsx # Calendar navigation
│   ├── App.jsx               # Main app (now using Convex)
│   ├── main.jsx              # Entry point (wrapped with ConvexProvider)
│   └── index.css             # Styles
├── .env.local                # Convex URL (DO NOT COMMIT)
└── package.json              # Dependencies
```

## Support

- **Convex Docs**: https://docs.convex.dev
- **React Calendar**: https://github.com/wojtekmaj/react-calendar
- **dnd-kit**: https://docs.dndkit.com

---

**Ready to go!** Follow the steps above and you'll have a fully functional scheduling system with real-time sync and calendar navigation.
