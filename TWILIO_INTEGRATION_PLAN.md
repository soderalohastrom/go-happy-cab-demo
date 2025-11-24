# Go Happy Cab: SMS & Twilio Integration Plan

**Date:** November 24, 2025  
**Author:** Claude (via Scotty)  
**Status:** Planning Phase - Approved Direction

---

## Executive Summary

This plan outlines the strategic rebuild of the SMS Switchboard functionality, migrating from a Supabase-backed React+Vite POC to a fully integrated React Native + Expo Router application sharing the unified Convex backend. This enables true real-time sync across all Go Happy Cab applications and sets the foundation for Twilio integration.

### The Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED CONVEX BACKEND                           │
│               colorful-wildcat-524.convex.cloud                     │
│                                                                     │
│  Existing: drivers, children, routes, stops, notifications...      │
│  New: smsTemplates, smsMessages, smsRecipients, twilioConfig...    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────────┐
    │  Dispatch  │    │  Driver    │    │ SMS Switchboard │
    │    App     │    │    App     │    │     (NEW)       │
    │  RN+Expo   │    │  RN+Expo   │    │    RN+Expo      │
    └────────────┘    └────────────┘    └────────────────┘
           │                 │                 │
           └─────────────────┴─────────────────┘
                             │
                      ┌──────┴──────┐
                      │   TWILIO    │
                      │  (Phase 3)  │
                      └─────────────┘
```

---

## Phase Overview

| Phase | Description | Duration | Deliverable |
|-------|-------------|----------|-------------|
| **Phase 1** | Convex Schema Extension | 2-3 days | SMS tables in shared Convex |
| **Phase 2** | SMS App Rebuild (RN+Expo) | 1-2 weeks | Fully functional SMS Switchboard |
| **Phase 3** | Twilio Integration | 1 week | Real SMS sending via Twilio |

---

## Phase 1: Convex Schema Extension for SMS

### Goal
Extend the shared Convex backend with tables that replicate and enhance the Supabase SMS POC functionality.

### 1.1 Analysis of Supabase POC Schema

From the original `supabase.ts`, the POC uses these tables:

```typescript
// Current Supabase Types
interface Driver {
  id: string
  name: string
  badge_number: string
  license_number: string
  email?: string
  phone?: string
  status: 'active' | 'inactive'
}

interface Parent {
  id: string
  name: string
  phone: string
  email?: string
  child_name: string
  pickup_time?: string
  pickup_location?: string
  status: 'active' | 'inactive'
}

interface SMSTemplate {
  id: string
  name: string
  subject?: string
  message_text: string
  variables: Record<string, any>
  category?: string
  is_active: boolean
  created_by?: string
}

interface SMSMessage {
  id: string
  campaign_id?: string
  recipient_type: string
  recipient_id?: string
  recipient_name?: string
  recipient_phone: string
  template_id?: string
  message_content: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  simpletext_message_id?: string
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  error_message?: string
  cost_credits: number
}
```

### 1.2 New Convex Schema Additions

**Add to `convex/schema.ts`:**

```typescript
// ============================================================================
// SMS MESSAGING SYSTEM - New tables for SMS Switchboard
// ============================================================================

/**
 * SMS Templates - Message templates with variable substitution
 * Migrated from Supabase POC with enhancements
 */
smsTemplates: defineTable({
  name: v.string(),
  subject: v.optional(v.string()),
  messageText: v.string(),
  
  // Variable definitions with types for validation
  variables: v.array(v.object({
    key: v.string(),           // e.g., "parent_name"
    label: v.string(),         // e.g., "Parent Name"
    defaultValue: v.optional(v.string()),
    required: v.boolean(),
  })),
  
  // Categorization
  category: v.union(
    v.literal("pickup"),
    v.literal("dropoff"),
    v.literal("delay"),
    v.literal("emergency"),
    v.literal("schedule"),
    v.literal("general"),
    v.literal("custom")
  ),
  
  // Target audience
  targetRecipientType: v.union(
    v.literal("parent"),
    v.literal("driver"),
    v.literal("teacher"),
    v.literal("any")
  ),
  
  // Localization
  language: v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es")),
  
  // Status and metadata
  isActive: v.boolean(),
  usageCount: v.number(),
  lastUsedAt: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_category", ["category"])
  .index("by_active", ["isActive"])
  .index("by_language", ["language"])
  .index("by_recipient_type", ["targetRecipientType"]),

/**
 * SMS Messages - Individual message records
 * Tracks all sent messages with delivery status
 */
smsMessages: defineTable({
  // Recipient info
  recipientType: v.union(
    v.literal("parent"),
    v.literal("driver"),
    v.literal("teacher"),
    v.literal("custom")
  ),
  recipientId: v.optional(v.string()),  // Reference to parent/driver/etc
  recipientName: v.string(),
  recipientPhone: v.string(),
  
  // Message content
  templateId: v.optional(v.id("smsTemplates")),
  messageContent: v.string(),
  language: v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es")),
  
  // Delivery tracking
  status: v.union(
    v.literal("draft"),
    v.literal("queued"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("failed"),
    v.literal("undelivered")
  ),
  
  // Twilio integration (Phase 3)
  twilioMessageSid: v.optional(v.string()),
  twilioConversationSid: v.optional(v.string()),
  
  // Timestamps
  scheduledAt: v.optional(v.string()),
  sentAt: v.optional(v.string()),
  deliveredAt: v.optional(v.string()),
  failedAt: v.optional(v.string()),
  
  // Error handling
  errorMessage: v.optional(v.string()),
  errorCode: v.optional(v.string()),
  
  // Cost tracking
  segmentCount: v.number(),  // SMS segments (160 chars each)
  costCredits: v.number(),
  
  // Context linking
  routeId: v.optional(v.id("routes")),
  childId: v.optional(v.id("children")),
  dispatchEventId: v.optional(v.id("dispatchEvents")),
  
  // Metadata
  sentBy: v.optional(v.string()),  // Clerk user ID
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_recipient", ["recipientType", "recipientId"])
  .index("by_status", ["status"])
  .index("by_sent_at", ["sentAt"])
  .index("by_route", ["routeId"])
  .index("by_twilio_sid", ["twilioMessageSid"]),

/**
 * SMS Recipients - Contact directory for quick access
 * Links to existing parents table but allows custom contacts too
 */
smsRecipients: defineTable({
  // Recipient type determines source
  recipientType: v.union(
    v.literal("parent"),
    v.literal("driver"),
    v.literal("teacher"),
    v.literal("school_contact"),
    v.literal("custom")
  ),
  
  // For linked contacts
  linkedParentId: v.optional(v.id("parents")),
  linkedDriverId: v.optional(v.id("drivers")),
  linkedSchoolContactId: v.optional(v.id("schoolContacts")),
  
  // Contact info (denormalized for quick access)
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  
  // For parent recipients
  childName: v.optional(v.string()),
  childId: v.optional(v.id("children")),
  
  // Communication preferences
  preferredLanguage: v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es")),
  optedOut: v.boolean(),
  optOutDate: v.optional(v.string()),
  
  // Context
  notes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  
  // Status
  status: v.union(v.literal("active"), v.literal("inactive")),
  lastContactedAt: v.optional(v.string()),
  messageCount: v.number(),
  
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_type", ["recipientType"])
  .index("by_phone", ["phone"])
  .index("by_status", ["status"])
  .index("by_parent", ["linkedParentId"])
  .index("by_driver", ["linkedDriverId"]),

/**
 * SMS Campaigns - Bulk messaging campaigns
 * For sending same message to multiple recipients
 */
smsCampaigns: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  
  // Template
  templateId: v.optional(v.id("smsTemplates")),
  messageContent: v.string(),
  
  // Recipients
  recipientFilter: v.object({
    types: v.array(v.string()),  // ["parent", "driver"]
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
  }),
  recipientCount: v.number(),
  
  // Status
  status: v.union(
    v.literal("draft"),
    v.literal("scheduled"),
    v.literal("sending"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  
  // Progress
  sentCount: v.number(),
  deliveredCount: v.number(),
  failedCount: v.number(),
  
  // Scheduling
  scheduledAt: v.optional(v.string()),
  startedAt: v.optional(v.string()),
  completedAt: v.optional(v.string()),
  
  // Metadata
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_status", ["status"])
  .index("by_scheduled", ["scheduledAt"]),

/**
 * Twilio Configuration - API credentials and settings
 * Stores Twilio config separate from env vars for flexibility
 */
twilioConfig: defineTable({
  // Identification
  configName: v.string(),  // "production", "development"
  isActive: v.boolean(),
  
  // Phone number
  phoneNumber: v.string(),  // +14158002273
  phoneNumberSid: v.optional(v.string()),
  
  // Service SIDs (reference only - actual creds in env)
  messagingServiceSid: v.optional(v.string()),
  notifyServiceSid: v.optional(v.string()),
  conversationsServiceSid: v.optional(v.string()),
  
  // A2P 10DLC Status
  a2pBrandStatus: v.optional(v.string()),
  a2pCampaignStatus: v.optional(v.string()),
  a2pRegisteredAt: v.optional(v.string()),
  
  // Rate limits
  messagesPerSecond: v.number(),
  dailyLimit: v.optional(v.number()),
  
  // Webhook URLs
  statusCallbackUrl: v.optional(v.string()),
  inboundMessageUrl: v.optional(v.string()),
  
  // Usage tracking
  monthlyMessageCount: v.number(),
  monthlyResetDate: v.string(),
  
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_active", ["isActive"]),
```

### 1.3 Convex Functions for SMS

**New file: `convex/smsTemplates.ts`**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all active templates
export const list = query({
  args: {
    category: v.optional(v.string()),
    language: v.optional(v.string()),
    recipientType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("smsTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    if (args.category) {
      templates = templates.filter(t => t.category === args.category);
    }
    if (args.language) {
      templates = templates.filter(t => t.language === args.language);
    }
    if (args.recipientType) {
      templates = templates.filter(t => 
        t.targetRecipientType === args.recipientType || 
        t.targetRecipientType === "any"
      );
    }
    
    return templates;
  },
});

// Get single template
export const get = query({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create template
export const create = mutation({
  args: {
    name: v.string(),
    subject: v.optional(v.string()),
    messageText: v.string(),
    variables: v.array(v.object({
      key: v.string(),
      label: v.string(),
      defaultValue: v.optional(v.string()),
      required: v.boolean(),
    })),
    category: v.string(),
    targetRecipientType: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("smsTemplates", {
      ...args,
      isActive: true,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update template
export const update = mutation({
  args: {
    id: v.id("smsTemplates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    messageText: v.optional(v.string()),
    variables: v.optional(v.array(v.object({
      key: v.string(),
      label: v.string(),
      defaultValue: v.optional(v.string()),
      required: v.boolean(),
    }))),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete (soft delete by deactivating)
export const deactivate = mutation({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Increment usage counter
export const incrementUsage = mutation({
  args: { id: v.id("smsTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (template) {
      await ctx.db.patch(args.id, {
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      });
    }
  },
});
```

**New file: `convex/smsMessages.ts`**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List messages with filters
export const list = query({
  args: {
    status: v.optional(v.string()),
    recipientType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let messagesQuery = ctx.db.query("smsMessages");
    
    if (args.status) {
      messagesQuery = messagesQuery.withIndex("by_status", 
        (q) => q.eq("status", args.status)
      );
    }
    
    const messages = await messagesQuery
      .order("desc")
      .take(args.limit || 50);
    
    return messages;
  },
});

// Get message by ID
export const get = query({
  args: { id: v.id("smsMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create and queue message (Phase 2: local only, Phase 3: triggers Twilio)
export const send = mutation({
  args: {
    recipientType: v.string(),
    recipientId: v.optional(v.string()),
    recipientName: v.string(),
    recipientPhone: v.string(),
    templateId: v.optional(v.id("smsTemplates")),
    messageContent: v.string(),
    language: v.optional(v.string()),
    routeId: v.optional(v.id("routes")),
    childId: v.optional(v.id("children")),
    scheduledAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Calculate segment count (160 chars per segment)
    const segmentCount = Math.ceil(args.messageContent.length / 160);
    
    const messageId = await ctx.db.insert("smsMessages", {
      recipientType: args.recipientType,
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      templateId: args.templateId,
      messageContent: args.messageContent,
      language: args.language || "en",
      status: args.scheduledAt ? "queued" : "sent", // Phase 2: mock sent
      scheduledAt: args.scheduledAt,
      sentAt: args.scheduledAt ? undefined : now,
      segmentCount,
      costCredits: segmentCount, // 1 credit per segment
      routeId: args.routeId,
      childId: args.childId,
      createdAt: now,
      updatedAt: now,
    });
    
    // Increment template usage if used
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        await ctx.db.patch(args.templateId, {
          usageCount: template.usageCount + 1,
          lastUsedAt: now,
        });
      }
    }
    
    return messageId;
  },
});

// Update message status (for webhook callbacks in Phase 3)
export const updateStatus = mutation({
  args: {
    id: v.id("smsMessages"),
    status: v.string(),
    twilioMessageSid: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };
    
    if (args.twilioMessageSid) {
      updates.twilioMessageSid = args.twilioMessageSid;
    }
    if (args.status === "delivered") {
      updates.deliveredAt = now;
    }
    if (args.status === "failed") {
      updates.failedAt = now;
      updates.errorMessage = args.errorMessage;
      updates.errorCode = args.errorCode;
    }
    
    await ctx.db.patch(args.id, updates);
  },
});

// Get message stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("smsMessages").collect();
    
    const stats = {
      total: allMessages.length,
      sent: allMessages.filter(m => m.status === "sent").length,
      delivered: allMessages.filter(m => m.status === "delivered").length,
      failed: allMessages.filter(m => m.status === "failed").length,
      queued: allMessages.filter(m => m.status === "queued").length,
      totalCredits: allMessages.reduce((sum, m) => sum + m.costCredits, 0),
    };
    
    return stats;
  },
});
```

**New file: `convex/smsRecipients.ts`**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List recipients with filters
export const list = query({
  args: {
    type: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let recipients = await ctx.db
      .query("smsRecipients")
      .withIndex("by_status", (q) => q.eq("status", args.status || "active"))
      .collect();
    
    if (args.type) {
      recipients = recipients.filter(r => r.recipientType === args.type);
    }
    
    return recipients;
  },
});

// Sync recipients from existing parents table
export const syncFromParents = mutation({
  args: {},
  handler: async (ctx) => {
    const parents = await ctx.db.query("parents").collect();
    const now = new Date().toISOString();
    let synced = 0;
    
    for (const parent of parents) {
      // Check if already exists
      const existing = await ctx.db
        .query("smsRecipients")
        .withIndex("by_parent", (q) => q.eq("linkedParentId", parent._id))
        .first();
      
      if (!existing && parent.phone) {
        await ctx.db.insert("smsRecipients", {
          recipientType: "parent",
          linkedParentId: parent._id,
          name: `${parent.firstName} ${parent.lastName}`,
          phone: parent.phone,
          email: parent.email,
          preferredLanguage: "en", // TODO: derive from parent preferences
          optedOut: false,
          status: parent.active ? "active" : "inactive",
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        synced++;
      }
    }
    
    return { synced };
  },
});

// Sync from drivers
export const syncFromDrivers = mutation({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db.query("drivers").collect();
    const now = new Date().toISOString();
    let synced = 0;
    
    for (const driver of drivers) {
      const existing = await ctx.db
        .query("smsRecipients")
        .withIndex("by_driver", (q) => q.eq("linkedDriverId", driver._id))
        .first();
      
      if (!existing && driver.phone) {
        await ctx.db.insert("smsRecipients", {
          recipientType: "driver",
          linkedDriverId: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          phone: driver.phone,
          email: driver.email,
          preferredLanguage: driver.primaryLanguage === "Portuguese" ? "pt-BR" : "en",
          optedOut: false,
          status: driver.active ? "active" : "inactive",
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        synced++;
      }
    }
    
    return { synced };
  },
});

// Add custom recipient
export const addCustom = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("smsRecipients", {
      recipientType: "custom",
      name: args.name,
      phone: args.phone,
      email: args.email,
      notes: args.notes,
      tags: args.tags,
      preferredLanguage: "en",
      optedOut: false,
      status: "active",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Opt out recipient
export const optOut = mutation({
  args: { id: v.id("smsRecipients") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      optedOut: true,
      optOutDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});
```

### 1.4 Phase 1 Deliverables

- [ ] Schema additions to `convex/schema.ts`
- [ ] `convex/smsTemplates.ts` - CRUD operations
- [ ] `convex/smsMessages.ts` - Send and track messages
- [ ] `convex/smsRecipients.ts` - Contact management
- [ ] Copy `_generated` types to all apps
- [ ] Seed initial templates (pickup, dropoff, delay, emergency)
- [ ] Test queries via `npx convex run`

---

## Phase 2: SMS Switchboard Rebuild (React Native + Expo Router)

### Goal
Rebuild the SMS Switchboard app using React Native + Expo Router, replicating all functionality from the Supabase POC while leveraging Convex real-time capabilities.

### 2.1 Project Setup

**Create new app in the ecosystem:**
```bash
# Option A: New directory alongside dispatch-app
cd /Users/soderstrom/2025/October/go-happy-cab-demo
npx create-expo-app sms-switchboard --template expo-template-blank-typescript

# Option B: Feature branch in existing dispatch-app (recommended for integration)
cd dispatch-app
# Add new routes under app/(tabs)/sms/ or app/sms/
```

**Recommended: Integrate into Dispatch App**
Since the SMS Switchboard is a dispatcher tool, it makes sense to add it as a new tab or section within the existing Dispatch App.

### 2.2 Feature Mapping: Supabase POC → RN+Expo+Convex

| Supabase POC Feature | RN+Expo Implementation |
|---------------------|------------------------|
| Dashboard stats | `useQuery(api.smsMessages.getStats)` + UI cards |
| Drivers list | `useQuery(api.smsRecipients.list, { type: "driver" })` |
| Parents list | `useQuery(api.smsRecipients.list, { type: "parent" })` |
| Send SMS form | Form → `useMutation(api.smsMessages.send)` |
| Templates list | `useQuery(api.smsTemplates.list)` |
| Template selection | Picker/Modal with variable substitution |
| Message history | `useQuery(api.smsMessages.list)` with real-time updates |
| Custom recipient | Inline form or modal |

### 2.3 App Structure

**If standalone app:**
```
sms-switchboard/
├── app/
│   ├── _layout.tsx              # Root layout with ConvexProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation
│   │   ├── dashboard/
│   │   │   └── index.tsx        # Stats dashboard
│   │   ├── send/
│   │   │   └── index.tsx        # Send SMS form
│   │   ├── messages/
│   │   │   └── index.tsx        # Message history
│   │   ├── recipients/
│   │   │   └── index.tsx        # Contact directory
│   │   └── templates/
│   │       └── index.tsx        # Template management
│   └── modals/
│       ├── template-editor.tsx  # Create/edit template
│       └── recipient-picker.tsx # Select recipient
├── components/
│   ├── MessageCard.tsx
│   ├── RecipientSelector.tsx
│   ├── TemplateSelector.tsx
│   ├── VariableSubstitution.tsx
│   └── StatsCard.tsx
├── hooks/
│   ├── useSMSTemplates.ts
│   ├── useSMSMessages.ts
│   └── useSMSRecipients.ts
└── convex/
    └── _generated/              # Copied from main project
```

**If integrated into Dispatch App:**
```
dispatch-app/
├── app/
│   ├── (tabs)/
│   │   ├── ... existing tabs ...
│   │   └── sms/                 # NEW TAB
│   │       ├── _layout.tsx      # SMS section layout
│   │       ├── index.tsx        # Dashboard
│   │       ├── send.tsx         # Send SMS
│   │       ├── messages.tsx     # History
│   │       ├── recipients.tsx   # Contacts
│   │       └── templates.tsx    # Templates
│   └── modals/
│       └── sms/
│           ├── template-editor.tsx
│           └── recipient-picker.tsx
├── components/
│   └── sms/                     # SMS-specific components
│       ├── MessageCard.tsx
│       ├── RecipientSelector.tsx
│       ├── TemplateSelector.tsx
│       └── ...
```

### 2.4 Key Screens Implementation

**Dashboard Screen (index.tsx):**
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { View, Text, ScrollView } from 'react-native';
import { StatsCard } from '@/components/sms/StatsCard';

export default function SMSDashboard() {
  const stats = useQuery(api.smsMessages.getStats);
  const recentMessages = useQuery(api.smsMessages.list, { limit: 5 });
  
  if (!stats) return <LoadingSpinner />;
  
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">SMS Dashboard</Text>
        
        {/* Stats Grid */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          <StatsCard title="Total Sent" value={stats.total} icon="send" />
          <StatsCard title="Delivered" value={stats.delivered} color="green" />
          <StatsCard title="Failed" value={stats.failed} color="red" />
          <StatsCard title="Credits Used" value={stats.totalCredits} icon="credit" />
        </View>
        
        {/* Recent Messages */}
        <Text className="text-lg font-semibold mb-2">Recent Messages</Text>
        {recentMessages?.map(msg => (
          <MessageCard key={msg._id} message={msg} />
        ))}
      </View>
    </ScrollView>
  );
}
```

**Send SMS Screen (send.tsx):**
```typescript
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { 
  View, Text, TextInput, Pressable, ScrollView, Alert 
} from 'react-native';
import { RecipientSelector } from '@/components/sms/RecipientSelector';
import { TemplateSelector } from '@/components/sms/TemplateSelector';

export default function SendSMS() {
  const [recipientType, setRecipientType] = useState<string>('parent');
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  
  const recipients = useQuery(api.smsRecipients.list, { 
    type: recipientType,
    status: 'active' 
  });
  const templates = useQuery(api.smsTemplates.list, { 
    recipientType,
    isActive: true 
  });
  
  const sendMessage = useMutation(api.smsMessages.send);
  
  // Template variable substitution
  const applyTemplate = (template: any) => {
    if (!template || !selectedRecipient) return;
    
    let text = template.messageText;
    
    // Replace variables with recipient data
    if (recipientType === 'parent') {
      text = text
        .replace(/{{parent_name}}/g, selectedRecipient.name)
        .replace(/{{child_name}}/g, selectedRecipient.childName || '')
        .replace(/{{pickup_time}}/g, selectedRecipient.pickupTime || 'scheduled time');
    } else if (recipientType === 'driver') {
      text = text
        .replace(/{{driver_name}}/g, selectedRecipient.name)
        .replace(/{{badge_number}}/g, selectedRecipient.badgeNumber || '');
    }
    
    setMessageContent(text);
    setSelectedTemplate(template);
  };
  
  const handleSend = async () => {
    if (!selectedRecipient || !messageContent.trim()) {
      Alert.alert('Error', 'Please select a recipient and enter a message');
      return;
    }
    
    setSending(true);
    try {
      await sendMessage({
        recipientType,
        recipientId: selectedRecipient._id,
        recipientName: selectedRecipient.name,
        recipientPhone: selectedRecipient.phone,
        templateId: selectedTemplate?._id,
        messageContent: messageContent.trim(),
        language: selectedRecipient.preferredLanguage || 'en',
      });
      
      Alert.alert('Success', `Message sent to ${selectedRecipient.name}!`);
      
      // Reset form
      setSelectedRecipient(null);
      setSelectedTemplate(null);
      setMessageContent('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-6">Send SMS</Text>
      
      {/* Recipient Type Selector */}
      <View className="flex-row gap-2 mb-4">
        {['parent', 'driver', 'custom'].map(type => (
          <Pressable
            key={type}
            onPress={() => {
              setRecipientType(type);
              setSelectedRecipient(null);
            }}
            className={`px-4 py-2 rounded-full ${
              recipientType === type 
                ? 'bg-blue-600' 
                : 'bg-gray-200'
            }`}
          >
            <Text className={recipientType === type ? 'text-white' : 'text-gray-700'}>
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </Text>
          </Pressable>
        ))}
      </View>
      
      {/* Recipient Selector */}
      <RecipientSelector
        recipients={recipients || []}
        selected={selectedRecipient}
        onSelect={setSelectedRecipient}
        type={recipientType}
      />
      
      {/* Template Selector */}
      {selectedRecipient && (
        <TemplateSelector
          templates={templates || []}
          selected={selectedTemplate}
          onSelect={applyTemplate}
        />
      )}
      
      {/* Message Content */}
      <View className="mb-4">
        <Text className="font-medium mb-2">Message *</Text>
        <TextInput
          value={messageContent}
          onChangeText={setMessageContent}
          multiline
          numberOfLines={4}
          placeholder="Type your message..."
          className="border border-gray-300 rounded-lg p-3 min-h-[120px]"
        />
        <Text className="text-gray-500 text-sm mt-1">
          {messageContent.length}/160 characters 
          ({Math.ceil(messageContent.length / 160)} segment{messageContent.length > 160 ? 's' : ''})
        </Text>
      </View>
      
      {/* Preview */}
      {messageContent && selectedRecipient && (
        <View className="bg-gray-100 rounded-lg p-4 mb-4">
          <Text className="font-medium mb-2">Preview</Text>
          <Text className="text-gray-700">{messageContent}</Text>
          <Text className="text-gray-500 text-sm mt-2">
            To: {selectedRecipient.name} ({selectedRecipient.phone})
          </Text>
        </View>
      )}
      
      {/* Send Button */}
      <Pressable
        onPress={handleSend}
        disabled={sending || !selectedRecipient || !messageContent.trim()}
        className={`py-4 rounded-lg ${
          sending || !selectedRecipient || !messageContent.trim()
            ? 'bg-gray-300'
            : 'bg-blue-600'
        }`}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {sending ? 'Sending...' : 'Send Message'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

### 2.5 Phase 2 Deliverables

- [ ] Project structure (standalone or integrated)
- [ ] Tab navigation with 5 screens
- [ ] Dashboard with real-time stats
- [ ] Send SMS form with recipient/template selection
- [ ] Variable substitution engine
- [ ] Message history with filtering
- [ ] Recipient management (view, add custom, opt-out)
- [ ] Template management (list, create, edit)
- [ ] Character count and segment calculation
- [ ] Success/error handling with alerts
- [ ] Localization support (en, pt-BR, es)

---

## Phase 3: Twilio Integration

### Goal
Replace mock message sending with actual Twilio API integration, enabling real SMS delivery through the 415.800.CARE number.

### 3.1 Prerequisites

Before starting Phase 3:

- [ ] Twilio account created
- [ ] A2P 10DLC brand registration submitted
- [ ] A2P 10DLC campaign registration submitted
- [ ] Phone number (415.800.CARE) configured
- [ ] Messaging Service created
- [ ] Environment variables configured

### 3.2 Convex Action for Twilio Sending

**New file: `convex/twilioActions.ts`**

```typescript
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Twilio client initialization (runs in Node.js action environment)
async function getTwilioClient() {
  const Twilio = await import("twilio");
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  
  return new Twilio.default(accountSid, authToken);
}

// Send single SMS via Twilio
export const sendSMS = action({
  args: {
    messageId: v.id("smsMessages"),
  },
  handler: async (ctx, args) => {
    // Get message from Convex
    const message = await ctx.runQuery(api.smsMessages.get, { id: args.messageId });
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Check opt-out status
    if (message.recipientId) {
      const recipient = await ctx.runQuery(api.smsRecipients.get, { 
        id: message.recipientId 
      });
      if (recipient?.optedOut) {
        await ctx.runMutation(api.smsMessages.updateStatus, {
          id: args.messageId,
          status: "failed",
          errorMessage: "Recipient has opted out",
        });
        return { success: false, error: "Recipient opted out" };
      }
    }
    
    try {
      const client = await getTwilioClient();
      
      // Send via Twilio
      const twilioMessage = await client.messages.create({
        body: message.messageContent,
        to: message.recipientPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.CONVEX_SITE_URL}/twilio/status-callback`,
      });
      
      // Update message with Twilio SID
      await ctx.runMutation(api.smsMessages.updateStatus, {
        id: args.messageId,
        status: "sent",
        twilioMessageSid: twilioMessage.sid,
      });
      
      return { 
        success: true, 
        twilioSid: twilioMessage.sid,
        status: twilioMessage.status,
      };
      
    } catch (error: any) {
      // Handle Twilio errors
      await ctx.runMutation(api.smsMessages.updateStatus, {
        id: args.messageId,
        status: "failed",
        errorMessage: error.message,
        errorCode: error.code?.toString(),
      });
      
      return { success: false, error: error.message };
    }
  },
});

// Send to multiple recipients (bulk)
export const sendBulk = action({
  args: {
    messageContent: v.string(),
    recipientIds: v.array(v.id("smsRecipients")),
    templateId: v.optional(v.id("smsTemplates")),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const recipientId of args.recipientIds) {
      const recipient = await ctx.runQuery(api.smsRecipients.get, { 
        id: recipientId 
      });
      
      if (!recipient || recipient.optedOut) {
        results.push({ recipientId, success: false, error: "Invalid or opted out" });
        continue;
      }
      
      // Create message record
      const messageId = await ctx.runMutation(api.smsMessages.send, {
        recipientType: recipient.recipientType,
        recipientId: recipientId,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        templateId: args.templateId,
        messageContent: args.messageContent,
        language: recipient.preferredLanguage,
      });
      
      // Send via Twilio
      const result = await ctx.runAction(api.twilioActions.sendSMS, { 
        messageId 
      });
      
      results.push({ recipientId, messageId, ...result });
      
      // Rate limiting: 1 message per second for 10DLC
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  },
});

// Create Twilio Conversation for multi-party messaging
export const createConversation = action({
  args: {
    friendlyName: v.string(),
    routeId: v.optional(v.id("routes")),
    childId: v.optional(v.id("children")),
    participants: v.array(v.object({
      identity: v.string(),
      type: v.string(),
      phone: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const client = await getTwilioClient();
    
    // Create conversation
    const conversation = await client.conversations.v1.conversations.create({
      friendlyName: args.friendlyName,
    });
    
    // Add SMS participants
    for (const p of args.participants) {
      await client.conversations.v1
        .conversations(conversation.sid)
        .participants.create({
          messagingBinding: {
            address: p.phone,
            proxyAddress: process.env.TWILIO_PHONE_NUMBER,
          },
        });
    }
    
    // Store in Convex
    await ctx.runMutation(internal.twilioConversations.create, {
      conversationSid: conversation.sid,
      friendlyName: args.friendlyName,
      routeId: args.routeId,
      childId: args.childId,
      participants: args.participants,
    });
    
    return { conversationSid: conversation.sid };
  },
});
```

### 3.3 Webhook Handler for Delivery Status

**Add to `convex/http.ts`:**

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Twilio status callback webhook
http.route({
  path: "/twilio/status-callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string;
    const errorCode = formData.get("ErrorCode") as string | null;
    const errorMessage = formData.get("ErrorMessage") as string | null;
    
    // Find message by Twilio SID
    const message = await ctx.runQuery(api.smsMessages.getByTwilioSid, {
      twilioSid: messageSid,
    });
    
    if (message) {
      // Map Twilio status to our status
      const statusMap: Record<string, string> = {
        "queued": "queued",
        "sending": "sending",
        "sent": "sent",
        "delivered": "delivered",
        "undelivered": "undelivered",
        "failed": "failed",
      };
      
      await ctx.runMutation(api.smsMessages.updateStatus, {
        id: message._id,
        status: statusMap[messageStatus] || messageStatus,
        errorMessage: errorMessage || undefined,
        errorCode: errorCode || undefined,
      });
    }
    
    return new Response("OK", { status: 200 });
  }),
});

// Inbound SMS webhook
http.route({
  path: "/twilio/inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;
    
    // Store inbound message
    await ctx.runMutation(api.smsMessages.createInbound, {
      fromPhone: from,
      messageContent: body,
      twilioMessageSid: messageSid,
    });
    
    // Could trigger auto-responses or notifications here
    
    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

### 3.4 Update Send Flow

**Modify `convex/smsMessages.ts` send mutation:**

```typescript
// Updated send mutation that triggers Twilio action
export const send = mutation({
  args: {
    // ... same args as before
    sendImmediately: v.optional(v.boolean()), // Default true
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const segmentCount = Math.ceil(args.messageContent.length / 160);
    
    // Create message record with "queued" status
    const messageId = await ctx.db.insert("smsMessages", {
      recipientType: args.recipientType,
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      templateId: args.templateId,
      messageContent: args.messageContent,
      language: args.language || "en",
      status: "queued", // Will be updated by Twilio action
      segmentCount,
      costCredits: segmentCount,
      routeId: args.routeId,
      childId: args.childId,
      createdAt: now,
      updatedAt: now,
    });
    
    // Schedule Twilio send action
    if (args.sendImmediately !== false) {
      await ctx.scheduler.runAfter(0, api.twilioActions.sendSMS, {
        messageId,
      });
    }
    
    return messageId;
  },
});
```

### 3.5 Environment Setup

**Add to `.env.local` in main project:**

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+14158002273

# Optional: For Conversations API
TWILIO_CONVERSATIONS_SERVICE_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook URL (set after Convex deployment)
# CONVEX_SITE_URL=https://your-convex-deployment.convex.site
```

### 3.6 Phase 3 Deliverables

- [ ] Twilio account setup and A2P 10DLC registration
- [ ] `convex/twilioActions.ts` - Send SMS action
- [ ] `convex/http.ts` - Webhook handlers
- [ ] Status callback processing
- [ ] Inbound message handling
- [ ] Bulk send with rate limiting
- [ ] Conversations API integration (optional)
- [ ] Error handling and retry logic
- [ ] Delivery status real-time updates in UI
- [ ] Cost tracking and usage monitoring

---

## Integration Points with Existing Apps

### Dispatch App Triggers

```typescript
// When dispatcher creates/modifies route
await ctx.db.insert("dispatchEvents", {
  type: "route_created",
  routeId,
  childId,
  driverId,
  triggerSms: true,  // Auto-send SMS to parent
  // ...
});

// Scheduled function processes SMS triggers
export const processSMSTriggers = mutation({
  // Finds events with triggerSms=true, smsTriggered=false
  // Creates appropriate smsMessages
  // Calls twilioActions.sendSMS
});
```

### Driver App Triggers

```typescript
// When driver marks pickup status
// In driverActions.ts updatePickupStatus:

// After updating route status...
await ctx.db.insert("smsMessages", {
  recipientType: "parent",
  recipientId: child.parent1?.id,
  recipientName: child.parent1?.firstName,
  recipientPhone: child.parent1?.phone,
  messageContent: t('pickup_complete', { 
    childName: child.firstName,
    driverName: driver.firstName,
    time: new Date().toLocaleTimeString()
  }),
  // ...
});

// Schedule Twilio send
await ctx.scheduler.runAfter(0, api.twilioActions.sendSMS, { messageId });
```

---

## Timeline Summary

| Phase | Duration | Key Milestones |
|-------|----------|----------------|
| **Phase 1** | 2-3 days | Schema deployed, functions tested, seeds created |
| **Phase 2** | 1-2 weeks | Full SMS UI in RN+Expo, all features working locally |
| **Phase 3** | 1 week | Twilio sending live, webhooks processing, real messages |
| **Total** | ~3 weeks | Production-ready unified SMS system |

---

## Success Criteria

1. **Phase 1 Complete When:**
   - `npx convex run smsTemplates:list` returns templates
   - `npx convex run smsMessages:getStats` returns valid stats
   - Schema copied to all apps without errors

2. **Phase 2 Complete When:**
   - All 5 screens functional and navigable
   - Can select recipient, apply template, send "mock" message
   - Message appears in history with real-time update
   - Character count and segment calculation accurate

3. **Phase 3 Complete When:**
   - Test SMS received on real phone
   - Delivery status updates automatically in UI
   - Inbound messages appear in system
   - No Twilio errors in logs

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| A2P 10DLC rejection | Start registration ASAP, prepare clear use case description |
| Twilio rate limits | Implement queue with 1 msg/sec spacing |
| Phone number porting | Use Twilio number directly if 415.800.CARE not portable |
| Schema conflicts | Run all schema changes through single Convex dev instance |
| UI complexity | Start with MVP screens, iterate based on usage |

---

## Related Files

- **Original POC:** `/Users/soderstrom/Documents/GoHappyCab/go-happy-cab-fixed/`
- **Dispatch App:** `/Users/soderstrom/2025/October/go-happy-cab-demo/dispatch-app/`
- **Driver App:** `/Users/soderstrom/generated_repos/spec-kit-expo-router/cab-driver-mobile-dash/`
- **Shared Convex:** `/Users/soderstrom/2025/October/go-happy-cab-demo/convex/`

---

**Ready to start Phase 1?**
