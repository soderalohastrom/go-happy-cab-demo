/**
 * Twilio Integration Actions
 *
 * Handles SMS sending via Twilio API using Convex actions.
 * Actions run on Convex servers and can make external API calls.
 *
 * Environment variables required:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (+14158002273)
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Send a single SMS via Twilio
 *
 * This action is called by smsMessages.send mutation after creating the message record.
 * It makes the actual HTTP request to Twilio's API.
 */
export const sendSMS = action({
  args: {
    messageId: v.id("smsMessages"),
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables."
      );
    }

    try {
      // Twilio API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      // Basic auth header (use btoa for Convex runtime)
      const auth = btoa(`${accountSid}:${authToken}`);

      // Make request to Twilio
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: args.to,
          From: fromNumber,
          Body: args.body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Twilio API error: ${data.message || "Unknown error"}`
        );
      }

      // Update message with Twilio SID
      await ctx.runMutation(api.smsMessages.updateStatus, {
        id: args.messageId,
        status: "sent",
        twilioMessageSid: data.sid,
        sentAt: new Date().toISOString(),
      });

      return {
        success: true,
        twilioSid: data.sid,
        status: data.status,
      };
    } catch (error: any) {
      // Update message as failed
      await ctx.runMutation(api.smsMessages.updateStatus, {
        id: args.messageId,
        status: "failed",
        errorMessage: error.message,
        failedAt: new Date().toISOString(),
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Send bulk SMS with rate limiting
 *
 * Sends multiple messages with a delay between each to respect Twilio rate limits.
 * For 10DLC numbers: ~100 msg/sec after A2P registration, ~1 msg/sec before.
 */
export const sendBulkSMS = action({
  args: {
    messages: v.array(
      v.object({
        messageId: v.id("smsMessages"),
        to: v.string(),
        body: v.string(),
      })
    ),
    delayMs: v.optional(v.number()), // Delay between messages (default 1000ms for unregistered)
  },
  handler: async (ctx, args) => {
    const delay = args.delayMs ?? 1000; // 1 second default
    const results = [];

    for (const message of args.messages) {
      const result = await ctx.runAction(api.twilioActions.sendSMS, {
        messageId: message.messageId,
        to: message.to,
        body: message.body,
      });

      results.push({
        messageId: message.messageId,
        to: message.to,
        ...result,
      });

      // Wait before sending next message (except for last one)
      if (message !== args.messages[args.messages.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      total: args.messages.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Test SMS - Send a test message to verify Twilio integration
 *
 * Simple test function to send a message to any phone number.
 * Use this to verify your Twilio credentials are working.
 */
export const testSMS = action({
  args: {
    to: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "Twilio credentials not configured. Check environment variables."
      );
    }

    const testMessage = args.message ||
      "🚗 Go Happy Cab Test: Your SMS integration is working! Sent from Convex + Twilio.";

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = btoa(`${accountSid}:${authToken}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: args.to,
          From: fromNumber,
          Body: testMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: `Twilio API error: ${data.message || "Unknown error"}`,
          details: data,
        };
      }

      return {
        success: true,
        twilioSid: data.sid,
        status: data.status,
        to: data.to,
        from: data.from,
        message: "SMS sent successfully! Check your phone.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
