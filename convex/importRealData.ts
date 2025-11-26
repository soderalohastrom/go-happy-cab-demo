/**
 * Real Production Data Import Script
 *
 * Imports children and drivers from CSV exports generated from Google Sheets.
 * Handles badge-based route assignments and GPS coordinates.
 *
 * USAGE:
 * 1. Export Google Sheets as children.csv and drivers.csv
 * 2. Copy CSV content
 * 3. Run: npx convex run importRealData:importChildren --csv "paste CSV here"
 * 4. Run: npx convex run importRealData:importDrivers --csv "paste CSV here"
 * 5. Run: npx convex run importRealData:createInitialRoutes
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least header row and one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parse GPS coordinate string to number
 */
function parseCoordinate(coord: string): number | undefined {
  if (!coord || coord === "") return undefined;
  const num = parseFloat(coord);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse comma-separated string into array
 */
function parseArray(str: string): string[] {
  if (!str || str === "") return [];
  return str.split(",").map((item) => item.trim()).filter((item) => item !== "");
}

/**
 * Safe string value - returns undefined if empty
 */
function safeString(str: string): string | undefined {
  return str && str !== "" ? str : undefined;
}

// ============================================================================
// CLEAR DATA (Optional - for fresh imports)
// ============================================================================

export const clearAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear in dependency order
    const tables = [
      "routes",
      "stops",
      "childParentRelationships",
      "children",
      "drivers",
      "parents",
      "auditLogs",
      "dispatchEvents",
      "notifications",
      "messages",
      "scheduleTemplates",
      "dailySummaries",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        totalDeleted++;
      }
    }

    return {
      success: true,
      message: `Cleared ${totalDeleted} records from ${tables.length} tables`,
      deletedCount: totalDeleted,
    };
  },
});

// ============================================================================
// IMPORT CHILDREN
// ============================================================================

export const importChildren = internalMutation({
  args: {
    csv: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const rows = parseCSV(args.csv);

    const imported: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Required fields
        const childId = row.child_id;
        const firstName = row.first_name;
        const lastName = row.last_name;
        const grade = row.grade;
        const schoolName = row.school_name;

        if (!childId || !firstName || !lastName || !grade || !schoolName) {
          errors.push(
            `Row missing required fields: ${JSON.stringify(row)}`
          );
          continue;
        }

        // Parse GPS coordinates
        const homeLat = parseCoordinate(row.home_latitude);
        const homeLng = parseCoordinate(row.home_longitude);
        const schoolLat = parseCoordinate(row.school_latitude);
        const schoolLng = parseCoordinate(row.school_longitude);

        // Parse special needs array
        const specialNeeds = parseArray(row.special_needs);

        // Build child record
        const childData = {
          // Basic Info
          firstName,
          lastName,
          middleName: safeString(row.middle_name),
          preferredName: safeString(row.preferred_name),
          dateOfBirth: row.date_of_birth || "2015-01-01", // Default if missing
          grade,
          studentId: childId,

          // NEW CSV Import Fields
          pickupTime: safeString(row.pickup_time),
          classStartTime: safeString(row.class_start_time),
          classEndTime: safeString(row.class_end_time),
          rideType: safeString(row.ride_type),
          pickupNotes: safeString(row.pickup_notes),
          homeLanguage: safeString(row.home_language),

          // NEW: Capture assigned_badge_id for carpool auto-pairing
          assignedBadgeId: safeString(row.assigned_badge_id),

          // School Info
          schoolId: safeString(row.school_jurisdiction),
          schoolName,

          // Home Address
          homeAddress: row.home_address
            ? {
                street: row.home_address,
                city: row.home_address.includes(",")
                  ? row.home_address.split(",")[1]?.trim() || ""
                  : "",
                state: "CA",
                zip: row.home_address.match(/\d{5}/)?.[0] || "",
                coordinates:
                  homeLat && homeLng
                    ? { latitude: homeLat, longitude: homeLng }
                    : undefined,
                accessInstructions: safeString(row.pickup_notes),
              }
            : undefined,

          // School Address
          schoolAddress: row.school_address
            ? {
                street: row.school_address,
                city: row.school_address.includes(",")
                  ? row.school_address.split(",")[1]?.trim() || ""
                  : "",
                state: "CA",
                zip: row.school_address.match(/\d{5}/)?.[0] || "",
                coordinates:
                  schoolLat && schoolLng
                    ? { latitude: schoolLat, longitude: schoolLng }
                    : undefined,
                dropoffLocation: safeString(row.pickup_notes),
                pickupLocation: safeString(row.pickup_notes),
              }
            : undefined,

          // Special Needs
          specialNeeds: specialNeeds.length > 0 ? specialNeeds : undefined,
          medicalInfo: undefined, // Can be enhanced later

          // Transportation Notes
          pickupInstructions: safeString(row.pickup_notes),
          dropoffInstructions: safeString(row.pickup_notes),
          transportationNotes: safeString(row.notes),

          // Parent References (will link later if needed)
          parentIds: row.parent_name
            ? [row.parent_name.replace(/\s+/g, "_").toLowerCase()]
            : undefined,

          // Status
          active: true,
          photoPermission: true,

          // Metadata
          createdAt: now,
          updatedAt: now,
        };

        await ctx.db.insert("children", childData);
        imported.push(childId);
      } catch (error: any) {
        errors.push(`Failed to import ${row.child_id}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
      message: `Imported ${imported.length} children, ${errors.length} errors`,
    };
  },
});

// ============================================================================
// IMPORT DRIVERS
// ============================================================================

export const importDrivers = internalMutation({
  args: {
    csv: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const rows = parseCSV(args.csv);

    const imported: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Required fields
        const driverId = row.driver_id;
        const badgeId = row.badge_id;
        const firstName = row.first_name;
        const lastName = row.last_name;
        const phone = row.phone;

        if (!driverId || !badgeId || !firstName || !lastName || !phone) {
          errors.push(
            `Row missing required fields: ${JSON.stringify(row)}`
          );
          continue;
        }

        // Build driver record
        const driverData = {
          // Basic Info
          employeeId: badgeId, // Use badge_id as employee ID
          firstName,
          lastName,
          email: row.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gohappycab.com`,
          phone,

          // NEW CSV Import Fields
          primaryLanguage: safeString(row.primary_language),
          availabilityAM: safeString(row.availability_am),
          availabilityPM: safeString(row.availability_pm),
          startDate: safeString(row.start_date),
          specialEquipment: safeString(row.special_equipment),

          // Authentication (optional - drivers set up later)
          pin: undefined,
          biometricEnabled: false,

          // Status
          status: "active" as const,
          role: "driver" as const,

          // Credentials
          licenseNumber: safeString(row.license_number),
          licenseExpiry: "2026-12-31", // Default expiry

          // Emergency Contact (can enhance later)
          emergencyContact: undefined,

          // Performance Metrics (initialized)
          performanceMetrics: {
            totalRoutes: 0,
            onTimeRate: 100,
            safetyScore: 100,
            incidentCount: 0,
            parentRating: 5.0,
          },

          // Metadata
          active: true,
          clerkId: undefined, // Will be set when driver creates account
          createdAt: now,
          updatedAt: now,
        };

        await ctx.db.insert("drivers", driverData);
        imported.push(badgeId);
      } catch (error: any) {
        errors.push(`Failed to import ${row.driver_id}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
      message: `Imported ${imported.length} drivers, ${errors.length} errors`,
    };
  },
});

// ============================================================================
// CREATE INITIAL ROUTES (Badge-based pairing)
// ============================================================================

export const createInitialRoutes = internalMutation({
  args: {
    date: v.optional(v.string()), // Default to next Monday
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Get target date (next Monday or specified date)
    const targetDate =
      args.date || getNextMonday().toISOString().split("T")[0];

    // Get all children and drivers
    const allChildren = await ctx.db.query("children").collect();
    const drivers = await ctx.db.query("drivers").collect();

    if (drivers.length === 0) {
      return {
        success: false,
        message: "No drivers found. Import drivers first.",
      };
    }

    const created: string[] = [];
    const errors: string[] = [];

    // Group children by assignedBadgeId for carpool creation
    const carpoolGroups = new Map<string, typeof allChildren>();
    const childrenWithoutBadge: typeof allChildren = [];

    allChildren.forEach((child) => {
      if (child.assignedBadgeId) {
        if (!carpoolGroups.has(child.assignedBadgeId)) {
          carpoolGroups.set(child.assignedBadgeId, []);
        }
        carpoolGroups.get(child.assignedBadgeId)!.push(child);
      } else {
        childrenWithoutBadge.push(child);
      }
    });

    // Create routes for badge-based carpools
    for (const [badgeId, children] of carpoolGroups.entries()) {
      // Find driver with matching employeeId (badge)
      const driver = drivers.find((d) => d.employeeId === badgeId);

      if (!driver) {
        errors.push(
          `Badge ${badgeId} has no matching driver (${children.length} children affected)`
        );
        continue;
      }

      // Validate max 3 children per carpool
      if (children.length > 3) {
        errors.push(
          `Badge ${badgeId} has ${children.length} children (max 3 allowed)`
        );
        continue;
      }

      // Create routes for each child in the carpool
      for (const child of children) {
        try {
          // Create AM route
          await ctx.db.insert("routes", {
            date: targetDate,
            period: "AM",
            type: "pickup",
            driverId: driver._id,
            childId: child._id,
            status: "scheduled",
            priority: "normal",
            scheduledTime: child.pickupTime || "8:00 AM",
            createdAt: now,
            createdBy: "system_import",
            updatedAt: now,
          });

          // Create PM route
          await ctx.db.insert("routes", {
            date: targetDate,
            period: "PM",
            type: "dropoff",
            driverId: driver._id,
            childId: child._id,
            status: "scheduled",
            priority: "normal",
            scheduledTime: child.classEndTime || "3:00 PM",
            createdAt: now,
            createdBy: "system_import",
            updatedAt: now,
          });

          created.push(
            `${child.firstName} ${child.lastName} → ${driver.firstName} ${driver.lastName} (Badge ${badgeId})`
          );
        } catch (error: any) {
          errors.push(
            `Failed to create route for ${child.firstName} ${child.lastName}: ${error.message}`
          );
        }
      }
    }

    // Round-robin assignment for children without badge (manual assignment needed)
    let driverIndex = 0;
    for (const child of childrenWithoutBadge) {
      try {
        const driver = drivers[driverIndex % drivers.length];
        driverIndex++;

        // Create AM route
        await ctx.db.insert("routes", {
          date: targetDate,
          period: "AM",
          type: "pickup",
          driverId: driver._id,
          childId: child._id,
          status: "scheduled",
          priority: "normal",
          scheduledTime: child.pickupTime || "8:00 AM",
          createdAt: now,
          createdBy: "system_import",
          updatedAt: now,
        });

        // Create PM route
        await ctx.db.insert("routes", {
          date: targetDate,
          period: "PM",
          type: "dropoff",
          driverId: driver._id,
          childId: child._id,
          status: "scheduled",
          priority: "normal",
          scheduledTime: child.classEndTime || "3:00 PM",
          createdAt: now,
          createdBy: "system_import",
          updatedAt: now,
        });

        created.push(
          `${child.firstName} ${child.lastName} → ${driver.firstName} ${driver.lastName} (no badge)`
        );
      } catch (error: any) {
        errors.push(
          `Failed to create route for ${child.firstName} ${child.lastName}: ${error.message}`
        );
      }
    }

    return {
      success: errors.length === 0,
      created: created.length,
      errors: errors.length,
      errorDetails: errors,
      targetDate,
      message: `Created ${created.length} route pairs for ${targetDate}, ${errors.length} errors`,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday;
}

// ============================================================================
// VALIDATION & STATISTICS
// ============================================================================

export const getImportStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("children").collect();
    const drivers = await ctx.db.query("drivers").collect();
    const routes = await ctx.db.query("routes").collect();

    const childrenWithSpecialNeeds = children.filter(
      (c) => c.specialNeeds && c.specialNeeds.length > 0
    ).length;

    const childrenWithGPS = children.filter(
      (c) => c.homeAddress?.coordinates && c.schoolAddress?.coordinates
    ).length;

    const driversWithLanguage = drivers.filter(
      (d) => d.primaryLanguage
    ).length;

    return {
      totalChildren: children.length,
      totalDrivers: drivers.length,
      totalRoutes: routes.length,
      childrenWithSpecialNeeds,
      childrenWithGPS,
      driversWithLanguage,
      childrenByLanguage: countByLanguage(children),
      driversByLanguage: countByLanguage(drivers),
    };
  },
});

function countByLanguage(items: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const lang = item.homeLanguage || item.primaryLanguage || "Unknown";
    counts[lang] = (counts[lang] || 0) + 1;
  });
  return counts;
}

// ============================================================================
// IMPORT DRIVER DETAILS & VEHICLES FROM GOOGLE SHEETS
// ============================================================================

/**
 * Import driver details and vehicle info from Google Sheets roster.
 * Matches by email (primary) or firstName + lastName (fallback).
 *
 * Google Sheets columns:
 * - First Name, Middle Name, Last Name, Phone, Address, Email
 * - Birthday (MM/DD/YYYY), CDL # (license number), DL_Exp (expiry date)
 * - Contract Date, CDL_St_of_Issue, License_Zip_Code
 * - Vehicle_Year, Vehicle_Make, Vehicle_Model, Vehicle_Color, Vehicle_Plate No, Vehicle_VIN #
 * - Job title (from Sheet2)
 */
export const importDriverDetailsFromSheets = internalMutation({
  args: {
    drivers: v.array(
      v.object({
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        birthday: v.optional(v.string()),
        licenseNumber: v.optional(v.string()),
        licenseExpiry: v.optional(v.string()),
        contractDate: v.optional(v.string()),
        licenseStateOfIssue: v.optional(v.string()),
        licenseZipCode: v.optional(v.string()),
        jobTitle: v.optional(v.string()),
        vehicleYear: v.optional(v.string()),
        vehicleMake: v.optional(v.string()),
        vehicleModel: v.optional(v.string()),
        vehicleColor: v.optional(v.string()),
        vehiclePlate: v.optional(v.string()),
        vehicleVin: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existingDrivers = await ctx.db.query("drivers").collect();

    const updated: string[] = [];
    const vehiclesCreated: string[] = [];
    const notFound: string[] = [];
    const errors: string[] = [];

    for (const sheetDriver of args.drivers) {
      try {
        // Match by email first (most reliable), then by name
        let matchedDriver = sheetDriver.email
          ? existingDrivers.find(
              (d) => d.email.toLowerCase() === sheetDriver.email!.toLowerCase()
            )
          : undefined;

        if (!matchedDriver) {
          // Fallback: match by firstName + lastName
          matchedDriver = existingDrivers.find(
            (d) =>
              d.firstName.toLowerCase() === sheetDriver.firstName.toLowerCase() &&
              d.lastName.toLowerCase() === sheetDriver.lastName.toLowerCase()
          );
        }

        if (!matchedDriver) {
          notFound.push(`${sheetDriver.firstName} ${sheetDriver.lastName}`);
          continue;
        }

        // Prepare driver updates (only non-empty fields)
        const driverUpdates: Record<string, any> = {
          updatedAt: now,
        };

        if (sheetDriver.middleName) {
          driverUpdates.middleName = sheetDriver.middleName;
        }
        if (sheetDriver.birthday) {
          // Convert MM/DD/YYYY to ISO format if needed
          driverUpdates.dateOfBirth = normalizeDate(sheetDriver.birthday);
        }
        if (sheetDriver.licenseNumber) {
          driverUpdates.licenseNumber = sheetDriver.licenseNumber;
        }
        if (sheetDriver.licenseExpiry) {
          driverUpdates.licenseExpiry = normalizeDate(sheetDriver.licenseExpiry);
        }
        if (sheetDriver.contractDate) {
          driverUpdates.startDate = normalizeDate(sheetDriver.contractDate);
        }
        if (sheetDriver.licenseStateOfIssue) {
          driverUpdates.licenseStateOfIssue = sheetDriver.licenseStateOfIssue;
        }
        if (sheetDriver.licenseZipCode) {
          driverUpdates.licenseZipCode = sheetDriver.licenseZipCode;
        }
        if (sheetDriver.jobTitle) {
          driverUpdates.jobTitle = sheetDriver.jobTitle;
        }
        if (sheetDriver.phone && !matchedDriver.phone) {
          driverUpdates.phone = sheetDriver.phone;
        }

        // Update driver record
        await ctx.db.patch(matchedDriver._id, driverUpdates);
        updated.push(`${matchedDriver.firstName} ${matchedDriver.lastName}`);

        // Create vehicle record if vehicle data exists
        const hasVehicleData =
          sheetDriver.vehicleYear ||
          sheetDriver.vehicleMake ||
          sheetDriver.vehicleModel ||
          sheetDriver.vehiclePlate ||
          sheetDriver.vehicleVin;

        if (hasVehicleData) {
          // Check if vehicle already exists for this driver
          const existingVehicle = await ctx.db
            .query("vehicles")
            .withIndex("by_driver", (q) => q.eq("driverId", matchedDriver!._id))
            .first();

          if (existingVehicle) {
            // Update existing vehicle
            await ctx.db.patch(existingVehicle._id, {
              year: sheetDriver.vehicleYear || existingVehicle.year,
              make: sheetDriver.vehicleMake || existingVehicle.make,
              model: sheetDriver.vehicleModel || existingVehicle.model,
              color: sheetDriver.vehicleColor || existingVehicle.color,
              plateNumber: sheetDriver.vehiclePlate || existingVehicle.plateNumber,
              vin: sheetDriver.vehicleVin || existingVehicle.vin,
              updatedAt: now,
            });
          } else {
            // Create new vehicle
            await ctx.db.insert("vehicles", {
              driverId: matchedDriver._id,
              year: sheetDriver.vehicleYear,
              make: sheetDriver.vehicleMake,
              model: sheetDriver.vehicleModel,
              color: sheetDriver.vehicleColor,
              plateNumber: sheetDriver.vehiclePlate,
              vin: sheetDriver.vehicleVin,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
          }
          vehiclesCreated.push(
            `${sheetDriver.vehicleYear || ""} ${sheetDriver.vehicleMake || ""} ${sheetDriver.vehicleModel || ""} → ${matchedDriver.firstName}`
          );
        }
      } catch (error: any) {
        errors.push(
          `Failed to update ${sheetDriver.firstName} ${sheetDriver.lastName}: ${error.message}`
        );
      }
    }

    return {
      success: errors.length === 0,
      driversUpdated: updated.length,
      vehiclesCreated: vehiclesCreated.length,
      driversNotFound: notFound.length,
      errors: errors.length,
      updatedDrivers: updated,
      createdVehicles: vehiclesCreated,
      notFoundDrivers: notFound,
      errorDetails: errors,
      message: `Updated ${updated.length} drivers, created/updated ${vehiclesCreated.length} vehicles. ${notFound.length} drivers not found in Convex.`,
    };
  },
});

/**
 * Normalize date from MM/DD/YYYY or other formats to ISO YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return dateStr;

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split("T")[0];
  }

  // MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // M/D/YY format
  const mdyShortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyShortMatch) {
    const [, month, day, shortYear] = mdyShortMatch;
    const year = parseInt(shortYear) > 50 ? `19${shortYear}` : `20${shortYear}`;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Return as-is if unrecognized
  return dateStr;
}

// ============================================================================
// IMPORT PARENT/GUARDIAN DATA FROM GOOGLE SHEETS
// ============================================================================

/**
 * Import parent/guardian contact info from Google Sheets to enrich children records.
 * Matches by child firstName + lastName.
 *
 * Google Sheets columns (Sheet: "Sheet1"):
 * - First Name (parent), Last Name (parent), Title ("{Child} Parent")
 * - Cellphone (parent phone)
 * - Company (school name - for validation)
 * - Rider_FirstNm, Rider_LastNm (child name for matching)
 * - Columns H-K: Address (street, unit, city, zip)
 */
export const importParentDetailsFromSheets = internalMutation({
  args: {
    parents: v.array(
      v.object({
        parentFirstName: v.string(),
        parentLastName: v.string(),
        parentPhone: v.optional(v.string()),
        childFirstName: v.string(),
        childLastName: v.string(),
        schoolName: v.optional(v.string()),
        street: v.optional(v.string()),
        unit: v.optional(v.string()),
        city: v.optional(v.string()),
        zip: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existingChildren = await ctx.db.query("children").collect();

    const updated: string[] = [];
    const addressUpdated: string[] = [];
    const notFound: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const parentData of args.parents) {
      try {
        // Normalize names for matching (trim, lowercase)
        const childFirst = parentData.childFirstName.trim().toLowerCase();
        const childLast = parentData.childLastName.trim().toLowerCase();

        // Handle combined names like "Andrea/Isabel" - split and process both
        const childFirstNames = childFirst.includes("/")
          ? childFirst.split("/").map((n) => n.trim())
          : [childFirst];

        for (const firstName of childFirstNames) {
          // Match by child firstName + lastName
          const matchedChild = existingChildren.find(
            (c) =>
              c.firstName.toLowerCase() === firstName &&
              c.lastName.toLowerCase() === childLast
          );

          if (!matchedChild) {
            notFound.push(`${firstName} ${childLast}`);
            continue;
          }

          // Normalize phone number
          const normalizedPhone = normalizePhone(parentData.parentPhone || "");

          // Check if parent1 already has data (non-empty firstName)
          const hasParent1Data =
            matchedChild.parent1 &&
            matchedChild.parent1.firstName &&
            matchedChild.parent1.firstName.trim() !== "";

          // Prepare updates
          const updates: Record<string, any> = {
            updatedAt: now,
          };

          if (hasParent1Data) {
            // Add to parent2 if parent1 is already populated
            if (
              !matchedChild.parent2 ||
              !matchedChild.parent2.firstName ||
              matchedChild.parent2.firstName.trim() === ""
            ) {
              updates.parent2 = {
                firstName: parentData.parentFirstName.trim(),
                lastName: parentData.parentLastName.trim(),
                phone: normalizedPhone,
              };
              updated.push(
                `${matchedChild.firstName} ${matchedChild.lastName} (parent2: ${parentData.parentFirstName})`
              );
            } else {
              skipped.push(
                `${matchedChild.firstName} ${matchedChild.lastName} (both parents already set)`
              );
              continue;
            }
          } else {
            // Set parent1
            updates.parent1 = {
              firstName: parentData.parentFirstName.trim(),
              lastName: parentData.parentLastName.trim(),
              phone: normalizedPhone,
            };
            updated.push(
              `${matchedChild.firstName} ${matchedChild.lastName} (parent1: ${parentData.parentFirstName})`
            );
          }

          // Update address if current city is "Unknown" or zip is empty
          const currentAddress = matchedChild.homeAddress;
          const needsAddressUpdate =
            parentData.city &&
            currentAddress &&
            (currentAddress.city === "Unknown" ||
              currentAddress.city === "" ||
              !currentAddress.zip);

          if (needsAddressUpdate) {
            // Combine street and unit
            let fullStreet = currentAddress.street;
            if (
              parentData.street &&
              parentData.street.trim() &&
              parentData.street.trim() !== currentAddress.street
            ) {
              fullStreet = parentData.unit
                ? `${parentData.street.trim()} ${parentData.unit.trim()}`
                : parentData.street.trim();
            }

            updates.homeAddress = {
              ...currentAddress,
              street: fullStreet,
              city: parentData.city?.trim() || currentAddress.city,
              zip: parentData.zip?.trim() || currentAddress.zip,
            };
            addressUpdated.push(
              `${matchedChild.firstName} ${matchedChild.lastName}`
            );
          }

          // Apply updates
          await ctx.db.patch(matchedChild._id, updates);
        }
      } catch (error: any) {
        errors.push(
          `Failed to process ${parentData.childFirstName} ${parentData.childLastName}: ${error.message}`
        );
      }
    }

    return {
      success: errors.length === 0,
      parentsLinked: updated.length,
      addressesUpdated: addressUpdated.length,
      childrenNotFound: notFound.length,
      skipped: skipped.length,
      errors: errors.length,
      linkedParents: updated,
      updatedAddresses: addressUpdated,
      notFoundChildren: notFound,
      skippedRecords: skipped,
      errorDetails: errors,
      message: `Linked ${updated.length} parents to children, updated ${addressUpdated.length} addresses. ${notFound.length} children not found, ${skipped.length} skipped (parents already set).`,
    };
  },
});

/**
 * Normalize phone number to consistent format
 * Input: various formats like "(415) 515-9290", "415-200-8434", "925 285 0675"
 * Output: "(415) 515-9290" format
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit numbers (with leading 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if can't normalize
  return phone.trim();
}

/**
 * Get summary of children parent data completeness
 */
export const getChildrenParentCompleteness = internalMutation({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("children").collect();

    const withParent1 = children.filter(
      (c) => c.parent1 && c.parent1.firstName && c.parent1.firstName.trim() !== ""
    ).length;
    const withParent2 = children.filter(
      (c) => c.parent2 && c.parent2.firstName && c.parent2.firstName.trim() !== ""
    ).length;
    const withBothParents = children.filter(
      (c) =>
        c.parent1 &&
        c.parent1.firstName &&
        c.parent1.firstName.trim() !== "" &&
        c.parent2 &&
        c.parent2.firstName &&
        c.parent2.firstName.trim() !== ""
    ).length;
    const withCompleteAddress = children.filter(
      (c) =>
        c.homeAddress &&
        c.homeAddress.city &&
        c.homeAddress.city !== "Unknown" &&
        c.homeAddress.zip
    ).length;

    return {
      totalChildren: children.length,
      dataCompleteness: {
        parent1: {
          count: withParent1,
          percent: Math.round((withParent1 / children.length) * 100),
        },
        parent2: {
          count: withParent2,
          percent: Math.round((withParent2 / children.length) * 100),
        },
        bothParents: {
          count: withBothParents,
          percent: Math.round((withBothParents / children.length) * 100),
        },
        completeAddress: {
          count: withCompleteAddress,
          percent: Math.round((withCompleteAddress / children.length) * 100),
        },
      },
    };
  },
});

// ============================================================================
// IMPORT SPECIAL NEEDS / MEDICAL DATA FROM GOOGLE SHEETS
// ============================================================================

/**
 * Import special needs, medical info, and transportation requirements for children.
 * Matches by child firstName + lastName (case-insensitive).
 * Only updates fields that are currently empty/null in the database.
 *
 * Google Sheets columns mapped:
 * - Home_Lang → homeLanguage
 * - Prime Handicap → specialNeeds array
 * - Wheelchair/Walker/Car Seat → medicalInfo.equipmentNeeds
 * - Disabilty_Details → medicalInfo.medicalConditions
 * - seizure_protocol → seizureProtocol (Y = true)
 * - Booster → boosterSeat (Y = true)
 * - Ryder Type → rideType (SOLO, Carpool, etc.)
 * - Teacher info → teacher object
 * - Handoff_Req, Safety Vest, Camera, Ride_Asst → transportationNotes
 */
export const importSpecialNeedsFromSheets = internalMutation({
  args: {
    records: v.array(
      v.object({
        childFirstName: v.string(),
        childLastName: v.string(),
        homeLanguage: v.optional(v.string()),
        primeHandicap: v.optional(v.string()),
        equipment: v.optional(v.string()),
        disabilityDetails: v.optional(v.string()),
        seizureProtocol: v.optional(v.string()),
        booster: v.optional(v.string()),
        rideType: v.optional(v.string()),
        handoffReq: v.optional(v.string()),
        safetyVest: v.optional(v.string()),
        camera: v.optional(v.string()),
        rideAssistant: v.optional(v.string()),
        teacherFirstName: v.optional(v.string()),
        teacherLastName: v.optional(v.string()),
        teacherPhone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existingChildren = await ctx.db.query("children").collect();

    const updated: string[] = [];
    const notFound: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const fieldsUpdated: Record<string, number> = {};

    for (const record of args.records) {
      try {
        // Skip van routes and non-children entries
        if (
          record.childFirstName.toLowerCase().includes("van") ||
          record.childFirstName.toLowerCase().includes("compass") ||
          record.childFirstName.toLowerCase().includes("canal") ||
          record.childFirstName.toLowerCase().includes("transit")
        ) {
          continue;
        }

        // Normalize names for matching
        const childFirst = record.childFirstName.trim().toLowerCase();
        const childLast = record.childLastName.trim().toLowerCase();

        // Handle combined names like "Andrea/Isabel"
        const childFirstNames = childFirst.includes("/")
          ? childFirst.split("/").map((n) => n.trim())
          : [childFirst];

        for (const firstName of childFirstNames) {
          // Match by child firstName + lastName
          const matchedChild = existingChildren.find(
            (c) =>
              c.firstName.toLowerCase() === firstName &&
              c.lastName.toLowerCase() === childLast
          );

          if (!matchedChild) {
            if (!notFound.includes(`${firstName} ${childLast}`)) {
              notFound.push(`${firstName} ${childLast}`);
            }
            continue;
          }

          const updates: Record<string, any> = {};
          let hasUpdates = false;

          // Update homeLanguage if empty
          if (
            record.homeLanguage &&
            record.homeLanguage.trim() &&
            (!matchedChild.homeLanguage || matchedChild.homeLanguage === "")
          ) {
            updates.homeLanguage = record.homeLanguage.trim();
            hasUpdates = true;
            fieldsUpdated.homeLanguage = (fieldsUpdated.homeLanguage || 0) + 1;
          }

          // Update seizureProtocol if not set
          if (
            record.seizureProtocol &&
            record.seizureProtocol.toUpperCase() === "Y" &&
            matchedChild.seizureProtocol !== true
          ) {
            updates.seizureProtocol = true;
            hasUpdates = true;
            fieldsUpdated.seizureProtocol =
              (fieldsUpdated.seizureProtocol || 0) + 1;
          }

          // Update boosterSeat if not set
          if (
            record.booster &&
            record.booster.toUpperCase() === "Y" &&
            matchedChild.boosterSeat !== true
          ) {
            updates.boosterSeat = true;
            hasUpdates = true;
            fieldsUpdated.boosterSeat = (fieldsUpdated.boosterSeat || 0) + 1;
          }

          // Update rideType if empty
          if (
            record.rideType &&
            record.rideType.trim() &&
            (!matchedChild.rideType || matchedChild.rideType === "")
          ) {
            // Normalize rideType values
            const rideTypeNormalized = record.rideType.trim().toUpperCase();
            if (
              rideTypeNormalized.includes("SOLO") ||
              rideTypeNormalized.includes("CARPOOL") ||
              rideTypeNormalized.includes("VANPOOL") ||
              rideTypeNormalized.includes("W/C")
            ) {
              updates.rideType = rideTypeNormalized.includes("SOLO")
                ? "SOLO"
                : rideTypeNormalized.includes("CARPOOL")
                  ? "SHARED"
                  : rideTypeNormalized;
              hasUpdates = true;
              fieldsUpdated.rideType = (fieldsUpdated.rideType || 0) + 1;
            }
          }

          // Build specialNeeds array from primeHandicap
          if (
            record.primeHandicap &&
            record.primeHandicap.trim() &&
            (!matchedChild.specialNeeds || matchedChild.specialNeeds.length === 0)
          ) {
            const specialNeedsArray = parseSpecialNeeds(record.primeHandicap);
            if (specialNeedsArray.length > 0) {
              updates.specialNeeds = specialNeedsArray;
              hasUpdates = true;
              fieldsUpdated.specialNeeds =
                (fieldsUpdated.specialNeeds || 0) + 1;
            }
          }

          // Build medicalInfo object if we have equipment or disability details
          const hasEquipment =
            record.equipment && record.equipment.trim() && record.equipment !== "N" && record.equipment !== "No";
          const hasDisabilityDetails =
            record.disabilityDetails && record.disabilityDetails.trim();

          if (
            (hasEquipment || hasDisabilityDetails) &&
            (!matchedChild.medicalInfo ||
              (matchedChild.medicalInfo.equipmentNeeds.length === 0 &&
                matchedChild.medicalInfo.medicalConditions.length === 0))
          ) {
            const equipmentNeeds = hasEquipment
              ? parseEquipmentNeeds(record.equipment!)
              : [];
            const medicalConditions = hasDisabilityDetails
              ? [record.disabilityDetails!.trim()]
              : [];

            updates.medicalInfo = {
              allergies: matchedChild.medicalInfo?.allergies || [],
              medicalConditions: medicalConditions,
              equipmentNeeds: equipmentNeeds,
              emergencyProcedures:
                matchedChild.medicalInfo?.emergencyProcedures || undefined,
            };
            hasUpdates = true;
            fieldsUpdated.medicalInfo = (fieldsUpdated.medicalInfo || 0) + 1;
          }

          // Build teacher object if not set
          if (
            record.teacherFirstName &&
            record.teacherFirstName.trim() &&
            record.teacherLastName &&
            record.teacherLastName.trim() &&
            !matchedChild.teacher
          ) {
            updates.teacher = {
              firstName: record.teacherFirstName.trim(),
              lastName: record.teacherLastName.trim(),
              phone: record.teacherPhone?.trim() || undefined,
            };
            hasUpdates = true;
            fieldsUpdated.teacher = (fieldsUpdated.teacher || 0) + 1;
          }

          // Build transportationNotes from various flags
          const transportNotes: string[] = [];
          if (record.handoffReq?.toUpperCase() === "Y")
            transportNotes.push("Special handoff required");
          if (record.safetyVest?.toUpperCase() === "Y")
            transportNotes.push("Safety vest/lock required");
          if (record.camera?.toUpperCase() === "Y")
            transportNotes.push("Camera monitoring");
          if (record.rideAssistant?.toUpperCase() === "Y")
            transportNotes.push("Ride assistant needed");

          if (
            transportNotes.length > 0 &&
            (!matchedChild.transportationNotes ||
              matchedChild.transportationNotes === "")
          ) {
            updates.transportationNotes = transportNotes.join("; ");
            hasUpdates = true;
            fieldsUpdated.transportationNotes =
              (fieldsUpdated.transportationNotes || 0) + 1;
          }

          // Apply updates
          if (hasUpdates) {
            updates.updatedAt = now;
            await ctx.db.patch(matchedChild._id, updates);
            updated.push(
              `${matchedChild.firstName} ${matchedChild.lastName}`
            );
          } else {
            skipped.push(
              `${matchedChild.firstName} ${matchedChild.lastName} (no new data)`
            );
          }
        }
      } catch (error: any) {
        errors.push(
          `Failed to process ${record.childFirstName} ${record.childLastName}: ${error.message}`
        );
      }
    }

    return {
      success: errors.length === 0,
      childrenUpdated: updated.length,
      childrenNotFound: notFound.length,
      skipped: skipped.length,
      errors: errors.length,
      fieldsUpdated,
      updatedChildren: updated.slice(0, 20), // First 20 for brevity
      notFoundChildren: notFound.slice(0, 20),
      errorDetails: errors,
      message: `Updated ${updated.length} children with special needs data. ${notFound.length} not found, ${skipped.length} skipped (no new data).`,
    };
  },
});

/**
 * Parse special needs from Prime Handicap column
 * Examples: "Autism", "LD - NV", "Autism - NV - Extreme Behavior"
 */
function parseSpecialNeeds(primeHandicap: string): string[] {
  const needs: string[] = [];
  const normalized = primeHandicap.trim();

  // Common patterns to extract
  if (/autism/i.test(normalized)) needs.push("Autism");
  if (/\bld\b/i.test(normalized)) needs.push("Learning Disability");
  if (/\bnv\b|non.?verbal/i.test(normalized)) needs.push("Non-Verbal");
  if (/behavior/i.test(normalized)) needs.push("Behavioral");
  if (/extreme/i.test(normalized)) needs.push("Extreme Behavior");
  if (/deaf|blind/i.test(normalized)) needs.push("Deaf/Blind");
  if (/homeless/i.test(normalized)) needs.push("Homeless");
  if (/mobility|handicap|physically/i.test(normalized)) needs.push("Mobility Impaired");
  if (/depression/i.test(normalized)) needs.push("Mental Health");
  if (/flight.?risk|runner/i.test(normalized)) needs.push("Flight Risk");
  if (/cp\b/i.test(normalized)) needs.push("Cerebral Palsy");

  // If no specific matches, use the raw value if it's meaningful
  if (needs.length === 0 && normalized && normalized !== "None" && normalized !== "N") {
    needs.push(normalized);
  }

  return needs;
}

/**
 * Parse equipment needs from Wheelchair/Walker/Car Seat column
 * Examples: "Booster", "Locks", "Wheelchair", "Harness", "Car Seat"
 */
function parseEquipmentNeeds(equipment: string): string[] {
  const needs: string[] = [];
  const normalized = equipment.trim();

  if (/booster/i.test(normalized)) needs.push("Booster Seat");
  if (/lock/i.test(normalized)) needs.push("Door Locks");
  if (/wheelchair|w\/c/i.test(normalized)) needs.push("Wheelchair");
  if (/harness/i.test(normalized)) needs.push("Harness");
  if (/car\s?seat/i.test(normalized)) needs.push("Car Seat");
  if (/walker|cane/i.test(normalized)) needs.push("Walker/Cane");
  if (/vest/i.test(normalized)) needs.push("Safety Vest");
  if (/solo/i.test(normalized)) needs.push("Solo Transport Required");
  if (/aide/i.test(normalized)) needs.push("Aide Required");
  if (/gate\s?belt/i.test(normalized)) needs.push("Gate Belt");

  // If no specific matches, use the raw value if meaningful
  if (needs.length === 0 && normalized && normalized !== "N" && normalized !== "No") {
    needs.push(normalized);
  }

  return needs;
}

/**
 * Get summary of children special needs data completeness
 */
export const getChildrenSpecialNeedsCompleteness = internalMutation({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("children").collect();

    const withHomeLanguage = children.filter(
      (c) => c.homeLanguage && c.homeLanguage !== ""
    ).length;
    const withSpecialNeeds = children.filter(
      (c) => c.specialNeeds && c.specialNeeds.length > 0
    ).length;
    const withMedicalInfo = children.filter(
      (c) =>
        c.medicalInfo &&
        (c.medicalInfo.equipmentNeeds.length > 0 ||
          c.medicalInfo.medicalConditions.length > 0)
    ).length;
    const withSeizureProtocol = children.filter(
      (c) => c.seizureProtocol === true
    ).length;
    const withBoosterSeat = children.filter(
      (c) => c.boosterSeat === true
    ).length;
    const withTeacher = children.filter(
      (c) => c.teacher && c.teacher.firstName
    ).length;
    const withTransportNotes = children.filter(
      (c) => c.transportationNotes && c.transportationNotes !== ""
    ).length;
    const withRideType = children.filter(
      (c) => c.rideType && c.rideType !== ""
    ).length;

    return {
      totalChildren: children.length,
      dataCompleteness: {
        homeLanguage: {
          count: withHomeLanguage,
          percent: Math.round((withHomeLanguage / children.length) * 100),
        },
        specialNeeds: {
          count: withSpecialNeeds,
          percent: Math.round((withSpecialNeeds / children.length) * 100),
        },
        medicalInfo: {
          count: withMedicalInfo,
          percent: Math.round((withMedicalInfo / children.length) * 100),
        },
        seizureProtocol: {
          count: withSeizureProtocol,
          percent: Math.round((withSeizureProtocol / children.length) * 100),
        },
        boosterSeat: {
          count: withBoosterSeat,
          percent: Math.round((withBoosterSeat / children.length) * 100),
        },
        teacher: {
          count: withTeacher,
          percent: Math.round((withTeacher / children.length) * 100),
        },
        transportationNotes: {
          count: withTransportNotes,
          percent: Math.round((withTransportNotes / children.length) * 100),
        },
        rideType: {
          count: withRideType,
          percent: Math.round((withRideType / children.length) * 100),
        },
      },
    };
  },
});

/**
 * Get summary of driver data completeness
 */
export const getDriverDataCompleteness = internalMutation({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db.query("drivers").collect();
    const vehicles = await ctx.db.query("vehicles").collect();

    const withBirthday = drivers.filter((d) => d.dateOfBirth).length;
    const withLicenseNumber = drivers.filter((d) => d.licenseNumber).length;
    const withLicenseExpiry = drivers.filter((d) => d.licenseExpiry).length;
    const withLicenseState = drivers.filter((d) => d.licenseStateOfIssue).length;
    const withJobTitle = drivers.filter((d) => d.jobTitle).length;
    const withVehicle = vehicles.filter((v) => v.isActive).length;

    return {
      totalDrivers: drivers.length,
      totalVehicles: vehicles.length,
      dataCompleteness: {
        birthday: { count: withBirthday, percent: Math.round((withBirthday / drivers.length) * 100) },
        licenseNumber: { count: withLicenseNumber, percent: Math.round((withLicenseNumber / drivers.length) * 100) },
        licenseExpiry: { count: withLicenseExpiry, percent: Math.round((withLicenseExpiry / drivers.length) * 100) },
        licenseState: { count: withLicenseState, percent: Math.round((withLicenseState / drivers.length) * 100) },
        jobTitle: { count: withJobTitle, percent: Math.round((withJobTitle / drivers.length) * 100) },
        vehicle: { count: withVehicle, percent: Math.round((withVehicle / drivers.length) * 100) },
      },
    };
  },
});
