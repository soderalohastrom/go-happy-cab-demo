# Go Happy Dispatch & Driver System Overview (Pre-Launch)
GEMINI 
**Created:** December 5, 2025
**Scope:** Core Logic Analysis for Child/Driver Pairings & Rollout
**Ref:** `DRIVER_ROLLOUT_PLAN.md`

This document provides a deep-dive analysis of the system's core logic regarding scheduling, relationships, and data flow between the Dispatch Dashboard and the Driver App, ensuring the system is sound for the upcoming rollout.

---

## 1. The Assignment Lifecycle & Data Transitions

### How Data Moves (Copy Logic)
When you populate a new day (e.g., "Tomorrow") from a previous day, the system doesn't just "move" data; it performs a **Smart Copy**.

*   **Mechanism**: The `copyFromLastValidDay` mutation (in `assignments.ts`) is the engine.
*   **Intelligence**: 
    *   It looks backwards from your target date (up to 14 days) to find the *last valid schedule*. This means if you skip a weekend or a holiday, it automatically grabs the correct previous Friday's data.
    *   **Cloning**: It creates *new* records for the target date.
    *   **Independence**: Once copied, the new day's routes are completely independent. Changing "Today" does not affect "Yesterday" or "Tomorrow".
*   **Convex Implementation**:
    *   Queries `routes` using the `by_date_period` index.
    *   Iterates through valid assignments.
    *   Inserts new records into `routes` table with `date = targetDate`.
    *   Generates `auditLogs` for the bulk action.

### The "Day Forward" Chain
*   **Question**: *How many days ahead can I make pairings?*
*   **Answer**: **Indefinitely.**
    *   You can click "Copy Last Day" -> "Next Day" -> "Copy Last Day" recursively.
    *   **Logic**: The system always looks for the *most recent* data relative to the day you are on.
    *   **Risk**: If you plan 5 days ahead, then realize you need to swap a driver for the whole week, you must update *all 5 days* individually. There is currently no "Future Rippling" feature (where a change today updates all future recurring instances).

---

## 2. Child ↔ Driver Relationships (Drag & Drop Logic)

When you drag a child onto a driver in the Dispatch UI, specific backend logic (`routes:create`) triggers.

### The Connection
*   A record is created in the `routes` table:
    ```typescript
    {
      date: "2025-12-05",  // Locked to the dashboard view date
      period: "AM",        // or "PM"
      childId: "...",
      driverId: "...",
      status: "scheduled"
    }
    ```

### Constraints & Validation
*   **Duplicate Check**: The system prevents assigning the *same child* to multiple drivers for the *same period* on the *same date*. (Index: `by_child_date_period`).
*   **Carpool Limit**: Hard-coded check limits a driver to **3 active assignments** per period.
    *   *Error*: "Driver already has 3 children assigned".
*   **School Closures**: Soft check. It warns but allows creation if the school is marked closed.

### Time & Modifiability
*   **Time Travel**: The backend currently **does not** prevent editing past regular routes.
    *   *Scenario*: It is 10:00 AM. You realize a 9:00 AM pickup was wrong.
    *   *Result*: You **can** theoretically swap the driver in Dispatch.
    *   *Effect*: The history is rewritten. If the original driver already marked it "Completed", and you swap it, the new driver will see a "pending" route for a time that has passed.
*   **Recommendations**: 
    1.  **Freeze Past**: Consider UI logic to disable dragging for time-periods that have passed (e.g., cannot edit AM after 11 AM).
    2.  **Audit Trail**: The system *does* log every change (`auditLogs`), so you can trace who moved a child after-the-fact.

---

## 3. The Driver App Experience

### Visibility Scope
*   **The "Today" View**: The Driver App is designed to be hyper-focused.
    *   **Query**: It fetches routes specifically for user's `driverId` and the `currentDate`.
    *   **Restriction**: Drivers **cannot** browse history or future schedules in the app. This is by design to reduce cognitive load and prevent confusion ("Wait, is this pickup for today or tomorrow?").
    *   **No "Next Day"**: Drivers cannot see tomorrow's routes until the date physically changes (or their timezone crosses midnight).

### Real-Time Updates
*   **Push Notifications**: When you assign a child (even 10 minutes before pickup), the driver receives:
    *   **Push**: "New Route: Picking up Zander at 8:30 AM"
    *   **In-App**: The list auto-refreshes (via Convex reactivity).
*   **Changes**: If you remove a child, the route disappears from their list (and they get a cancellation push).

---

## 4. Pre-Launch Critical Checks

Before the drivers download the app on Training Day:

1.  **Employee ID Consistency**: Ensure the `employeeId` in Convex matches exactly what you tell them to type (e.g., `D-408` vs `408`).
2.  **Date Alignment**: Ensure the "Launch Day" schedule in Dispatch is populated and finalized.
    *   *Tip*: Do not "practice" on the actual Launch Date unless you plan to wipe it.
3.  **Active Status**: Drivers must be marked `active: true` in Convex to log in.
4.  **Clerk IDs**: Run the script to ensure every Convex driver record has a `clerkId` linked to their account. Without this, they will log in but see **empty** screens (data access denied).

## Summary
The system is robust for daily operations. The "Smart Copy" allows for easy planning, but the lack of "Future Rippling" means you should finalize your "Template Day" before copying it forward too far. The Driver App is strictly "Here and Now," protecting drivers from information overload.
