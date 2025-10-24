/**
 * Convex Client Configuration
 * 
 * Shared Convex backend with:
 * - Go Happy Cab POC (React-Vite)
 * - Driver Mobile Dashboard (React Native)
 * 
 * This enables real-time sync across all apps using the same database.
 */

import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

// Get Convex URL from environment
// Format: EXPO_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
const convexUrl = 
  Constants.expoConfig?.extra?.convexUrl || 
  process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable.\n" +
    "Please add it to .env.local:\n" +
    "EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
  );
}

// Create Convex client with WebSocket support
export const convex = new ConvexReactClient(convexUrl, {
  // Enable verbose logging in development
  verbose: __DEV__,
});

export default convex;

