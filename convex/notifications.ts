"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Expo } from "expo-server-sdk";

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
            console.error(`Push token ${args.expoPushToken} is not a valid Expo push token`);
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
            const tickets = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                    console.log("Notification sent:", ticketChunk);
                } catch (error) {
                    console.error("Error sending notification chunk:", error);
                }
            }

            return tickets;
        } catch (error) {
            console.error("Error sending push notification:", error);
            throw new Error("Failed to send push notification");
        }
    },
});
