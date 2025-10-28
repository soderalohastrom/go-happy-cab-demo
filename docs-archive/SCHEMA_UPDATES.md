# Convex Schema Updates - CSV Import Fields

**Updated:** October 26, 2025

## Summary

Added new optional fields to `children` and `drivers` tables to support CSV import from Google Sheets master data. These fields enhance both the Dispatch App and Driver App with operational details.

## Children Table - New Fields

```typescript
pickupTime: v.optional(v.string()),       // "8:30 AM"
classStartTime: v.optional(v.string()),   // "9:00 AM"
classEndTime: v.optional(v.string()),     // "3:20 PM"
rideType: v.optional(v.string()),         // "SOLO" or "SHARED"
pickupNotes: v.optional(v.string()),      // Special instructions
homeLanguage: v.optional(v.string()),     // "Spanish", "Portuguese", etc.
```

### Usage in Apps

**Driver App:**
- `pickupTime` - Shows exact pickup window for route scheduling
- `classStartTime`/`classEndTime` - Helps drivers understand urgency
- `rideType` - Displayed as badge on route cards
- `pickupNotes` - Expandable section with critical instructions
- `homeLanguage` - Subtle indicator for parent communication prep

**Dispatch App:**
- `rideType` - Operational planning context
- All fields - Better route assignment decisions

### Note on specialNeeds

The schema already has `specialNeeds: v.optional(v.array(v.string()))` (line 133), so the CSV import will parse comma-separated values into an array:
- CSV: `"Car Seat, Booster"` → Array: `["Car Seat", "Booster"]`

## Drivers Table - New Fields

```typescript
primaryLanguage: v.optional(v.string()),   // "Portuguese", "English"
availabilityAM: v.optional(v.string()),    // "YES", "NO", "LIMITED"
availabilityPM: v.optional(v.string()),    // "YES", "NO", "LIMITED"
startDate: v.optional(v.string()),         // "2024-08-15" (ISO format)
specialEquipment: v.optional(v.string()),  // "Car Seats, Booster"
```

### Usage in Apps

**Dispatch App:**
- `primaryLanguage` - Match drivers with families (Portuguese ↔ Brazilian families)
- `availabilityAM`/`availabilityPM` - Filter/sort drivers by shift availability
- `specialEquipment` - Validate child-vehicle equipment matching
- `startDate` - Seniority/experience context

**Driver App:**
- `specialEquipment` - Display capability badges on profile
- `primaryLanguage` - (Future) Auto-translate interfaces

## CSV Import Specifications

### children.csv Column Order

```
child_id,first_name,last_name,grade,pickup_time,class_start_time,class_end_time,
ride_type,special_needs,pickup_notes,home_language,home_address,home_latitude,
home_longitude,school_name,school_address,school_jurisdiction,school_latitude,
school_longitude,parent_name,parent_phone,parent_email,badge_id,notes
```

### drivers.csv Column Order

```
driver_id,badge_id,first_name,last_name,phone,email,license_number,
primary_language,availability_am,availability_pm,start_date,special_equipment,
home_address,home_latitude,home_longitude,vehicle_make,vehicle_model,
vehicle_year,vehicle_plate,notes
```

## Next Steps

1. ✅ Schema updated in `convex/schema.ts`
2. ✅ Generated types copied to `dispatch-app/convex/_generated`
3. ⏳ User to populate Google Sheets with CSV export templates
4. ⏳ Create `convex/importRealData.ts` script to import CSVs
5. ⏳ Test import with real data (~120 children, ~67 drivers)

## Migration Strategy

**Badge-Based Pairing:**
- Children with `badge_id` (e.g., `BADGE023`) → auto-create route assignments
- Children with blank `badge_id` → remain unassigned for drag-and-drop
- All drivers have unique `badge_id` values (BADGE001-BADGE069)

**GPS Coordinates:**
- Format: Decimal degrees (e.g., `37.9735`, `-122.5311`)
- 4-6 decimal places for street-level accuracy
- Used for future Google Maps integration

## Data Validation Notes

**specialNeeds Array Parsing:**
```javascript
// CSV input: "Car Seat, Booster, Wheelchair"
// Import script converts to: ["Car Seat", "Booster", "Wheelchair"]
```

**Availability Values:**
- Valid: `"YES"`, `"NO"`, `"LIMITED"`
- Case-insensitive during import, normalized to uppercase

**Date Formats:**
- `startDate`: ISO format `YYYY-MM-DD` (e.g., `2024-08-15`)
- All time fields: Human-readable strings (e.g., `8:30 AM`)

## Files Modified

- `convex/schema.ts` - Added 6 fields to children, 5 fields to drivers
- `dispatch-app/convex/_generated/` - Auto-updated with new types

---

**Ready for CSV import script development once user completes Google Sheets export.**
