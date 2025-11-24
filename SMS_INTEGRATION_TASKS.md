# SMS Integration Task List

**Created:** November 24, 2025  
**Branch:** `feature/web-dashboard`  
**Status:** 🚧 In Progress

---

## Quick Context for Handoff

This task list tracks the SMS Switchboard integration for Go Happy Cab. The work migrates the Supabase-based SMS POC (`/Users/soderstrom/Documents/GoHappyCab/go-happy-cab-fixed/`) to a Convex-backed, React Native + Expo Router implementation integrated into the Dispatch App.

**Key Files:**
- Full plan: `/Users/soderstrom/2025/October/go-happy-cab-demo/TWILIO_INTEGRATION_PLAN.md`
- Schema: `/Users/soderstrom/2025/October/go-happy-cab-demo/convex/schema.ts`
- Dispatch App: `/Users/soderstrom/2025/October/go-happy-cab-demo/dispatch-app/`

**Convex Deployment:** `https://colorful-wildcat-524.convex.cloud`

**Critical Rule:** Run `npx convex dev` ONLY from `/Users/soderstrom/2025/October/go-happy-cab-demo/` (the root), never from subdirectories.

---

## Phase 1: Convex Schema Extension (Backend)

### 1.1 Schema Additions
- [x] Add `smsTemplates` table to `convex/schema.ts`
- [x] Add `smsMessages` table to `convex/schema.ts`
- [x] Add `smsRecipients` table to `convex/schema.ts`
- [x] Add `smsCampaigns` table to `convex/schema.ts`
- [x] Add `twilioConfig` table to `convex/schema.ts`
- [ ] Verify schema compiles: `npx convex dev` (user runs this)

### 1.2 Convex Functions - Templates
- [x] Create `convex/smsTemplates.ts`
- [x] Implement `list` query (with filters: category, language, recipientType)
- [x] Implement `get` query (by ID)
- [x] Implement `create` mutation
- [x] Implement `update` mutation
- [x] Implement `deactivate` mutation (soft delete)
- [x] Implement `incrementUsage` mutation
- [x] Bonus: `duplicate` mutation, `reactivate` mutation, `getByCategory`, `getByLanguage`

### 1.3 Convex Functions - Messages
- [x] Create `convex/smsMessages.ts`
- [x] Implement `list` query (with filters: status, recipientType, limit)
- [x] Implement `get` query (by ID)
- [x] Implement `getByTwilioSid` query (for webhooks)
- [x] Implement `send` mutation (creates message, Phase 2 mocks, Phase 3 triggers Twilio)
- [x] Implement `updateStatus` mutation (for delivery callbacks)
- [x] Implement `getStats` query (totals, by status, credits used)
- [x] Implement `createInbound` mutation (for incoming SMS)
- [x] Bonus: `getByRecipient`, `getRecentActivity`, `sendBulk`

### 1.4 Convex Functions - Recipients
- [x] Create `convex/smsRecipients.ts`
- [x] Implement `list` query (with filters: type, status)
- [x] Implement `get` query (by ID)
- [x] Implement `syncFromParents` mutation (populate from parents table)
- [x] Implement `syncFromDrivers` mutation (populate from drivers table)
- [x] Implement `addCustom` mutation (manual contact entry)
- [x] Implement `optOut` mutation
- [x] Implement `update` mutation (was updateContact)
- [x] Bonus: `getByPhone`, `getByParent`, `getByDriver`, `search`, `getCounts`, `syncFromSchoolContacts`, `optIn`, `remove`, `addTagsToMany`

### 1.5 Seed Data
- [x] Create `convex/seedSmsTemplates.ts`
- [x] Seed pickup_complete template (en, pt-BR)
- [x] Seed no_show template (en, pt-BR)
- [x] Seed route_assigned template (en, pt-BR)
- [x] Seed delay_notification template (en, pt-BR)
- [x] Seed emergency template (en, pt-BR)
- [x] Bonus: dropoff_complete, driver_assignment, weather_cancellation, pre_cancel (all bilingual)
- [ ] Run seed: `npx convex run seedSmsTemplates:seed` (user runs this)

### 1.6 Verification
- [x] Test `npx convex run smsTemplates:list` returns templates ✅ 18 templates
- [x] Test `npx convex run smsMessages:getStats` returns valid stats ✅ Working
- [x] Test `npx convex run smsRecipients:syncFromParents` populates recipients ✅ 91 synced
- [x] Test `npx convex run smsRecipients:syncFromDrivers` ✅ 77 synced
- [ ] Copy `_generated` types to Driver App if needed (deferred - not needed for Phase 2)

---

## Phase 2: SMS Dashboard UI (React Native + Expo Router)

### 2.1 Project Structure
- [x] Create `dispatch-app/app/(tabs)/sms/` directory ✅
- [x] Create `dispatch-app/app/(tabs)/sms/_layout.tsx` (stack navigator) ✅
- [x] Create `dispatch-app/components/sms/` directory ✅
- [x] Add SMS tab to `dispatch-app/app/(tabs)/_layout.tsx` ✅
- [x] Add SMS to `dispatch-app/components/WebSidebar.tsx` ✅

### 2.2 Dashboard Screen
- [x] Create `dispatch-app/app/(tabs)/sms/index.tsx` ✅
- [x] Implement stats cards (total, delivered, failed, credits) ✅
- [x] Implement recent messages list ✅
- [x] Wire up `useQuery(api.smsMessages.getStats)` ✅
- [x] Wire up `useQuery(api.smsMessages.list)` ✅

### 2.3 Send SMS Screen
- [x] Create `dispatch-app/app/(tabs)/sms/send.tsx` ✅
- [x] Implement recipient type tabs (parent, driver, custom) ✅
- [x] Implement template selection and variable substitution ✅
- [x] Implement character count / segment calculator ✅
- [x] Implement message preview ✅
- [x] Implement send button with `useMutation(api.smsMessages.send)` ✅
- [x] Implement success/error feedback ✅
- [ ] Create `components/sms/RecipientSelector.tsx` (deferred - inline in send.tsx)
- [ ] Create `components/sms/TemplateSelector.tsx` (deferred - inline in send.tsx)
- [ ] Create `components/sms/VariableSubstitution.tsx` (deferred - inline in send.tsx)

### 2.4 Message History Screen
- [x] Create `dispatch-app/app/(tabs)/sms/messages.tsx` ✅
- [x] Implement message list with status badges ✅
- [x] Implement filters (status) ✅
- [x] Implement real-time updates via Convex subscription ✅
- [ ] Create `components/sms/MessageCard.tsx` (deferred - inline in messages.tsx)
- [ ] Implement message detail view (modal) (stretch goal)

### 2.5 Recipients Screen
- [x] Create `dispatch-app/app/(tabs)/sms/recipients.tsx` ✅
- [x] Implement recipient list with tabs (parents, drivers) ✅
- [x] Implement search/filter ✅
- [x] Implement sync buttons (from parents, from drivers) ✅
- [ ] Implement add custom recipient form (stretch goal)
- [ ] Implement opt-out toggle (stretch goal)
- [ ] Create `components/sms/RecipientCard.tsx` (deferred - inline)

### 2.6 Templates Screen
- [x] Create `dispatch-app/app/(tabs)/sms/templates.tsx` ✅
- [x] Implement template list with category filters ✅
- [x] Implement template detail modal ✅
- [x] Implement deactivate/reactivate toggle ✅
- [x] Implement duplicate template ✅
- [x] Implement usage stats display ✅
- [ ] Implement create template form (stretch goal)
- [ ] Implement edit template form (stretch goal)
- [ ] Create `components/sms/TemplateCard.tsx` (deferred - inline)

### 2.7 Shared Components
- [ ] Create `components/sms/StatsCard.tsx` (deferred - inline in index.tsx)
- [ ] Create `components/sms/StatusBadge.tsx` (deferred - inline)
- [ ] Create `components/sms/LanguageSelector.tsx` (stretch goal)
- [x] Ensure all screens work in web viewport ✅ (dark/light theme support)

### 2.8 Testing & Polish
- [ ] Test all screens in web browser (desktop viewport)
- [ ] Test navigation between SMS screens
- [ ] Test real-time updates (open two browsers, send message)
- [ ] Verify character counting accuracy
- [ ] Verify template variable substitution
- [ ] Test error states (no recipients, empty message)

---

## Phase 3: Twilio Integration (Future - After A2P 10DLC Approval)

### 3.1 Twilio Account Setup
- [ ] Create Twilio account
- [ ] Submit A2P 10DLC Brand registration
- [ ] Submit A2P 10DLC Campaign registration
- [ ] Configure phone number (415.800.CARE or Twilio number)
- [ ] Create Messaging Service
- [ ] Note: May take 1-7 days for approval

### 3.2 Environment Configuration
- [ ] Add `TWILIO_ACCOUNT_SID` to `.env.local`
- [ ] Add `TWILIO_AUTH_TOKEN` to `.env.local`
- [ ] Add `TWILIO_PHONE_NUMBER` to `.env.local`
- [ ] Add `TWILIO_MESSAGING_SERVICE_SID` to `.env.local`
- [ ] Configure Convex environment variables

### 3.3 Twilio Actions
- [ ] Create `convex/twilioActions.ts`
- [ ] Implement `sendSMS` action (single message via Twilio API)
- [ ] Implement `sendBulk` action (multiple recipients with rate limiting)
- [ ] Implement `createConversation` action (for multi-party messaging)
- [ ] Update `smsMessages.send` to schedule Twilio action

### 3.4 Webhook Handlers
- [ ] Create/update `convex/http.ts`
- [ ] Implement `/twilio/status-callback` route (delivery status updates)
- [ ] Implement `/twilio/inbound` route (incoming SMS)
- [ ] Implement webhook signature validation
- [ ] Deploy HTTP routes to Convex

### 3.5 Integration with Dispatch Events
- [ ] Create `convex/processSMSTriggers.ts` scheduled function
- [ ] Wire `dispatchEvents` with `triggerSms=true` to Twilio
- [ ] Test route creation → parent SMS flow
- [ ] Test driver pickup → parent SMS flow

### 3.6 Testing
- [ ] Send test SMS to real phone
- [ ] Verify delivery status updates in UI
- [ ] Test inbound SMS reply handling
- [ ] Test bulk send with rate limiting
- [ ] Verify cost tracking accuracy

---

## Reference: Original POC Features to Replicate

From `/Users/soderstrom/Documents/GoHappyCab/go-happy-cab-fixed/src/pages/`:

- [x] `Dashboard.tsx` - Stats overview *(Phase 2.2)*
- [ ] `Drivers.tsx` - Driver list *(covered by existing Dispatch features)*
- [ ] `Parents.tsx` - Parent list *(covered by existing Dispatch features)*
- [ ] `SendSMS.tsx` - Send form with templates *(Phase 2.3)*
- [ ] `Templates.tsx` - Template CRUD *(Phase 2.6)*
- [ ] `Messages.tsx` - Message history *(Phase 2.4)*

---

## Session Notes

*(Add notes here when handing off or resuming)*

**Nov 24, 2025 - Initial Session:**
- Created this task list
- Verified filesystem access to all three codebases
- Verified Convex MCP access and schema structure
- Confirmed Driver App piggybacks on same Convex deployment
- Decision: Integrate SMS into Dispatch App, not standalone
- Decision: Work on `feature/web-dashboard` branch
- Ready to begin Phase 1.1 (Schema Additions)

**Nov 24, 2025 - Phase 1 Implementation (continued):**
- ✅ Added 5 SMS tables to schema.ts (lines 829-1107):
  - `smsTemplates` - Message templates with variables
  - `smsMessages` - Individual message records  
  - `smsRecipients` - Contact directory
  - `smsCampaigns` - Bulk messaging campaigns
  - `twilioConfig` - Twilio settings
- ✅ Created `convex/smsTemplates.ts` (299 lines) - Full CRUD + extras
- ✅ Created `convex/smsMessages.ts` (381 lines) - Send, status, stats, bulk
- ✅ Created `convex/smsRecipients.ts` (452 lines) - Sync, CRUD, search
- ✅ Created `convex/seedSmsTemplates.ts` (348 lines) - 18 bilingual templates

**NEXT STEPS for user:**
1. Run `cd /Users/soderstrom/2025/October/go-happy-cab-demo && npx convex dev` to deploy schema
2. Run `npx convex run seedSmsTemplates:seed` to populate templates
3. Run `npx convex run smsRecipients:syncFromParents` to populate recipients
4. Run `npx convex run smsRecipients:syncFromDrivers` to add drivers
5. Verify with `npx convex run smsTemplates:list` and `npx convex run smsMessages:getStats`

---

## Commands Reference

```bash
# Run Convex dev (ALWAYS from this directory)
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx convex dev

# Test Convex functions
npx convex run smsTemplates:list
npx convex run smsMessages:getStats
npx convex run smsRecipients:syncFromParents

# Run Dispatch App
cd dispatch-app
npx expo start --web

# View Convex Dashboard
open https://dashboard.convex.dev/d/colorful-wildcat-524
```
