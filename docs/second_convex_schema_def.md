**Convex DB Schema Specification**

**Goal:** To create a robust data model for a Dispatch app scheduler that tracks child pick-up times, school schedules, non-school days, and district-based rates, enabling a pull-down selector for children to associate them with schools and look up rates.

---

1. **`districts` Table**

   This table will store information about each school district, including the rates charged.  
   * **Source Data:** "School Contacts" sheet (`School District`, `Client Name` columns).  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `districtName`: `String` (e.g., "Tamalpais Union High School District", "Autism Non-Public school") \- **Unique Index**  
     * `clientName`: `String` (e.g., "Tamalpais Union High School District", "Petaluma City School, Kentfield S...")  
     * `rate`: `Number` (The rate charged per district, to be populated manually or from another source)  
2. **`schools` Table**

   This table will store static information about each school and link to its district.  
   * **Source Data:** "School Contacts" sheet (`School`, `Street Address`, `City`, `State`, `Zip`, `Office Phone`), "Non School Days" sheet (`First Day`, `Last Day`).  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `districtId`: `Id` (Reference to `districts._id`)  
     * `schoolName`: `String` (e.g., "A Better Chance School") \- **Unique Index**  
     * `streetAddress`: `String` (e.g., "4138 Lakeside Drive")  
     * `city`: `String` (e.g., "Richmond")  
     * `state`: `String` (e.g., "CA")  
     * `zip`: `String` (e.g., "94806")  
     * `officePhone`: `String` (e.g., "510-262-1500")  
     * `firstDay`: `String` (Date format, e.g., "2025-08-12")  
     * `lastDay`: `String` (Date format, e.g., "2026-06-12")  
3. **`school_contacts` Table**

   This table will store contact information associated with each school.  
   * **Source Data:** "School Contacts" sheet (`Primary First Name`, `Primary Last Name`, `Primary Contact Title`, `Primary Contact Phone`, `Primary Contact Email`, `Secondary First Name`, etc.).  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `schoolId`: `Id` (Reference to `schools._id`)  
     * `contactType`: `String` (e.g., "Primary", "Secondary", "Afterschool")  
     * `firstName`: `String`  
     * `lastName`: `String`  
     * `title`: `String`  
     * `phone`: `String`  
     * `email`: `String`  
4. **`school_schedules` Table**

   This table will store the daily schedule information for each school, including regular and minimum day times.  
   * **Source Data:** "Non School Days" sheet (`AM START`, `PM Release`, `Min Day Dismissal Times`, `Minimum Days`, `Early Release`, `PM Aftercare`).  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `schoolId`: `Id` (Reference to `schools._id`)  
     * `amStartTime`: `String` (Time format, e.g., "08:30:00")  
     * `pmReleaseTime`: `String` (Time format, e.g., "14:30:00")  
     * `minDayDismissalTime`: `String` (Time format, optional, e.g., "13:00:00")  
     * `minimumDays`: `String` (e.g., "Varies", "Friday", "Wed")  
     * `earlyRelease`: `String` (Time format, optional, e.g., "13:00:00")  
     * `pmAftercare`: `String` (Time format, optional, e.g., "13:00:00")  
5. **`non_school_days` Table**

   This table will store all the non-school days for each school as individual dates.  
   * **Source Data:** "Non School Days" sheet (columns like `Aug`, `Sept`, `Oct`, etc.).  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `schoolId`: `Id` (Reference to `schools._id`)  
     * `date`: `String` (Date format, e.g., "2025-09-01") \- **Index**  
     * `description`: `String` (Optional, e.g., "Holiday", "Staff Development Day")  
6. **`children` Table**

   This table will store information about each child and their associated school.  
   * **Source Data:** This data is external to your current sheets and will need to be provided separately.  
   * **Schema:**  
     * `_id`: `Id` (Convex's unique ID, automatically generated)  
     * `schoolId`: `Id` (Reference to `schools._id`)  
     * `childName`: `String` (e.g., "Alice Smith")  
     * `guardianName`: `String`  
     * `contactPhone`: `String`  
     * `notes`: `String` (Any specific pick-up instructions, allergies, etc.)

---

**Interconnectivity and Data Flow**

1. **Child to School Association:**  
   * In your app, the pull-down selector for each child will populate the `schoolId` field in the `children` table. This `schoolId` will directly link a child to a specific school.  
2. **Rate Lookup by District:**  
   * When a child is associated with a school (via `children.schoolId`), you can then:  
     * Look up the `school` document using `children.schoolId`.  
     * From the `school` document, get the `districtId`.  
     * Look up the `district` document using `school.districtId`.  
     * The `district.rate` will then provide the rate charged for that child's district.  
3. **Daily Sync to Drivers:**  
   * For a daily sync, you would query the `children` table to get all children scheduled for pick-up.  
   * For each child, you would:  
     * Retrieve their associated `school` document.  
     * Retrieve the `school_schedules` for that `schoolId`.  
     * Check the `non_school_days` table for the current date and the `schoolId` to determine if it's a non-school day.  
     * Based on the `school_schedules` and `non_school_days`, calculate the precise AM start and PM release times for that day.  
   * This aggregated information (child details, school times, non-school day status) can then be sent to drivers.

---

**Populating Convex Tables (CSV or Script)**

You would primarily use a script (like the Python conceptual outline provided previously) to transform your Google Sheets data into CSV files, which can then be imported into Convex.

**Key Steps for Populating:**

1. **Export Sheets to CSV:** Export both "School Contacts" and "Non School Days" sheets as CSV files.  
2. **Process "School Contacts" for `districts` and `schools`:**  
   * **`districts.csv`:** Extract unique `School District` and `Client Name` combinations. You'll need to manually add the `rate` for each district.  
   * **`schools.csv`:** Extract `School`, `Street Address`, `City`, `State`, `Zip`, `Office Phone`. You'll need to link each `school` to its `districtId` after importing `districts`.  
   * **`school_contacts.csv`:** Parse the primary, secondary, and afterschool contact information for each school and create separate entries for each contact type.  
3. **Process "Non School Days" for `school_schedules` and `non_school_days`:**  
   * **`school_schedules.csv`:** Extract `AM START`, `PM Release`, `Min Day Dismissal Times`, `Minimum Days`, `Early Release`, `PM Aftercare` for each school. Link to `schoolId`.  
   * **`non_school_days.csv`:** Iterate through the monthly non-school day columns. For each school and each non-school day entry, create a separate record with `schoolId`, `date`, and `description`.  
4. **Convex Import Order:**  
   * Import `districts.csv` first.  
   * Then, process `schools.csv` to include the `districtId` (by looking up the `_id` from the imported `districts` table based on `districtName`) before importing `schools.csv`.  
   * Similarly, process `school_contacts.csv`, `school_schedules.csv`, and `non_school_days.csv` to include the correct `schoolId` (by looking up the `_id` from the imported `schools` table based on `schoolName`) before importing them.  
   * The `children` table will be populated as users add children in your app.

This structured approach will provide a clear and interconnected data model for your Convex DB, enabling efficient data management for your Dispatch app.