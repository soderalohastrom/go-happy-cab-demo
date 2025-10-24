"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var server_1 = require("convex/server");
var values_1 = require("convex/values");
/**
 * Unified Go Happy Cab Schema
 *
 * Supports both Dispatch App and Driver App with shared data model.
 * Based on driver app's production schema with dispatch-specific enhancements.
 */
exports.default = (0, server_1.defineSchema)({
    // ============================================================================
    // CORE ENTITIES - Shared by both apps
    // ============================================================================
    /**
     * Drivers - Full schema from driver app
     * Used by: Both apps (dispatch assigns, driver logs in)
     */
    drivers: (0, server_1.defineTable)({
        // Basic Info
        employeeId: values_1.v.string(),
        firstName: values_1.v.string(),
        lastName: values_1.v.string(),
        email: values_1.v.string(),
        phone: values_1.v.string(),
        // Authentication (driver app)
        pin: values_1.v.optional(values_1.v.string()), // Hashed with salt
        biometricEnabled: values_1.v.optional(values_1.v.boolean()),
        // Status
        status: values_1.v.union(values_1.v.literal("active"), values_1.v.literal("inactive"), values_1.v.literal("on_shift"), values_1.v.literal("off_shift"), values_1.v.literal("suspended")),
        role: values_1.v.union(values_1.v.literal("driver"), values_1.v.literal("supervisor"), values_1.v.literal("dispatcher"), values_1.v.literal("admin")),
        // Credentials
        licenseNumber: values_1.v.optional(values_1.v.string()),
        licenseExpiry: values_1.v.optional(values_1.v.string()),
        // Emergency Contact
        emergencyContact: values_1.v.optional(values_1.v.object({
            name: values_1.v.string(),
            phone: values_1.v.string(),
            relationship: values_1.v.string(),
        })),
        // Performance Metrics (driver app)
        performanceMetrics: values_1.v.optional(values_1.v.object({
            totalRoutes: values_1.v.number(),
            onTimeRate: values_1.v.number(),
            safetyScore: values_1.v.number(),
            incidentCount: values_1.v.number(),
            parentRating: values_1.v.number(),
        })),
        // Metadata
        active: values_1.v.boolean(), // Simplified active flag for dispatch
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
    })
        .index("by_employee_id", ["employeeId"])
        .index("by_email", ["email"])
        .index("by_status", ["status"])
        .index("by_active", ["active"]),
    /**
     * Children - Full schema from driver app
     * Used by: Both apps (dispatch assigns, driver views routes)
     */
    children: (0, server_1.defineTable)({
        // Basic Info
        firstName: values_1.v.string(),
        lastName: values_1.v.string(),
        middleName: values_1.v.optional(values_1.v.string()),
        preferredName: values_1.v.optional(values_1.v.string()),
        dateOfBirth: values_1.v.string(),
        grade: values_1.v.string(),
        studentId: values_1.v.string(),
        // School Info
        schoolId: values_1.v.optional(values_1.v.string()),
        schoolName: values_1.v.string(),
        // Addresses (driver app needs)
        homeAddress: values_1.v.optional(values_1.v.object({
            street: values_1.v.string(),
            city: values_1.v.string(),
            state: values_1.v.string(),
            zip: values_1.v.string(),
            coordinates: values_1.v.optional(values_1.v.object({
                latitude: values_1.v.number(),
                longitude: values_1.v.number(),
            })),
            accessInstructions: values_1.v.optional(values_1.v.string()),
        })),
        schoolAddress: values_1.v.optional(values_1.v.object({
            street: values_1.v.string(),
            city: values_1.v.string(),
            state: values_1.v.string(),
            zip: values_1.v.string(),
            coordinates: values_1.v.optional(values_1.v.object({
                latitude: values_1.v.number(),
                longitude: values_1.v.number(),
            })),
            dropoffLocation: values_1.v.optional(values_1.v.string()),
            pickupLocation: values_1.v.optional(values_1.v.string()),
        })),
        // Special Needs (driver app critical)
        specialNeeds: values_1.v.optional(values_1.v.array(values_1.v.string())),
        medicalInfo: values_1.v.optional(values_1.v.object({
            allergies: values_1.v.array(values_1.v.string()),
            medicalConditions: values_1.v.array(values_1.v.string()),
            emergencyProcedures: values_1.v.optional(values_1.v.string()),
            equipmentNeeds: values_1.v.array(values_1.v.string()),
        })),
        // Transportation Notes
        pickupInstructions: values_1.v.optional(values_1.v.string()),
        dropoffInstructions: values_1.v.optional(values_1.v.string()),
        transportationNotes: values_1.v.optional(values_1.v.string()),
        // Parent References
        parentIds: values_1.v.optional(values_1.v.array(values_1.v.string())),
        // Status
        active: values_1.v.boolean(),
        photoPermission: values_1.v.optional(values_1.v.boolean()),
        // Metadata
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
    })
        .index("by_last_name", ["lastName"])
        .index("by_school", ["schoolId"])
        .index("by_active", ["active"])
        .index("by_student_id", ["studentId"]),
    /**
     * Parents - From driver app
     * Used by: Both apps (SMS notifications, emergency contacts)
     */
    parents: (0, server_1.defineTable)({
        firstName: values_1.v.string(),
        lastName: values_1.v.string(),
        email: values_1.v.string(),
        phone: values_1.v.string(),
        alternatePhone: values_1.v.optional(values_1.v.string()),
        // Address
        address: values_1.v.optional(values_1.v.object({
            street: values_1.v.string(),
            city: values_1.v.string(),
            state: values_1.v.string(),
            zip: values_1.v.string(),
        })),
        // Relationship
        relationship: values_1.v.string(), // mother, father, guardian, etc.
        isPrimary: values_1.v.boolean(),
        canPickup: values_1.v.boolean(),
        // Communication Preferences
        preferredContactMethod: values_1.v.union(values_1.v.literal("phone"), values_1.v.literal("text"), values_1.v.literal("email"), values_1.v.literal("app")),
        communicationPreferences: values_1.v.optional(values_1.v.object({
            emergencyOnly: values_1.v.boolean(),
            dailyUpdates: values_1.v.boolean(),
            pickupNotifications: values_1.v.boolean(),
            delayAlerts: values_1.v.boolean(),
        })),
        // Status
        active: values_1.v.boolean(),
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
    })
        .index("by_email", ["email"])
        .index("by_phone", ["phone"])
        .index("by_active", ["active"]),
    /**
     * Child-Parent Relationships
     * Used by: SMS notifications, emergency contacts
     */
    childParentRelationships: (0, server_1.defineTable)({
        childId: values_1.v.id("children"),
        parentId: values_1.v.id("parents"),
        relationship: values_1.v.string(),
        isPrimary: values_1.v.boolean(),
        pickupAuthorized: values_1.v.boolean(),
        emergencyContact: values_1.v.boolean(),
        createdAt: values_1.v.string(),
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
    routes: (0, server_1.defineTable)({
        // Scheduling (DISPATCH USES THIS)
        date: values_1.v.string(), // ISO date "2025-10-24"
        period: values_1.v.union(values_1.v.literal("AM"), values_1.v.literal("PM")), // DISPATCH ADDITION
        type: values_1.v.union(values_1.v.literal("pickup"), values_1.v.literal("dropoff")), // Usually matches period
        // Assignment
        driverId: values_1.v.id("drivers"),
        childId: values_1.v.id("children"), // DISPATCH SIMPLIFICATION: One route per child
        vehicleId: values_1.v.optional(values_1.v.string()),
        // Status
        status: values_1.v.union(values_1.v.literal("draft"), values_1.v.literal("scheduled"), values_1.v.literal("assigned"), values_1.v.literal("in_progress"), values_1.v.literal("completed"), values_1.v.literal("cancelled"), values_1.v.literal("emergency_stop")),
        // Priority
        priority: values_1.v.optional(values_1.v.union(values_1.v.literal("normal"), values_1.v.literal("high"), values_1.v.literal("emergency"))),
        // Timing
        scheduledTime: values_1.v.optional(values_1.v.string()), // Expected pickup/dropoff time
        actualStartTime: values_1.v.optional(values_1.v.string()),
        actualEndTime: values_1.v.optional(values_1.v.string()),
        estimatedDuration: values_1.v.optional(values_1.v.number()), // minutes
        actualDuration: values_1.v.optional(values_1.v.number()),
        // Tracking (DRIVER APP USES THIS)
        childPresent: values_1.v.optional(values_1.v.boolean()), // Did child show up?
        childCondition: values_1.v.optional(values_1.v.string()), // "good", "sick", "upset", "absent"
        parentNotified: values_1.v.optional(values_1.v.boolean()),
        skipReason: values_1.v.optional(values_1.v.string()), // If child was a no-show
        driverNotes: values_1.v.optional(values_1.v.string()),
        // Metadata
        createdAt: values_1.v.string(),
        createdBy: values_1.v.optional(values_1.v.string()), // dispatcher or system
        updatedAt: values_1.v.string(),
    })
        .index("by_driver_date", ["driverId", "date"])
        .index("by_date_period", ["date", "period"]) // DISPATCH PRIMARY INDEX
        .index("by_date_period_child", ["date", "period", "childId"]) // Prevent double-booking
        .index("by_date_period_driver", ["date", "period", "driverId"]) // Prevent double-booking
        .index("by_status", ["status"])
        .index("by_child", ["childId"]),
    /**
     * Stops - Individual pickup/dropoff points (from driver app)
     * Used by: Driver app for detailed route execution
     * Note: Dispatch app works at route level, driver app works at stop level
     */
    stops: (0, server_1.defineTable)({
        routeId: values_1.v.id("routes"),
        childId: values_1.v.id("children"),
        sequence: values_1.v.number(), // Order of stops
        type: values_1.v.union(values_1.v.literal("pickup"), values_1.v.literal("dropoff")),
        // Location
        location: values_1.v.object({
            address: values_1.v.string(),
            coordinates: values_1.v.optional(values_1.v.object({
                latitude: values_1.v.number(),
                longitude: values_1.v.number(),
            })),
            accessNotes: values_1.v.optional(values_1.v.string()),
        }),
        // Timing
        scheduledTime: values_1.v.string(),
        actualTime: values_1.v.optional(values_1.v.string()),
        estimatedDelay: values_1.v.optional(values_1.v.number()), // minutes
        // Status (DRIVER APP UPDATES THIS)
        status: values_1.v.union(values_1.v.literal("pending"), values_1.v.literal("approaching"), values_1.v.literal("arrived"), values_1.v.literal("completed"), values_1.v.literal("skipped"), values_1.v.literal("delayed"), values_1.v.literal("cancelled")),
        // Child Status
        childPresent: values_1.v.optional(values_1.v.boolean()),
        childCondition: values_1.v.optional(values_1.v.string()),
        parentNotified: values_1.v.optional(values_1.v.boolean()),
        waitTimeMinutes: values_1.v.optional(values_1.v.number()),
        skipReason: values_1.v.optional(values_1.v.string()),
        // Notes
        notes: values_1.v.optional(values_1.v.string()),
        driverNotes: values_1.v.optional(values_1.v.string()),
        // Metadata
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
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
    auditLogs: (0, server_1.defineTable)({
        logId: values_1.v.string(), // AL-YYYYMMDD-NNNNNN
        timestamp: values_1.v.string(),
        // Actor
        userId: values_1.v.optional(values_1.v.string()),
        userType: values_1.v.union(values_1.v.literal("driver"), values_1.v.literal("supervisor"), values_1.v.literal("admin"), values_1.v.literal("dispatcher"), // DISPATCH ADDITION
        values_1.v.literal("system")),
        // Action
        action: values_1.v.string(), // "created", "updated", "deleted", "pickup_completed", etc.
        resource: values_1.v.string(), // "route", "stop", "assignment", etc.
        resourceId: values_1.v.optional(values_1.v.string()),
        method: values_1.v.union(values_1.v.literal("CREATE"), values_1.v.literal("READ"), values_1.v.literal("UPDATE"), values_1.v.literal("DELETE")),
        // Context
        category: values_1.v.union(values_1.v.literal("authentication"), values_1.v.literal("authorization"), values_1.v.literal("data_access"), values_1.v.literal("data_modification"), values_1.v.literal("system_administration"), values_1.v.literal("emergency_access")),
        severity: values_1.v.union(values_1.v.literal("info"), values_1.v.literal("warning"), values_1.v.literal("error"), values_1.v.literal("critical")),
        // Details
        details: values_1.v.object({
            description: values_1.v.string(),
            changedFields: values_1.v.optional(values_1.v.array(values_1.v.string())),
            oldValues: values_1.v.optional(values_1.v.string()), // JSON stringified
            newValues: values_1.v.optional(values_1.v.string()), // JSON stringified
            // DISPATCH POC FIELDS (for compatibility)
            date: values_1.v.optional(values_1.v.string()),
            period: values_1.v.optional(values_1.v.string()),
            childName: values_1.v.optional(values_1.v.string()),
            driverName: values_1.v.optional(values_1.v.string()),
            count: values_1.v.optional(values_1.v.string()),
            fromDate: values_1.v.optional(values_1.v.string()),
        }),
        // Source
        sourceInfo: values_1.v.optional(values_1.v.object({
            ipAddress: values_1.v.optional(values_1.v.string()),
            deviceId: values_1.v.optional(values_1.v.string()),
            appVersion: values_1.v.optional(values_1.v.string()),
        })),
        // Compliance
        complianceFlags: values_1.v.optional(values_1.v.object({
            requiresRetention: values_1.v.boolean(),
            sensitiveData: values_1.v.boolean(),
            regulatoryRelevant: values_1.v.boolean(),
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
    notifications: (0, server_1.defineTable)({
        recipientId: values_1.v.string(),
        recipientType: values_1.v.union(values_1.v.literal("driver"), values_1.v.literal("dispatch"), values_1.v.literal("parent"), values_1.v.literal("supervisor")),
        // Notification Type
        type: values_1.v.union(values_1.v.literal("schedule_change"), values_1.v.literal("emergency"), values_1.v.literal("message"), values_1.v.literal("system"), values_1.v.literal("pickup_completed"), values_1.v.literal("pickup_missed"), values_1.v.literal("child_emergency"), values_1.v.literal("route_delayed")),
        // Content
        title: values_1.v.string(),
        body: values_1.v.string(),
        data: values_1.v.optional(values_1.v.any()), // Additional context
        // Priority
        priority: values_1.v.union(values_1.v.literal("critical"), values_1.v.literal("high"), values_1.v.literal("normal"), values_1.v.literal("low")),
        // Delivery
        channels: values_1.v.array(values_1.v.union(values_1.v.literal("push"), values_1.v.literal("sms"), values_1.v.literal("email"), values_1.v.literal("in_app"))),
        deliveryStatus: values_1.v.optional(values_1.v.object({
            push: values_1.v.optional(values_1.v.union(values_1.v.literal("sent"), values_1.v.literal("delivered"), values_1.v.literal("failed"))),
            sms: values_1.v.optional(values_1.v.union(values_1.v.literal("sent"), values_1.v.literal("delivered"), values_1.v.literal("failed"))),
            in_app: values_1.v.optional(values_1.v.union(values_1.v.literal("sent"), values_1.v.literal("read"))),
        })),
        // Interaction
        deepLink: values_1.v.optional(values_1.v.string()),
        readAt: values_1.v.optional(values_1.v.string()),
        dismissedAt: values_1.v.optional(values_1.v.string()),
        // Metadata
        sentAt: values_1.v.string(),
        expiresAt: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.string(),
    })
        .index("by_recipient", ["recipientId"])
        .index("by_type", ["type"])
        .index("by_priority", ["priority"])
        .index("by_sent_at", ["sentAt"]),
    /**
     * Messages - From driver app
     * Used by: SMS Comms app future integration
     */
    messages: (0, server_1.defineTable)({
        fromId: values_1.v.string(),
        fromType: values_1.v.union(values_1.v.literal("driver"), values_1.v.literal("dispatch"), values_1.v.literal("parent"), values_1.v.literal("supervisor"), values_1.v.literal("system")),
        toId: values_1.v.string(),
        toType: values_1.v.union(values_1.v.literal("driver"), values_1.v.literal("dispatch"), values_1.v.literal("parent"), values_1.v.literal("supervisor")),
        // Content
        subject: values_1.v.optional(values_1.v.string()),
        content: values_1.v.string(),
        messageType: values_1.v.union(values_1.v.literal("normal"), values_1.v.literal("emergency"), values_1.v.literal("system_alert"), values_1.v.literal("route_update"), values_1.v.literal("parent_communication")),
        // Priority
        priority: values_1.v.union(values_1.v.literal("critical"), values_1.v.literal("high"), values_1.v.literal("medium"), values_1.v.literal("low")),
        isEmergency: values_1.v.boolean(),
        // Context
        context: values_1.v.optional(values_1.v.object({
            routeId: values_1.v.optional(values_1.v.id("routes")),
            childId: values_1.v.optional(values_1.v.id("children")),
        })),
        // Delivery
        deliveryStatus: values_1.v.union(values_1.v.literal("pending"), values_1.v.literal("sent"), values_1.v.literal("delivered"), values_1.v.literal("read"), values_1.v.literal("failed")),
        deliveredAt: values_1.v.optional(values_1.v.string()),
        readAt: values_1.v.optional(values_1.v.string()),
        // Metadata
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
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
    dispatchEvents: (0, server_1.defineTable)({
        eventId: values_1.v.string(), // DE-YYYYMMDD-NNNNNN
        type: values_1.v.union(values_1.v.literal("schedule_changed"), values_1.v.literal("route_created"), values_1.v.literal("route_copied"), values_1.v.literal("child_picked_up"), values_1.v.literal("child_no_show"), values_1.v.literal("child_pre_cancel"), values_1.v.literal("route_completed"), values_1.v.literal("emergency_triggered")),
        // References
        routeId: values_1.v.optional(values_1.v.id("routes")),
        stopId: values_1.v.optional(values_1.v.id("stops")),
        childId: values_1.v.optional(values_1.v.id("children")),
        driverId: values_1.v.optional(values_1.v.id("drivers")),
        // Event Data
        eventData: values_1.v.any(), // Flexible JSON data
        // SMS Hook Trigger (for future SMS Comms integration)
        triggerSms: values_1.v.boolean(),
        smsTriggered: values_1.v.optional(values_1.v.boolean()),
        smsTriggeredAt: values_1.v.optional(values_1.v.string()),
        // Metadata
        triggeredBy: values_1.v.string(), // userId or "system"
        timestamp: values_1.v.string(),
        createdAt: values_1.v.string(),
    })
        .index("by_type", ["type"])
        .index("by_route", ["routeId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_trigger_sms", ["triggerSms", "smsTriggered"]),
    /**
     * Schedule Templates - For copying previous day patterns
     * NEW TABLE for dispatch feature
     */
    scheduleTemplates: (0, server_1.defineTable)({
        name: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        // Template applies to
        dayOfWeek: values_1.v.optional(values_1.v.number()), // 0=Sunday, 1=Monday, etc.
        period: values_1.v.union(values_1.v.literal("AM"), values_1.v.literal("PM")),
        // Template data (route assignments)
        assignments: values_1.v.array(values_1.v.object({
            childId: values_1.v.id("children"),
            driverId: values_1.v.id("drivers"),
            scheduledTime: values_1.v.optional(values_1.v.string()),
            notes: values_1.v.optional(values_1.v.string()),
        })),
        // Usage tracking
        lastUsed: values_1.v.optional(values_1.v.string()),
        useCount: values_1.v.number(),
        // Status
        isActive: values_1.v.boolean(),
        createdBy: values_1.v.string(),
        createdAt: values_1.v.string(),
        updatedAt: values_1.v.string(),
    })
        .index("by_active", ["isActive"])
        .index("by_period", ["period"])
        .index("by_day_period", ["dayOfWeek", "period"]),
    /**
     * Daily Summaries - Quick stats for dispatch dashboard
     * NEW TABLE for dispatch feature
     */
    dailySummaries: (0, server_1.defineTable)({
        date: values_1.v.string(), // ISO date
        // Counts
        totalRoutesAM: values_1.v.number(),
        totalRoutesPM: values_1.v.number(),
        completedRoutesAM: values_1.v.number(),
        completedRoutesPM: values_1.v.number(),
        activeChildren: values_1.v.number(),
        activeDrivers: values_1.v.number(),
        // Issues
        noShows: values_1.v.number(),
        delays: values_1.v.number(),
        emergencies: values_1.v.number(),
        // Performance
        onTimeRate: values_1.v.number(), // percentage
        averageCompletionTime: values_1.v.optional(values_1.v.number()), // minutes
        // Metadata
        calculatedAt: values_1.v.string(),
        createdAt: values_1.v.string(),
    })
        .index("by_date", ["date"]),
});
