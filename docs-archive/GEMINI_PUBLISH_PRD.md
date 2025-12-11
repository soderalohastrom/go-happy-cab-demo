# **Product Requirements Document: Go Happy Rides Dispatch Sync**

**Project:** Live Dispatch Dashboard & Web Sync

**Stack:** Expo Router (React Native), Convex DB, Netlify

**Date:** December 11, 2025

**Status:** Draft

## **1\. Executive Summary**

The goal is to extend the existing "Go Happy Rides" Expo app to allow administrators to "Publish" the daily ride manifest to a secure, read-only web URL. This allows dispatchers, schools, or drivers to view the live dashboard (created in the PoC) without needing the full mobile app or admin credentials.

We will leverage **Convex DB** as the synchronization engine. The Expo App will act as the "Writer" (Publisher), and the Netlify Web App will act as the "Reader" (Subscriber).

## **2\. User Stories**

### **2.1 The Admin (Mobile App User)**

* **Generate & Review:** I want to generate the assignment CSV/Report within the app (existing functionality).  
* **Publish:** I want a "Publish to Web" button on the Report screen.  
* **Share:** After publishing, I want a shareable link (e.g., gohappyrides.com/dispatch/2025-12-11-am) copied to my clipboard to send to staff.  
* **Update:** If I change a driver assignment in the app and click "Republish" (or auto-sync), the web view should update immediately.

### **2.2 The Viewer (Web User)**

* **Access:** I want to open the link sent by the Admin and see the "Card View" dashboard immediately.  
* **Real-time:** If the Admin changes a ride, I want to see the card update on my screen without refreshing.  
* **Interaction:** I want to search/filter the dashboard and copy driver manifests (existing PoC features).

## **3\. Technical Architecture**

### **3.1 Data Flow**

1. **Expo App (Admin):** Calculates the Ride Assignments (grouping drivers/kids).  
2. **Convex Mutation:** The App calls a mutation publishManifest({ date, shift, assignments }).  
3. **Convex DB:** Stores the structured JSON data in a public\_manifests table.  
4. **Netlify Web App:** A page at /dispatch/\[date\] calls a Convex Query getManifest({ date }).  
5. **React UI:** Renders the "Card View" using the live data from Convex.

### **3.2 Security Strategy**

* **Internal Data:** Your drivers and kids tables remain private/protected.  
* **Public Data:** We create a specific table public\_manifests that contains *only* the data needed for display (Driver Name, Kid First Name, School). This effectively "sanitizes" the data before it hits the web.  
* **Access Control:** The getManifest query can be public (unauthenticated) OR protected by a shared "Daily Password" if higher security is needed.

## **4\. Implementation Guide (For LLM Partner)**

### **Step 1: Convex Schema Update**

Add a table to store the finalized snapshots of the dispatch board.

// convex/schema.ts  
import { defineSchema, defineTable } from "convex/server";  
import { v } from "convex/values";

export default defineSchema({  
  // ... existing tables ...

  // New Table for Web View  
  public\_manifests: defineTable({  
    date: v.string(),        // YYYY-MM-DD  
    shift: v.string(),       // "AM" or "PM"  
    slug: v.string(),        // Unique URL key, e.g., "2025-12-11-am"  
    lastUpdated: v.number(), // Timestamp  
      
    // The simplified payload for the frontend  
    assignments: v.array(v.object({  
      driverId: v.optional(v.string()),   
      driverName: v.string(),  
      passengers: v.array(v.object({  
        name: v.string(),  
        school: v.optional(v.string()),  
        notes: v.optional(v.string()),  
      }))  
    }))  
  }).index("by\_slug", \["slug"\]),  
});

### **Step 2: Convex Backend Functions**

Create the API endpoints to Read and Write this data.

// convex/dispatch.ts  
import { mutation, query } from "./\_generated/server";  
import { v } from "convex/values";

// CALLED BY: Expo App (Admin)  
export const publish \= mutation({  
  args: {  
    date: v.string(),  
    shift: v.string(),  
    assignments: v.array(v.any()) // Validation matched to schema above  
  },  
  handler: async (ctx, args) \=\> {  
    const slug \= \`${args.date}-${args.shift}\`.toLowerCase();  
      
    // Check if exists, update or create  
    const existing \= await ctx.db  
      .query("public\_manifests")  
      .withIndex("by\_slug", (q) \=\> q.eq("slug", slug))  
      .first();

    if (existing) {  
      await ctx.db.patch(existing.\_id, {  
        assignments: args.assignments,  
        lastUpdated: Date.now(),  
      });  
      return existing.slug;  
    } else {  
      await ctx.db.insert("public\_manifests", {  
        slug,  
        date: args.date,  
        shift: args.shift,  
        assignments: args.assignments,  
        lastUpdated: Date.now(),  
      });  
      return slug;  
    }  
  },  
});

// CALLED BY: Netlify Web App (Public)  
export const getBySlug \= query({  
  args: { slug: v.string() },  
  handler: async (ctx, args) \=\> {  
    return await ctx.db  
      .query("public\_manifests")  
      .withIndex("by\_slug", (q) \=\> q.eq("slug", args.slug))  
      .first();  
  },  
});

### **Step 3: Expo App Integration**

* **Locate:** The screen generating the Report/CSV.  
* **Action:** Add a "Send to Web" button.  
* **Logic:**  
  1. Transform the CSV/Report data into the JSON structure expected by assignments.  
  2. Call await publishMutation({ ... }).  
  3. On success, show an Alert: "Published\! Link copied." and use Clipboard.setString(url).

### **Step 4: Web Frontend (Netlify)**

Since you use Expo Router, you are likely already exporting a web version.

* **Route:** Create a new route app/dispatch/\[slug\].tsx (or similar file structure).  
* **Logic:**  
  // app/dispatch/\[slug\].tsx  
  import { useLocalSearchParams } from 'expo-router';  
  import { useQuery } from 'convex/react';  
  import { api } from '@/convex/\_generated/api';  
  import { DriverCard } from '@/components/DriverCard'; // The component from the PoC

  export default function PublicDispatchPage() {  
    const { slug } \= useLocalSearchParams();  
    const manifest \= useQuery(api.dispatch.getBySlug, { slug: slug as string });

    if (\!manifest) return \<Loading /\>;

    return (  
      \<div className="p-8"\>  
         \<Header title={\`Dispatch: ${manifest.date} (${manifest.shift})\`} /\>  
         \<div className="grid ..."\>  
           {manifest.assignments.map(group \=\> (  
             \<DriverCard   
               key={group.driverName}  
               driverName={group.driverName}   
               passengers={group.passengers}   
             /\>  
           ))}  
         \</div\>  
      \</div\>  
    );  
  }

## **5\. Deployment Strategy**

* **Netlify Rewrite:** Ensure your netlify.toml handles the deep links for Expo Router Web.  
* **CI/CD:** Commit to GitHub \-\> Netlify builds the web version \-\> Live.

## **6\. Future Enhancements (Post-MVP)**

* **Driver View:** A specific URL for drivers (/dispatch/driver/\[driverId\]) that shows ONLY their kids.  
* **SMS Integration:** Convex Action to text the link to all drivers automatically.