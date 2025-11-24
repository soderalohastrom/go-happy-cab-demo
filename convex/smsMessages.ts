import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SMS Messages - CRUD operations for message records
 * Part of SMS Switchboard integration
 * Created: November 24, 2025
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List messages with optional filters
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
    recipientType: v.optional(v.string()),
    limit: v.optional(v.number()),
    routeId: v.optional(v.id("routes")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let messages;

    if (args.status) {
      messages = await ctx.db
        .query("smsMessages")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .take(limit);
    } else if (args.routeId) {
      messages = await ctx.db
        .query("smsMessages")
        .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
        .order("desc")
        .take(limit);
    } else {
      messages = await ctx.db
        .query("smsMessages")
        .order("desc")
        .take(limit);
    }

    // Apply recipient type filter if specified
    if (args.recipientType) {
      messages = messages.filter((m) => m.recipientType === args.recipientType);
    }

    return messages;
  },
});

/**
 * Get single message by ID
 */
export const get = query({
  args: { id: v.id("smsMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get message by Twilio SID (for webhook callbacks)
 */
export const getByTwilioSid = query({
  args: { twilioSid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsMessages")
      .withIndex("by_twilio_sid", (q) => q.eq("twilioMessageSid", args.twilioSid))
      .first();
  },
});

/**
 * Get messages for a specific recipient
 */
export const getByRecipient = query({
  args: {
    recipientType: v.string(),
    recipientId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smsMessages")
      .withIndex("by_recipient", (q) =>
        q.eq("recipientType", args.recipientType as any).eq("recipientId", args.recipientId)
      )
      .order("desc")
      .take(args.limit || 20);
  },
});

/**
 * Get message statistics
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("smsMessages").collect();

    const stats = {
      total: allMessages.length,
      draft: allMessages.filter((m) => m.status === "draft").length,
      queued: allMessages.filter((m) => m.status === "queued").length,
      sending: allMessages.filter((m) => m.status === "sending").length,
      sent: allMessages.filter((m) => m.status === "sent").length,
      delivered: allMessages.filter((m) => m.status === "delivered").length,
      failed: allMessages.filter((m) => m.status === "failed").length,
      undelivered: allMessages.filter((m) => m.status === "undelivered").length,
      totalSegments: allMessages.reduce((sum, m) => sum + m.segmentCount, 0),
      totalCredits: allMessages.reduce((sum, m) => sum + m.costCredits, 0),
      byRecipientType: {
        parent: allMessages.filter((m) => m.recipientType === "parent").length,
        driver: allMessages.filter((m) => m.recipientType === "driver").length,
        teacher: allMessages.filter((m) => m.recipientType === "teacher").length,
        custom: allMessages.filter((m) => m.recipientType === "custom").length,
      },
    };

    return stats;
  },
});

/**
 * Get recent message activity (for dashboard)
 */
export const getRecentActivity = query({
  args: { hours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const hoursAgo = args.hours || 24;
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const recentMessages = await ctx.db
      .query("smsMessages")
      .withIndex("by_sent_at")
      .filter((q) => q.gte(q.field("sentAt"), cutoffTime))
      .collect();

    return {
      count: recentMessages.length,
      delivered: recentMessages.filter((m) => m.status === "delivered").length,
      failed: recentMessages.filter((m) => m.status === "failed").length,
      messages: recentMessages.slice(0, 10), // Last 10
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Send (create) a new message
 * Phase 2: Creates record with "sent" status (mock)
 * Phase 3: Will trigger Twilio action
 */
export const send = mutation({
  args: {
    recipientType: v.union(
      v.literal("parent"),
      v.literal("driver"),
      v.literal("teacher"),
      v.literal("custom")
    ),
    recipientId: v.optional(v.string()),
    recipientName: v.string(),
    recipientPhone: v.string(),
    templateId: v.optional(v.id("smsTemplates")),
    messageContent: v.string(),
    language: v.optional(v.union(v.literal("en"), v.literal("pt-BR"), v.literal("es"))),
    routeId: v.optional(v.id("routes")),
    childId: v.optional(v.id("children")),
    dispatchEventId: v.optional(v.id("dispatchEvents")),
    scheduledAt: v.optional(v.string()),
    sentBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Calculate segment count (160 chars per segment for GSM-7, 70 for Unicode)
    // Simplified: assume GSM-7 encoding
    const segmentCount = Math.ceil(args.messageContent.length / 160);

    const messageId = await ctx.db.insert("smsMessages", {
      recipientType: args.recipientType,
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      templateId: args.templateId,
      messageContent: args.messageContent,
      language: args.language || "en",
      // Phase 2: Mock as "sent" immediately
      // Phase 3: Will be "queued" until Twilio confirms
      status: args.scheduledAt ? "queued" : "sent",
      scheduledAt: args.scheduledAt,
      sentAt: args.scheduledAt ? undefined : now,
      segmentCount,
      costCredits: segmentCount, // 1 credit per segment
      routeId: args.routeId,
      childId: args.childId,
      dispatchEventId: args.dispatchEventId,
      sentBy: args.sentBy,
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

/**
 * Update message status (for Twilio webhook callbacks)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("smsMessages"),
    status: v.union(
      v.literal("draft"),
      v.literal("queued"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("undelivered")
    ),
    twilioMessageSid: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.twilioMessageSid) {
      updates.twilioMessageSid = args.twilioMessageSid;
    }

    // Set appropriate timestamp based on status
    switch (args.status) {
      case "sent":
        updates.sentAt = now;
        break;
      case "delivered":
        updates.deliveredAt = now;
        break;
      case "failed":
      case "undelivered":
        updates.failedAt = now;
        if (args.errorMessage) updates.errorMessage = args.errorMessage;
        if (args.errorCode) updates.errorCode = args.errorCode;
        break;
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Create inbound message record (for incoming SMS)
 */
export const createInbound = mutation({
  args: {
    fromPhone: v.string(),
    messageContent: v.string(),
    twilioMessageSid: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Try to find matching recipient by phone number
    const recipient = await ctx.db
      .query("smsRecipients")
      .withIndex("by_phone", (q) => q.eq("phone", args.fromPhone))
      .first();

    return await ctx.db.insert("smsMessages", {
      recipientType: recipient?.recipientType || "custom",
      recipientId: recipient?._id,
      recipientName: recipient?.name || "Unknown",
      recipientPhone: args.fromPhone,
      messageContent: args.messageContent,
      language: "en", // Default, could be detected
      status: "delivered", // Inbound messages are already delivered
      twilioMessageSid: args.twilioMessageSid,
      sentAt: now,
      deliveredAt: now,
      segmentCount: Math.ceil(args.messageContent.length / 160),
      costCredits: 0, // Inbound messages don't cost credits
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Bulk send to multiple recipients
 * Creates individual message records for each recipient
 */
export const sendBulk = mutation({
  args: {
    recipientIds: v.array(v.id("smsRecipients")),
    templateId: v.optional(v.id("smsTemplates")),
    messageContent: v.string(),
    sentBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const messageIds: string[] = [];
    const segmentCount = Math.ceil(args.messageContent.length / 160);

    for (const recipientId of args.recipientIds) {
      const recipient = await ctx.db.get(recipientId);
      if (!recipient || recipient.optedOut || recipient.status !== "active") {
        continue; // Skip invalid or opted-out recipients
      }

      const messageId = await ctx.db.insert("smsMessages", {
        recipientType: recipient.recipientType,
        recipientId: recipientId,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        templateId: args.templateId,
        messageContent: args.messageContent,
        language: recipient.preferredLanguage,
        status: "sent", // Phase 2: mock sent
        sentAt: now,
        segmentCount,
        costCredits: segmentCount,
        sentBy: args.sentBy,
        createdAt: now,
        updatedAt: now,
      });

      messageIds.push(messageId);

      // Update recipient's last contacted
      await ctx.db.patch(recipientId, {
        lastContactedAt: now,
        messageCount: recipient.messageCount + 1,
      });
    }

    // Increment template usage if used
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        await ctx.db.patch(args.templateId, {
          usageCount: template.usageCount + messageIds.length,
          lastUsedAt: now,
        });
      }
    }

    return {
      sent: messageIds.length,
      messageIds,
    };
  },
});
