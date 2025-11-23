import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Unified Go Happy Cab Schema
 * 
 * Supports both Dispatch App and Driver App with shared data model.
 * Based on driver app's production schema with dispatch-specific enhancements.
 */

export default defineSchema({
  // ============================================================================
  // CORE ENTITIES - Shared by both apps
  // ============================================================================

  /**
   * Drivers - Full schema from driver app
   * Used by: Both apps (dispatch assigns, driver logs in)
   */
  drivers: defineTable({
    // Basic Info
    employeeId: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()), // NEW
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),

    // Address
    address: v.optional(v.object({
      street: v.string(),
      street2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),

    // Compliance & ID
    ssn: v.optional(v.string()),
    itin: v.optional(v.string()),
    fingerprintsOnFile: v.optional(v.boolean()),
    fingerprintsVerified: v.optional(v.boolean()),
    tbTestVerified: v.optional(v.boolean()),
    taxiApplicationStatus: v.optional(v.string()),
    mvrStatus: v.optional(v.string()),

    // NEW: CSV Import Fields - Driver Details
    primaryLanguage: v.optional(v.string()), // Driver's primary language (e.g., "Portuguese", "English")
    availabilityAM: v.optional(v.string()), // AM availability: "YES", "NO", "LIMITED"
    availabilityPM: v.optional(v.string()), // PM availability: "YES", "NO", "LIMITED"
    startDate: v.optional(v.string()), // Driver hire date (ISO format)
    specialEquipment: v.optional(v.string()), // Vehicle equipment (e.g., "Car Seats, Booster")

    // Authentication (driver app)
    pin: v.optional(v.string()), // Hashed with salt
    biometricEnabled: v.optional(v.boolean()),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_shift"),
      v.literal("off_shift"),
      v.literal("suspended")
    ),
    role: v.union(
      v.literal("driver"),
      v.literal("supervisor"),
      v.literal("dispatcher"),
      v.literal("admin")
    ),

    // Credentials
    licenseNumber: v.optional(v.string()),
    licenseExpiry: v.optional(v.string()),

    // Emergency Contact
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),

    // Performance Metrics (driver app)
    performanceMetrics: v.optional(v.object({
      totalRoutes: v.number(),
      onTimeRate: v.number(),
      safetyScore: v.number(),
      incidentCount: v.number(),
      parentRating: v.number(),
    })),

    // Metadata
    active: v.boolean(), // Simplified active flag for dispatch
    clerkId: v.optional(v.string()), // ID from Clerk user object
    expoPushToken: v.optional(v.string()), // NEW: For push notifications
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_clerk_id", ["clerkId"]) // New index for fast lookups
    .index("by_employee_id", ["employeeId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_active", ["active"]),

  /**
   * Children - Full schema from driver app
   * Used by: Both apps (dispatch assigns, driver views routes)
   */
  children: defineTable({
    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    middleName: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    dateOfBirth: v.string(),
    grade: v.string(),
    studentId: v.string(),

    // School Info
    schoolId: v.optional(v.string()),
    schoolName: v.string(),

    // NEW: CSV Import Fields - Scheduling & Operations
    pickupTime: v.optional(v.string()), // Scheduled AM pickup time (e.g., "8:30 AM")
    classStartTime: v.optional(v.string()), // School start time (e.g., "9:00 AM")
    classEndTime: v.optional(v.string()), // School end time for PM routes (e.g., "3:20 PM")
    rideType: v.optional(v.string()), // "SOLO" or "SHARED"
    pickupNotes: v.optional(v.string()), // Special instructions from master sheet
    notes: v.optional(v.string()), // General notes
    homeLanguage: v.optional(v.string()), // Primary language at home (e.g., "Spanish", "Portuguese")

    // School Staff
    teacher: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.optional(v.string()),
    })),
    caseManager: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
    })),

    // Medical & Safety
    seizureProtocol: v.optional(v.boolean()),
    boosterSeat: v.optional(v.boolean()),

    // NEW: For badge-based carpool auto-pairing
    assignedBadgeId: v.optional(v.string()), // Badge ID for carpool assignments (e.g., "BADGE023")

    // Steady Pairings (Default Drivers)
    defaultAmDriverId: v.optional(v.id("drivers")),
    defaultPmDriverId: v.optional(v.id("drivers")),

    // Addresses (driver app needs)
    homeAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      coordinates: v.optional(v.object({
        latitude: v.number(),
        longitude: v.number(),
      })),
      accessInstructions: v.optional(v.string()),
    })),

    schoolAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      coordinates: v.optional(v.object({
        latitude: v.number(),
        longitude: v.number(),
      })),
      dropoffLocation: v.optional(v.string()),
      pickupLocation: v.optional(v.string()),
    })),

    // Special Needs (driver app critical)
    specialNeeds: v.optional(v.array(v.string())),
    medicalInfo: v.optional(v.object({
      allergies: v.array(v.string()),
      medicalConditions: v.array(v.string()),
      emergencyProcedures: v.optional(v.string()),
      equipmentNeeds: v.array(v.string()),
    })),

    // Transportation Notes
    pickupInstructions: v.optional(v.string()),
    dropoffInstructions: v.optional(v.string()),
    transportationNotes: v.optional(v.string()),

    // Parent References
    parentIds: v.optional(v.array(v.string())),
    parent1: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),
    parent2: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),

    // Status
    active: v.boolean(),
    photoPermission: v.optional(v.boolean()),

    // Metadata
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_last_name", ["lastName"])
    .index("by_school", ["schoolId"])
    .index("by_active", ["active"])
    .index("by_student_id", ["studentId"]),

  /**
   * Parents - From driver app
   * Used by: Both apps (SMS notifications, emergency contacts)
   */
  parents: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    alternatePhone: v.optional(v.string()),

    // Address
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),

    // Relationship
    relationship: v.string(), // mother, father, guardian, etc.
    isPrimary: v.boolean(),
    canPickup: v.boolean(),

    // Communication Preferences
    preferredContactMethod: v.union(
      v.literal("phone"),
      v.literal("text"),
      v.literal("email"),
      v.literal("app")
    ),
    communicationPreferences: v.optional(v.object({
      emergencyOnly: v.boolean(),
      dailyUpdates: v.boolean(),
      pickupNotifications: v.boolean(),
      delayAlerts: v.boolean(),
    })),

    // Status
    active: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_active", ["active"]),

  /**
   * Child-Parent Relationships
   * Used by: SMS notifications, emergency contacts
   */
  childParentRelationships: defineTable({
    childId: v.id("children"),
    parentId: v.id("parents"),
    relationship: v.string(),
    isPrimary: v.boolean(),
    pickupAuthorized: v.boolean(),
    emergencyContact: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_child", ["childId"])
    .index("by_parent", ["parentId"]),

  // ============================================================================
  // ROUTES & ASSIGNMENTS - Core scheduling logic
  // ============================================================================

  /**
   * Routes - Merged driver app routes + dispatch assignments
   * 
   * DISPATCH ENHANCEMENT: Added `period` field for AM/PM scheduling
   * This table combines driver app's "routes" with dispatch POC's "assignments"
   */
  routes: defineTable({
    // Scheduling (DISPATCH USES THIS)
    date: v.string(), // ISO date "2025-10-24"
    period: v.union(v.literal("AM"), v.literal("PM")), // DISPATCH ADDITION
    type: v.union(v.literal("pickup"), v.literal("dropoff")), // Usually matches period

    // Assignment
    driverId: v.id("drivers"),
    childId: v.id("children"), // DISPATCH SIMPLIFICATION: One route per child
    vehicleId: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("emergency_stop")
    ),

    // Priority
    priority: v.optional(v.union(
      v.literal("normal"),
      v.literal("high"),
      v.literal("emergency")
    )),

    // Timing
    scheduledTime: v.optional(v.string()), // Expected pickup/dropoff time
    actualStartTime: v.optional(v.string()),
    actualEndTime: v.optional(v.string()),
    estimatedDuration: v.optional(v.number()), // minutes
    actualDuration: v.optional(v.number()),

    // Tracking (DRIVER APP USES THIS)
    childPresent: v.optional(v.boolean()), // Did child show up?
    childCondition: v.optional(v.string()), // "good", "sick", "upset", "absent"
    parentNotified: v.optional(v.boolean()),
    skipReason: v.optional(v.string()), // If child was a no-show
    driverNotes: v.optional(v.string()),

    // Metadata
    createdAt: v.string(),
    createdBy: v.optional(v.string()), // dispatcher or system
    updatedAt: v.string(),
  })
    .index("by_driver_date", ["driverId", "date"])
    .index("by_date_period", ["date", "period"]) // DISPATCH PRIMARY INDEX
    .index("by_child_date_period", ["childId", "date", "period"]) // Prevent double-booking child
    .index("by_driver_date_period", ["driverId", "date", "period"]) // Prevent double-booking driver
    .index("by_status", ["status"])
    .index("by_child", ["childId"]),

  /**
   * Stops - Individual pickup/dropoff points (from driver app)
   * Used by: Driver app for detailed route execution
   * Note: Dispatch app works at route level, driver app works at stop level
   */
  stops: defineTable({
    routeId: v.id("routes"),
    childId: v.id("children"),
    sequence: v.number(), // Order of stops
    type: v.union(v.literal("pickup"), v.literal("dropoff")),

    // Location
    location: v.object({
      address: v.string(),
      coordinates: v.optional(v.object({
        latitude: v.number(),
        longitude: v.number(),
      })),
      accessNotes: v.optional(v.string()),
    }),

    // Timing
    scheduledTime: v.string(),
    actualTime: v.optional(v.string()),
    estimatedDelay: v.optional(v.number()), // minutes

    // Status (DRIVER APP UPDATES THIS)
    status: v.union(
      v.literal("pending"),
      v.literal("approaching"),
      v.literal("arrived"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("delayed"),
      v.literal("cancelled")
    ),

    // Child Status
    childPresent: v.optional(v.boolean()),
    childCondition: v.optional(v.string()),
    parentNotified: v.optional(v.boolean()),
    waitTimeMinutes: v.optional(v.number()),
    skipReason: v.optional(v.string()),

    // Notes
    notes: v.optional(v.string()),
    driverNotes: v.optional(v.string()),

    // Metadata
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_route", ["routeId"])
    .index("by_child", ["childId"])
    .index("by_route_sequence", ["routeId", "sequence"])
    .index("by_status", ["status"]),

  // ============================================================================
  // AUDIT & COMPLIANCE - Shared by both apps
  // ============================================================================

  /**
   * Audit Logs - From driver app (more comprehensive than dispatch POC)
   * Used by: Both apps for compliance and reporting
   */
  auditLogs: defineTable({
    logId: v.string(), // AL-YYYYMMDD-NNNNNN
    timestamp: v.string(),

    // Actor
    userId: v.optional(v.string()),
    userType: v.union(
      v.literal("driver"),
      v.literal("supervisor"),
      v.literal("admin"),
      v.literal("dispatcher"), // DISPATCH ADDITION
      v.literal("system")
    ),

    // Action
    action: v.string(), // "created", "updated", "deleted", "pickup_completed", etc.
    resource: v.string(), // "route", "stop", "assignment", etc.
    resourceId: v.optional(v.string()),
    method: v.union(
      v.literal("CREATE"),
      v.literal("READ"),
      v.literal("UPDATE"),
      v.literal("DELETE")
    ),

    // Context
    category: v.union(
      v.literal("authentication"),
      v.literal("authorization"),
      v.literal("data_access"),
      v.literal("data_modification"),
      v.literal("system_administration"),
      v.literal("emergency_access")
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("critical")
    ),

    // Details
    details: v.object({
      description: v.string(),
      changedFields: v.optional(v.array(v.string())),
      oldValues: v.optional(v.string()), // JSON stringified
      newValues: v.optional(v.string()), // JSON stringified

      // DISPATCH POC FIELDS (for compatibility)
      date: v.optional(v.string()),
      period: v.optional(v.string()),
      childName: v.optional(v.string()),
      driverName: v.optional(v.string()),
      count: v.optional(v.string()),
      fromDate: v.optional(v.string()),
    }),

    // Source
    sourceInfo: v.optional(v.object({
      ipAddress: v.optional(v.string()),
      deviceId: v.optional(v.string()),
      appVersion: v.optional(v.string()),
    })),

    // Compliance
    complianceFlags: v.optional(v.object({
      requiresRetention: v.boolean(),
      sensitiveData: v.boolean(),
      regulatoryRelevant: v.boolean(),
      exportRestricted: v.optional(v.boolean()),
      retentionPeriodYears: v.optional(v.float64()),
    })),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_user_action", ["userId", "action"])
    .index("by_resource", ["resource", "resourceId"])
    .index("by_log_id", ["logId"]),

  // ============================================================================
  // NOTIFICATIONS & MESSAGING - Shared by both apps
  // ============================================================================

  /**
   * Notifications - From driver app
   * Used by: Both apps for alerting users
   */
  notifications: defineTable({
    recipientId: v.string(),
    recipientType: v.union(
      v.literal("driver"),
      v.literal("dispatch"),
      v.literal("parent"),
      v.literal("supervisor")
    ),

    // Notification Type
    type: v.union(
      v.literal("schedule_change"),
      v.literal("emergency"),
      v.literal("message"),
      v.literal("system"),
      v.literal("pickup_completed"),
      v.literal("pickup_missed"),
      v.literal("child_emergency"),
      v.literal("route_delayed")
    ),

    // Content
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()), // Additional context

    // Priority
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low")
    ),

    // Delivery
    channels: v.array(v.union(
      v.literal("push"),
      v.literal("sms"),
      v.literal("email"),
      v.literal("in_app")
    )),
    deliveryStatus: v.optional(v.object({
      push: v.optional(v.union(v.literal("sent"), v.literal("delivered"), v.literal("failed"))),
      sms: v.optional(v.union(v.literal("sent"), v.literal("delivered"), v.literal("failed"))),
      in_app: v.optional(v.union(v.literal("sent"), v.literal("read"))),
    })),

    // Interaction
    deepLink: v.optional(v.string()),
    readAt: v.optional(v.string()),
    dismissedAt: v.optional(v.string()),

    // Metadata
    sentAt: v.string(),
    expiresAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_sent_at", ["sentAt"]),

  /**
   * Messages - From driver app
   * Used by: SMS Comms app future integration
   */
  messages: defineTable({
    fromId: v.string(),
    fromType: v.union(
      v.literal("driver"),
      v.literal("dispatch"),
      v.literal("parent"),
      v.literal("supervisor"),
      v.literal("system")
    ),
    toId: v.string(),
    toType: v.union(
      v.literal("driver"),
      v.literal("dispatch"),
      v.literal("parent"),
      v.literal("supervisor")
    ),

    // Content
    subject: v.optional(v.string()),
    content: v.string(),
    messageType: v.union(
      v.literal("normal"),
      v.literal("emergency"),
      v.literal("system_alert"),
      v.literal("route_update"),
      v.literal("parent_communication")
    ),

    // Priority
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    isEmergency: v.boolean(),

    // Context
    context: v.optional(v.object({
      routeId: v.optional(v.id("routes")),
      childId: v.optional(v.id("children")),
    })),

    // Delivery
    deliveryStatus: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed")
    ),
    deliveredAt: v.optional(v.string()),
    readAt: v.optional(v.string()),

    // Metadata
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_from_id", ["fromId"])
    .index("by_to_id", ["toId"])
    .index("by_priority", ["priority"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // DISPATCH-SPECIFIC TABLES - New additions
  // ============================================================================

  /**
   * Dispatch Events - High-level events for cross-app sync
   * NEW TABLE for unified system
   */
  dispatchEvents: defineTable({
    eventId: v.string(), // DE-YYYYMMDD-NNNNNN
    type: v.union(
      v.literal("schedule_changed"),
      v.literal("route_created"),
      v.literal("route_copied"),
      v.literal("child_picked_up"),
      v.literal("child_no_show"),
      v.literal("child_pre_cancel"),
      v.literal("route_completed"),
      v.literal("emergency_triggered")
    ),

    // References
    routeId: v.optional(v.id("routes")),
    stopId: v.optional(v.id("stops")),
    childId: v.optional(v.id("children")),
    driverId: v.optional(v.id("drivers")),

    // Event Data
    eventData: v.any(), // Flexible JSON data

    // SMS Hook Trigger (for future SMS Comms integration)
    triggerSms: v.boolean(),
    smsTriggered: v.optional(v.boolean()),
    smsTriggeredAt: v.optional(v.string()),

    // Metadata
    triggeredBy: v.string(), // userId or "system"
    timestamp: v.string(),
    createdAt: v.string(),
  })
    .index("by_type", ["type"])
    .index("by_route", ["routeId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_trigger_sms", ["triggerSms", "smsTriggered"]),

  /**
   * Schedule Templates - For copying previous day patterns
   * NEW TABLE for dispatch feature
   */
  scheduleTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),

    // Template applies to
    dayOfWeek: v.optional(v.number()), // 0=Sunday, 1=Monday, etc.
    period: v.union(v.literal("AM"), v.literal("PM")),

    // Template data (route assignments)
    assignments: v.array(v.object({
      childId: v.id("children"),
      driverId: v.id("drivers"),
      scheduledTime: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),

    // Usage tracking
    lastUsed: v.optional(v.string()),
    useCount: v.number(),

    // Status
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_active", ["isActive"])
    .index("by_period", ["period"])
    .index("by_day_period", ["dayOfWeek", "period"]),

  /**
   * Daily Summaries - Quick stats for dispatch dashboard
   * NEW TABLE for dispatch feature
   */
  dailySummaries: defineTable({
    date: v.string(), // ISO date

    // Counts
    totalRoutesAM: v.number(),
    totalRoutesPM: v.number(),
    completedRoutesAM: v.number(),
    completedRoutesPM: v.number(),
    activeChildren: v.number(),
    activeDrivers: v.number(),

    // Issues
    noShows: v.number(),
    delays: v.number(),
    emergencies: v.number(),

    // Performance
    onTimeRate: v.number(), // percentage
    averageCompletionTime: v.optional(v.number()), // minutes

    // Metadata
    calculatedAt: v.string(),
    createdAt: v.string(),
  })
    .index("by_date", ["date"]),

  // ============================================================================
  // SCHOOLS & DISTRICTS - New for Schools Feature
  // ============================================================================

  /**
   * Districts - School districts and their rates
   */
  districts: defineTable({
    districtName: v.string(),
    clientName: v.string(),
    rate: v.number(),
  })
    .index("by_district_name", ["districtName"]),

  /**
   * Schools - Static school information
   */
  schools: defineTable({
    districtId: v.id("districts"),
    schoolName: v.string(),
    streetAddress: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    officePhone: v.string(),
    firstDay: v.string(),
    lastDay: v.string(),
  })
    .index("by_school_name", ["schoolName"])
    .index("by_district", ["districtId"]),

  /**
   * School Contacts - Staff contact info
   */
  schoolContacts: defineTable({
    schoolId: v.id("schools"),
    contactType: v.string(), // "Primary", "Secondary", "Afterschool"
    firstName: v.string(),
    lastName: v.string(),
    title: v.string(),
    phone: v.string(),
    email: v.string(),
  })
    .index("by_school", ["schoolId"]),

  /**
   * School Schedules - Daily timings
   */
  schoolSchedules: defineTable({
    schoolId: v.id("schools"),
    amStartTime: v.string(),
    pmReleaseTime: v.string(),
    minDayDismissalTime: v.optional(v.string()),
    minimumDays: v.optional(v.string()), // e.g., "Varies", "Friday"
    earlyRelease: v.optional(v.string()),
    pmAftercare: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"]),

  /**
   * Non-School Days - Holidays and closures
   */
  nonSchoolDays: defineTable({
    schoolId: v.id("schools"),
    date: v.string(), // YYYY-MM-DD
    description: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"])
    .index("by_date", ["date"])
    .index("by_school_date", ["schoolId", "date"]),

  /**
   * Payroll Configuration - Pay rates and deductions
   * NEW TABLE for payroll reporting feature
   */
  payrollConfig: defineTable({
    // Pay rates (in dollars)
    baseRate: v.number(), // Default pay per completed trip
    noShowDeduction: v.number(), // Amount deducted for no-show trips
    preCancelDeduction: v.number(), // Amount deducted for pre-cancelled trips

    // Metadata
    updatedAt: v.string(),
    updatedBy: v.optional(v.string()), // Clerk user ID or "system"
  }),
});

