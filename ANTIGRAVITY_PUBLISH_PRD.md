# **Product Requirements Document: Go Happy Rides Public Dispatch**

**Project:** Public Dispatch Manifest (Publish to Web)
**Author:** Antigravity (derived from Gemini brainstorm)
**Date:** December 11, 2025
**Status:** Planned

## **1. Overview**

This feature allows the Dispatch Admin to "Publish" the daily driver-child assignments to a public, read-only web page. This eliminates the need for drivers/schools/parents to log in to the admin system to see the daily roster.

We will use **Convex** as the synchronization engine and **Expo Router Web** (Netlify) as the hosting platform.

## **2. Architecture**

### **2.1 Data Flow**
1.  **Admin (Mobile/Web):** Reviews "Assignments" Report.
2.  **Action:** Admin clicks "Publish to Web".
3.  **Convex:** Accepts the unified assignment data, generates a unique "slug" (e.g., `2025-12-11-am`), and stores a sanitized snapshot in `public_manifests` table.
4.  **Viewer (Web):** Navigates to `https://[app-url]/public/2025-12-11-am`.
5.  **Frontend:** Fetches the snapshot from Convex and renders the list of drivers and children.

### **2.2 Security Model**
-   **Sanitization:** The `public_manifests` table contains *copies* of data, not references to private tables. Only `firstName`, `lastInitial`, `school`, and `grade` are stored. Sensitive fields (phone numbers, addresses) are strictly excluded.
-   **Read Access:** The `public_manifests` table is queryable by anyone with the valid slug. It relies on the "Capability URL" security model (possession of the link = access).

## **3. Implementation Plan**

### **3.1 Database Schema (`convex/schema.ts`)**

We need a new table to store the published snapshots.

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables

  /**
   * Public Manifests - Sanitized snapshots of daily dispatch
   * ACCESSIBLE BY PUBLIC (Read-only)
   */
  public_manifests: defineTable({
    slug: v.string(),        // e.g., "2025-12-11-am" (primary key equivalent)
    date: v.string(),        // YYYY-MM-DD
    period: v.string(),      // "AM" or "PM"
    
    // The simplified, sanitized payload
    assignments: v.array(v.object({
      driverName: v.string(),
      children: v.array(v.object({
        childName: v.string(), // First Name + Last Initial
        schoolName: v.string(),
        grade: v.string(),
        // colorCode: v.optional(v.string()) // Nice-to-have for visualization
      }))
    })),
    
    publishedAt: v.number(),
    publishedBy: v.optional(v.string()), // User ID of publisher
    viewCount: v.number(), // Track engagement
  }).index("by_slug", ["slug"]),
});
```

### **3.2 Backend Logic (`convex/publish.ts`)**

New file to handle publishing and public fetching.

-   `mutation publishManifest({ date, period, assignments })`
    -   Generates slug.
    -   Upserts into `public_manifests`.
    -   Returns the generated slug.
-   `query getPublicManifest({ slug })`
    -   Fetches data for the public page.
    -   (Optional) Increments view count (would need to be a mutation or internal action).

### **3.3 Frontend Components**

1.  **Extract `DriverCard`**: Refactor `components/DriverChildReport.tsx` to extract the card UI into `components/DriverCard.tsx` so it can be reused on the public page.
2.  **Public Page (`dispatch-app/app/public/[slug].tsx`)**:
    -   A new lightweight page layout (no auth required).
    -   Uses `useQuery(api.publish.getPublicManifest, { slug })`.
    -   Renders the list of `DriverCard`s.
3.  **Admin UI Update**:
    -   Add "Publish" button to `DriverChildReport.tsx`.
    -   On click -> call `publishManifest`.
    -   On success -> Show modal with link `https://[app]/public/[slug]` and "Copy to Clipboard" button.

### **3.4 Routing & Netlify**
-   Ensure `app/public/[slug].tsx` works with Expo Router's dynamic routing.

## **4. Success Criteria**
-   Admin can publish an AM/PM report in < 2 seconds.
-   Public link loads the manifest without logging in.
-   "Unknown" grades/data do not appear (leveraging previous fix).
-   Updates to the report in Admin can be "Re-published" instantly.
