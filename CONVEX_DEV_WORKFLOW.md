# Convex Development Workflow

**CRITICAL: Only ONE Convex dev process should run - from the main project root!**

## ✅ Correct Workflow

### Starting Development

**Terminal 1 - Shared Convex Backend (REQUIRED):**
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev
# Leave this running! Do NOT start convex dev from dispatch-app or driver-app
```

**Terminal 2 - Dispatch App:**
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo/dispatch-app
npx expo start
# Press 'r' to reload when needed
```

**Terminal 3 - Driver App (Optional):**
```bash
cd /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash
npx expo start
# Press 'r' to reload when needed
```

## ⚠️ Common Mistake - DO NOT DO THIS

```bash
# ❌ WRONG - Do NOT run convex dev from dispatch-app!
cd dispatch-app
npx convex dev  # This will break everything!

# ❌ WRONG - Do NOT run convex dev from driver-app!
cd cab-driver-mobile-dash
npx convex dev  # This will also break everything!
```

## 🔧 After Schema Changes

When you modify `convex/schema.ts` or add new Convex functions:

1. **Convex will auto-sync** - Just wait for "Convex functions ready!"
2. **Copy types to both apps:**
   ```bash
   cd /Users/soderstrom/2025/October/go-happy-cab-demo

   # Copy to dispatch-app
   cp -r convex/_generated dispatch-app/convex/

   # Copy to driver-app
   cp -r convex/_generated /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/convex/
   ```
3. **Reload both Expo apps** - Press 'r' in each terminal

## 📁 Directory Structure

```
/Users/soderstrom/2025/October/go-happy-cab-demo/
├── convex/                      # ✅ SOURCE OF TRUTH - Run `npx convex dev` HERE
│   ├── schema.ts                # Shared schema
│   ├── assignments.ts           # Route assignment functions
│   ├── drivers.ts               # Driver management
│   ├── children.ts              # Children management
│   ├── driverActions.ts         # Driver app mutations
│   ├── payroll.ts               # Payroll reporting (NEW!)
│   ├── config.ts                # Payroll config (NEW!)
│   └── _generated/              # Auto-generated types
│
├── dispatch-app/
│   ├── convex/
│   │   └── _generated/          # ✅ COPY from main convex/_generated
│   └── ...
│
└── /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/
    ├── convex/
    │   └── _generated/          # ✅ COPY from main convex/_generated
    └── ...
```

## 🆘 Troubleshooting

### "Could not find public function" errors

**Problem:** You ran `npx convex dev` from dispatch-app or driver-app

**Solution:**
1. Kill all convex processes: `pkill -f "convex dev"`
2. Start from main project root:
   ```bash
   cd /Users/soderstrom/2025/October/go-happy-cab-demo
   npx convex dev
   ```
3. Copy types to both apps (see above)
4. Reload Expo apps

### Schema validation errors

**Problem:** The apps have stale `_generated` types

**Solution:**
```bash
cd /Users/soderstrom/2025/October/go-happy-cab-demo

# Re-copy to both apps
cp -r convex/_generated dispatch-app/convex/
cp -r convex/_generated /Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/convex/
```

### Indexes deleted unexpectedly

**Problem:** Convex dev started from wrong directory

**Solution:**
1. Verify you're in main project root: `pwd` should show `/Users/soderstrom/2025/October/go-happy-cab-demo`
2. Restart convex dev from correct location
3. Indexes will be re-created automatically

## 💡 Key Principles

1. **One Backend, Multiple Frontends** - All apps share the same Convex deployment
2. **Single Source of Truth** - Only the main `convex/` directory contains functions
3. **Type Synchronization** - Copy `_generated/` to apps after schema changes
4. **Never Run Dev from Apps** - Apps only need Expo dev server, not Convex dev

## 🎯 Quick Reference

| Task | Command | Location |
|------|---------|----------|
| Start Convex Backend | `npx convex dev` | Main project root |
| Start Dispatch App | `npx expo start` | `dispatch-app/` |
| Start Driver App | `npx expo start` | `cab-driver-mobile-dash/` |
| Copy Types | See "After Schema Changes" | Main project root |
| View Logs | `npx convex logs` | Main project root |
| Run Function | `npx convex run <function>` | Main project root |

---

**Remember: Keep it simple! One Convex dev process from the main root, and you're good to go! 🌺**
