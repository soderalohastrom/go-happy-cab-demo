# Handoff to Claude Code: Schools, Drivers & Children Data

## 1. Schema Updates (Convex)
I have significantly expanded the schema to support the real data import. Please update your UI forms (Modals) to include these new fields.

### Drivers Table (`drivers`)
*   **Name:** `middleName` (Optional) - *Please add to Name input or separate field.*
*   **Address:** `address` object (`street`, `street2`, `city`, `state`, `zip`).
*   **Compliance:** `ssn`, `itin`, `licenseNumber`, `fingerprintsOnFile` (boolean), `fingerprintsVerified` (boolean), `tbTestVerified` (boolean), `taxiApplicationStatus`, `mvrStatus`.
*   **Details:** `startDate`, `specialEquipment` (e.g., "TCP").

### Children Table (`children`)
*   **School:** `schoolId` (Link to `schools` table).
*   **Parents:** `parent1`, `parent2` objects (firstName, lastName, phone). *Note: These are currently stored on the child record for simplicity, but we also have a `parents` table.*
*   **School Staff:** `teacher` object, `caseManager` object.
*   **Medical/Safety:** `seizureProtocol` (boolean), `boosterSeat` (boolean), `notes` (text).
*   **Steady Pairings:** `defaultAmDriverId`, `defaultPmDriverId` (Links to `drivers`).

## 2. UI Requirements & Suggestions

### A. Child Edit Modal
*   **School Dropdown:** Please add a dropdown to select the **School**. This should query the `schools` table.
    *   *Why:* Startup times and reporting depend on the school location.
    *   *Bonus:* If a school is already selected in the filter or context, pre-fill it.
*   **Expanded Fields:** Add inputs for the new fields listed above (Parents, Teacher, Notes, etc.). "Columns are cheap" - let's show them!
*   **Steady Pairings:** Consider showing (and allowing edit of) the "Default AM Driver" and "Default PM Driver". This helps with the "Copy Previous Day" logic.

### B. Dispatch Screen
*   **"Copy Previous Day" Logic:**
    *   The user wants to "pull forward" routes.
    *   If "Previous Day" is empty, we can fallback to generating routes from the `defaultAmDriverId` / `defaultPmDriverId` on the Child records.
    *   *Current Status:* I have populated these default driver IDs for ~60 children based on the import.

## 3. Data Import Status
*   **Drivers:** 77 imported.
*   **Children:** 112 imported.
*   **Routes:** 105 created for "Today" (Nov 21, 2025).
*   **Pairings:** 61 Children have steady pairings established.

## 4. Next Steps for UI
*   Implement the School Dropdown.
*   Expand the Modals.
*   Wire up the "Copy Previous Day" button to use a mutation that duplicates routes (or generates from defaults).
