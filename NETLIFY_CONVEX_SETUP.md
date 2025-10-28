# Netlify + Convex Setup Guide

**Issue:** Netlify build fails because `npx convex codegen` requires authentication credentials.

**Error Message:**
```
✖ Netlify build environment detected but no Convex deployment configuration found.
Set one of:
  • CONVEX_DEPLOY_KEY for Convex Cloud deployments
```

---

## ✅ Solution: Add CONVEX_DEPLOY_KEY to Netlify

### Step 1: Get Your Convex Deploy Key

**Method A: Via Convex Dashboard (Recommended)**

1. Go to: https://dashboard.convex.dev/
2. Select your project: **go-happy-cab-unified**
3. Select deployment: **colorful-wildcat-524** (dev deployment)
4. Click on **Settings** (gear icon)
5. Go to **Deploy Keys** section
6. Click **Generate Deploy Key** (or copy existing one)
7. **Copy the key** - looks like: `prod:***************|***************`

**Method B: Via Convex CLI**

```bash
# From your project root
npx convex deploy --cmd 'echo $CONVEX_DEPLOY_KEY'
```

This will show your deploy key in the output.

---

### Step 2: Add Deploy Key to Netlify

1. Go to: https://app.netlify.com/
2. Select your **go-happy-cab-demo** site
3. Go to: **Site settings** → **Build & deploy** → **Environment**
4. Click **Edit variables** or **Add a variable**
5. Add:
   - **Key:** `CONVEX_DEPLOY_KEY`
   - **Value:** `prod:***************|***************` (paste your key)
   - **Scopes:** Select "All scopes" or "Builds"
   - Mark as **Secret** (recommended)
6. Click **Save**

---

### Step 3: Trigger Rebuild

**Option A: In Netlify Dashboard**
1. Go to: **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**

**Option B: Push to GitHub**
```bash
# Make a small change to trigger rebuild
git commit --allow-empty -m "chore: trigger Netlify rebuild with Convex key"
git push origin master
```

---

## ✅ Expected Result

Your next Netlify build should succeed with this log:

```
$ npm run build
> npx convex codegen && vite build

Finding component definitions...
Generating server code...
Bundling component definitions...
Analyzing source code...
Generating TypeScript bindings...
Running TypeScript...

vite v5.4.21 building for production...
✓ 131 modules transformed.
✓ built in XXXms

Build successful!
```

---

## 🔐 Security Notes

**Deploy Key Security:**
- ✅ **DO** mark the key as "Secret" in Netlify
- ✅ **DO** use "prod" deploy key (read-only, safe for CI/CD)
- ❌ **DON'T** commit the deploy key to your repository
- ❌ **DON'T** share the key publicly

**Key Permissions:**
- Deploy keys allow **read-only** access to your Convex deployment
- They can fetch schema and generate types
- They **cannot** modify data or deployment settings

---

## 🆘 Alternative: Skip Codegen on Netlify

**If you don't want to add credentials to Netlify**, you can commit the generated files instead:

### Option 2A: Commit Generated Files (Not Recommended)

1. Remove `convex/_generated/` from `.gitignore`
2. Run `npx convex codegen` locally
3. Commit the generated files
4. Update build script to skip codegen

**Update package.json:**
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

**Downside:** You must remember to run codegen locally and commit whenever schema changes.

---

### Option 2B: Conditional Codegen (Smarter Alternative)

Update `package.json` to only run codegen if credentials exist:

```json
{
  "scripts": {
    "build": "(npx convex codegen 2>/dev/null || echo 'Skipping codegen') && vite build"
  }
}
```

This will:
- Try to run codegen
- If it fails (no credentials), skip it
- Continue with Vite build

**Downside:** The app might use stale types if schema changes.

---

## 🎯 Recommended Approach

**Use Option 1: Add CONVEX_DEPLOY_KEY to Netlify**

This is the proper production setup:
- ✅ Types always up-to-date
- ✅ No manual codegen steps
- ✅ Secure (deploy key is read-only)
- ✅ Works automatically on every deploy

---

## 📋 Checklist

- [ ] Get Convex Deploy Key from dashboard
- [ ] Add `CONVEX_DEPLOY_KEY` to Netlify environment variables
- [ ] Mark key as "Secret" in Netlify
- [ ] Trigger new deploy
- [ ] Verify build succeeds
- [ ] Check deployed site works

---

## 🔍 Verify It Worked

After adding the deploy key and rebuilding:

1. **Check Netlify Build Log:**
   ```
   Finding component definitions...
   Generating TypeScript bindings...
   ✓ built in XXXms
   ```

2. **Check Deployed Site:**
   - Visit your Netlify URL
   - Open DevTools Console
   - Should see Convex connection established
   - No errors about missing types

---

## 📞 Need Help?

**Convex Docs:**
- Deploy Keys: https://docs.convex.dev/production/hosting
- Environment Variables: https://docs.convex.dev/production/environment-variables

**Netlify Docs:**
- Environment Variables: https://docs.netlify.com/environment-variables/overview/

---

**Next Step:** Get your deploy key from Convex dashboard and add it to Netlify! 🚀
