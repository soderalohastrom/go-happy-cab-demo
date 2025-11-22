# Import Strategy: Drivers, Children, and Assignments

## Goal
Transition from mock data to real-world data by importing Drivers and Children from Google Sheets and establishing the correct Driver-Child assignments.

## Data Sources
- **Drivers Sheet:** Contains Driver details (Name, Email, Phone, etc.).
- **Children Sheet:** Contains Child details (Name, Address, School, etc.) and **Assigned Driver**.

## Pre-requisites
1.  **Cleanup:** Remove all mock data (Children, Routes, Drivers except Scott). [In Progress]
2.  **Schema:** Ensure `drivers` and `children` tables are ready. [Done]

## Import Process

### 1. Import Drivers
- **Source:** Drivers Sheet.
- **Action:** Create `drivers` records.
- **Key Fields:** `firstName`, `lastName`, `email`, `phone`.
- **Identity:** Use `email` or `firstName` + `lastName` as unique identifier to prevent duplicates.

### 2. Import Children
- **Source:** Children Sheet.
- **Action:** Create `children` records.
- **Key Fields:** `firstName`, `lastName`, `studentId`, `schoolId`.
- **Identity:** Use `studentId` or `firstName` + `lastName`.

### 3. Create Assignments (Routes)
- **Source:** Children Sheet (or separate Assignments Sheet).
- **Logic:**
    1.  Iterate through each row in the source sheet.
    2.  **Find Child:** Lookup the `childId` in Convex using `studentId` or Name.
    3.  **Find Driver:** Read the "Assigned Driver" column. Lookup the `driverId` in Convex using the Driver Name.
    4.  **Create Route:**
        - Insert into `routes` table.
        - Fields:
            - `driverId`: Found Driver ID.
            - `childId`: Found Child ID.
            - `date`: Target date (e.g., "2025-11-24").
            - `period`: "AM" and "PM" (create two routes if needed).
            - `type`: "pickup" (AM) / "dropoff" (PM).
            - `status`: "scheduled".

## Matching Logic Details
- **Driver Matching:**
    - The import script must fuzzy match or exact match the "Driver Name" from the sheet to the `firstName` + `lastName` in the `drivers` table.
    - *Recommendation:* Ensure the Google Sheet uses exact names matching the Driver Import sheet.

- **Child Matching:**
    - If assignments are in the same row as Child data, we have the Child context immediately.
    - If assignments are in a separate sheet, match by `studentId`.

## Verification
- Check `routes` table count matches the number of assigned children * 2 (AM/PM).
- Verify "Scott Soderstrom" remains active and has his assigned routes if applicable.
