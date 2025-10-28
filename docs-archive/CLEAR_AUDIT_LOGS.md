# Clear Old Audit Logs to Fix Schema Error

**Issue:** Existing `auditLogs` data doesn't match the new unified schema  
**Solution:** Clear old audit log data and let Convex redeploy

---

## Option 1: Clear via Convex Dashboard (Easiest)

1. **Open Convex Dashboard:**
   ```
   https://dashboard.convex.dev/deployment/data/colorful-wildcat-524/auditLogs
   ```

2. **Delete all documents:**
   - Click on the `auditLogs` table
   - Select all documents (click checkbox at top)
   - Click "Delete" button
   - Confirm deletion

3. **Restart Convex:**
   ```bash
   cd /Users/soderstrom/2025/October/go-happy-cab-demo
   # Kill existing convex dev if running
   pkill -f "convex dev"
   
   # Start fresh
   npx convex dev
   ```

---

## Option 2: Create a Clear Function (Programmatic)

Create a temporary clear function:

```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo
```

Create `convex/clearAuditLogs.ts`:

```typescript
import { mutation } from "./_generated/server";

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();
    
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    
    return { deleted: logs.length };
  },
});
```

Then run:

```bash
npx convex run clearAuditLogs:clearAll
```

Delete the file after:

```bash
rm convex/clearAuditLogs.ts
```

---

## Option 3: Manual Fix (If you want to keep data)

If you want to preserve audit logs, you'd need to update each existing record to add the missing fields. This is more complex and not recommended for development.

---

## After Clearing Data

1. **Re-seed the database:**
   ```bash
   npx convex run seed:seedData
   ```

2. **Restart Convex dev:**
   ```bash
   npx convex dev
   ```

3. **Test Dispatch App:**
   - Open Dispatch App
   - Try "Copy Previous Day's Schedule"
   - Should work without audit log errors

4. **Test Driver App:**
   - Reload Driver App (press 'r' in Expo)
   - Should see green "UNIFIED CONVEX CONNECTED!" banner
   - No more schema errors

---

## What Fixed

✅ All audit log insertions now use `auditLogs` (plural)  
✅ Helper function `createAuditLog` adds all required fields:
- `logId` - Unique identifier
- `timestamp` - ISO string
- `category` - "data_modification"
- `severity` - "info"
- `method` - CREATE/UPDATE/DELETE
- `userType` - "dispatcher" or "system"
- `sourceInfo` - App version, device ID
- `complianceFlags` - Retention, sensitivity flags

✅ Fixed child/driver name references (firstName + lastName)  
✅ Seed.ts updated with proper audit log format

---

**Choose Option 1 (Dashboard) - it's fastest!** 

Then test both apps and report back! 🌺

