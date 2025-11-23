"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Expo } from "expo-server-sdk";
import { internal } from "./_generated/api";

const expo = new Expo();

/**
 * Sends a push notification to a driver.
 * Uses the Expo Server SDK to send notifications to the Expo Push Service.
 */
export const sendRouteNotification = action({
    args: {
        expoPushToken: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        if (!Expo.isExpoPushToken(args.expoPushToken)) {
            console.error(`Invalid Expo Push Token: ${args.expoPushToken}`);
            return;
        }

        const messages = [
            {
                to: args.expoPushToken,
                sound: "default" as const,
                title: args.title,
                body: args.body,
                data: args.data,
            },
        ];

        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
            console.log("✅ Notification sent successfully");
        } catch (error) {
            console.error("❌ Error sending notification:", error);
        }
    },
});

import { getMessage } from "./localization";

// ... existing code ...

export const sendReminder = action({
    args: {
        routeId: v.id("routes"),
        driverId: v.id("drivers"),
        minutesBefore: v.number(),
    },
    handler: async (ctx, args) => {
        // 1. Get driver info (we need the token)
        const driver = await ctx.runQuery(internal.drivers.getById, { driverId: args.driverId });
        if (!driver || !driver.expoPushToken) {
            console.log("⚠️ Driver has no push token, skipping reminder.");
            return;
        }

        // 2. Get route info
        const route = await ctx.runQuery(internal.routes.getById, { routeId: args.routeId });
        if (!route || route.status !== "scheduled") {
            console.log("⚠️ Route not scheduled or not found, skipping reminder.");
            return;
        }

        // 3. Send notification
        const title = getMessage(driver.primaryLanguage, "reminderTitle");
        const body = getMessage(driver.primaryLanguage, "reminderBody", route.child?.firstName || "Child", args.minutesBefore);

        await ctx.runAction(internal.notifications.sendRouteNotification, {
            expoPushToken: driver.expoPushToken,
            title,
            body,
            data: { routeId: args.routeId, type: "reminder" },
        });
    },
});
