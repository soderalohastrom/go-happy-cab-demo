/**
 * Intake Form Mutations
 * 
 * Handles transportation request form submissions from the consumer website.
 * These are public mutations (no auth required) for the intake form.
 * 
 * @module convex/intake
 * @added December 4, 2025
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new transportation request from the intake form
 * 
 * This is a PUBLIC mutation - no authentication required.
 * Form submissions go to "pending" status for admin review.
 */
export const createRequest = mutation({
  args: {
    // Request Details
    requestDate: v.string(),
    serviceStartDate: v.string(),
    durationOfRequest: v.optional(v.string()),
    
    // Requestor Info
    requestorName: v.string(),
    requestorTitle: v.optional(v.string()),
    requestorPhone: v.optional(v.string()),
    requestorEmail: v.optional(v.string()),
    coordinatorName: v.optional(v.string()),
    coordinatorPhone: v.optional(v.string()),
    coordinatorEmail: v.optional(v.string()),
    billingContact: v.optional(v.string()),
    billingPhone: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    billingCode: v.optional(v.string()),
    districtName: v.string(),
    
    // Rider/Student Info
    studentName: v.string(),
    dateOfBirth: v.string(),
    gender: v.optional(v.string()),
    grade: v.optional(v.string()),
    disability: v.optional(v.string()),
    address: v.string(),
    riderPrimaryLanguage: v.optional(v.string()),
    residencePrimaryLanguage: v.optional(v.string()),
    
    // Rider Status Flags
    transportationInIEP: v.boolean(),
    residesWithParents: v.boolean(),
    residesWithGuardian: v.boolean(),
    residesWithOther: v.boolean(),
    mckinneyVento: v.boolean(),
    residentialFacility: v.boolean(),
    
    // Guardian Info
    primaryGuardianName: v.optional(v.string()),
    primaryGuardianCell: v.optional(v.string()),
    primaryGuardianRelationship: v.optional(v.string()),
    primaryGuardianEmail: v.optional(v.string()),
    secondaryGuardianName: v.optional(v.string()),
    secondaryGuardianCell: v.optional(v.string()),
    secondaryGuardianRelationship: v.optional(v.string()),
    caregiverName: v.optional(v.string()),
    caregiverCell: v.optional(v.string()),
    caregiverHours: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactCell: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    guardiansResideWithRider: v.boolean(),
    guardianAddressIfNo: v.optional(v.string()),
    
    // Transportation Info
    amPickupLocation: v.optional(v.string()),
    amPickupTime: v.optional(v.string()),
    amDropLocation: v.optional(v.string()),
    dropOffWindow: v.optional(v.string()),
    bellTime: v.optional(v.string()),
    transportSpecialInstructions: v.optional(v.string()),
    
    // School Info
    schoolName: v.optional(v.string()),
    schoolAddress: v.optional(v.string()),
    schoolType: v.optional(v.string()),
    schoolAmBellTime: v.optional(v.string()),
    schoolPmPickupTime: v.optional(v.string()),
    schoolEarlyOutTime: v.optional(v.string()),
    schoolSpecialInstructions: v.optional(v.string()),
    scheduleMTH: v.optional(v.string()),
    scheduleFri: v.optional(v.string()),
    
    // School Staff
    primaryTeacherName: v.optional(v.string()),
    primaryTeacherPhone: v.optional(v.string()),
    primaryTeacherEmail: v.optional(v.string()),
    secondaryContactName: v.optional(v.string()),
    secondaryContactPhone: v.optional(v.string()),
    secondaryContactTitle: v.optional(v.string()),
    schoolEmergencyContactName: v.optional(v.string()),
    schoolEmergencyContactCell: v.optional(v.string()),
    schoolEmergencyContactTitle: v.optional(v.string()),
    counsellorName: v.optional(v.string()),
    counsellorPhone: v.optional(v.string()),
    counsellorEmail: v.optional(v.string()),
    classroomAideName: v.optional(v.string()),
    classroomAideCell: v.optional(v.string()),
    classroomAideEmail: v.optional(v.string()),
    
    // Special Needs Flags
    behavior: v.boolean(),
    behaviorPlanAttached: v.boolean(),
    adultSupervision: v.boolean(),
    adultSupervisionDetails: v.optional(v.string()),
    directHandoff: v.boolean(),
    vehicleEquipmentReq: v.boolean(),
    vanOrLarger: v.boolean(),
    wheelchairVan: v.boolean(),
    walker: v.boolean(),
    wheelchair: v.boolean(),
    booster: v.boolean(),
    carSeat: v.boolean(),
    medicalConcerns: v.boolean(),
    healthcarePlanAttached: v.boolean(),
    nonVerbal: v.boolean(),
    medicalTechnology: v.boolean(),
    seizureDisorder: v.boolean(),
    seizurePlanAttached: v.boolean(),
    assistiveDevices: v.boolean(),
    medicationDuringTransport: v.boolean(),
    severeAllergies: v.boolean(),
    temperatureSensitivity: v.boolean(),
    chokingConcerns: v.boolean(),
    flightRisk: v.boolean(),
    noiseSensitivity: v.boolean(),
    mustRideSolo: v.boolean(),
    aggressiveSelf: v.boolean(),
    aggressiveOthers: v.boolean(),
    transitionTools: v.boolean(),
    requiresCompanion: v.boolean(),
    requiresTransportAide: v.boolean(),
    musicPreferences: v.boolean(),
    prefersMaleDriver: v.boolean(),
    prefersFemaleDriver: v.boolean(),
    noConversation: v.boolean(),
    transportToIEP: v.boolean(),
    iepServiceLocationDetails: v.optional(v.string()),
    beforeAfterCare: v.boolean(),
    beforeAfterCareDetails: v.optional(v.string()),
    otherSpecialNeeds: v.optional(v.string()),
    
    // Comments
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const requestId = await ctx.db.insert("transportationRequests", {
      ...args,
      status: "pending",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    
    return requestId;
  },
});

/**
 * Get all pending transportation requests (for admin dashboard)
 */
export const getPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transportationRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single transportation request by ID
 */
export const getRequest = query({
  args: { id: v.id("transportationRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update request status (for admin review)
 */
export const updateRequestStatus = mutation({
  args: {
    id: v.id("transportationRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("archived")
    ),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewNotes: args.reviewNotes,
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      updatedAt: now,
    });
    
    return args.id;
  },
});
