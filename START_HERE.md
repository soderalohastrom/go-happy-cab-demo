# 🚀 START HERE - Quick Start Guide

## ⚠️ MOST IMPORTANT RULE

**ALWAYS run `npx convex dev` from THIS directory:**
```bash
/Users/soderstrom/2025/October/go-happy-cab-demo
```

**NEVER from dispatch-app or driver-app!**

---

## 📋 Daily Development Workflow

### Step 1: Start Convex Backend (Terminal 1)

```bash
# Navigate to main project root
cd /Users/soderstrom/2025/October/go-happy-cab-demo

# Start Convex (leave this running!)
npx convex dev
```

You should see:
```
✔ 12:36:42 Convex functions ready! (1.74s)
```

### Step 2: Start Dispatch App (Terminal 2)

```bash
# Navigate to dispatch-app
cd /Users/soderstrom/2025/October/go-happy-cab-demo/dispatch-app

# Start Expo
npx expo start

# Press 'i' for iOS simulator or scan QR code for device
```

### Step 3: (Optional) Start Driver App (Terminal 3)

```bash
# Navigate to driver-app
cd /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash

# Start Expo
npx expo start

# Press 'i' for iOS simulator or scan QR code for device
```

---

## 🎯 Testing the Payroll System

1. Open Dispatch App on your device/simulator
2. Navigate to the **Reports** tab (3rd tab, bar chart icon)
3. You should see:
   - ✅ Date range picker with current pay period
   - ✅ Summary stats (total trips, pick-ups, no-gos, pre-cancels)
   - ✅ Driver list with totals
   - ✅ Tap drivers to expand details
   - ✅ Export buttons for Markdown and CSV

---

## 🆘 Troubleshooting

### "Could not find public function" errors

**Problem:** Convex dev is running from wrong directory

**Solution:**
1. Check where Convex is running:
   ```bash
   ps aux | grep "convex dev" | grep -v grep
   ```

2. If it shows `dispatch-app` in the path, kill it:
   ```bash
   pkill -f "convex dev"
   ```

3. Restart from correct location:
   ```bash
   cd /Users/soderstrom/2025/October/go-happy-cab-demo
   npx convex dev
   ```

### App won't load or shows stale data

**Solution:** Reload the Expo app by pressing **'r'** in the terminal

### Schema changes not appearing

**Solution:** Copy updated types to both apps:
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo

# Copy to dispatch-app
cp -r convex/_generated dispatch-app/convex/

# Copy to driver-app
cp -r convex/_generated /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/convex/
```

Then reload both Expo apps (press 'r')

---

## 📚 Additional Documentation

- **[CONVEX_DEV_WORKFLOW.md](CONVEX_DEV_WORKFLOW.md)** - Detailed Convex workflow guide
- **[STATUS.md](STATUS.md)** - Project status and recent updates
- **[CLAUDE.md](CLAUDE.md)** - Architecture and technical details
- **[PHASE_4_BIDIRECTIONAL_SYNC_WORKING.md](PHASE_4_BIDIRECTIONAL_SYNC_WORKING.md)** - Sync testing guide

---

## ✅ Quick Verification Checklist

Before reporting issues, verify:
- [ ] Convex dev is running from `/Users/soderstrom/2025/October/go-happy-cab-demo`
- [ ] You see "Convex functions ready!" message
- [ ] Expo dev server is running
- [ ] You've tried reloading the app (press 'r')
- [ ] Both apps have up-to-date `_generated` types

---

## 🎉 What's Working

**Dispatch App:**
- ✅ Monthly calendar with route indicators
- ✅ Drag-and-drop route pairing (side-by-side columns)
- ✅ Copy previous day's routes
- ✅ Driver management (add/deactivate/reactivate)
- ✅ **Payroll reporting with export (NEW!)**

**Driver App:**
- ✅ Real-time route display
- ✅ Three-button status system (Pick-up, No-go, Pre-cancel)
- ✅ Bidirectional sync with Dispatch App

**Backend:**
- ✅ Unified Convex deployment: `colorful-wildcat-524.convex.cloud`
- ✅ Real-time WebSocket sync
- ✅ Secure authentication via Clerk
- ✅ Payroll aggregation and reporting

---

**Happy coding! 🌺**
