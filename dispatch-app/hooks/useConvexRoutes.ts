/**
 * Convex Hooks for Dispatch App
 * 
 * Provides React hooks for querying and mutating routes, children, and drivers
 */

import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';

/**
 * Get routes for a specific date and period (AM/PM)
 */
export function useRoutesForDatePeriod(date: string, period: 'AM' | 'PM') {
  const routes = useQuery(api.assignments.getForDatePeriod, { date, period });
  return routes;
}

/**
 * Get route summary for date range (for calendar)
 */
export function useRouteDateRange(startDate: string, endDate: string) {
  return useQuery(api.assignments.getForDateRange, { startDate, endDate });
}

/**
 * Get unassigned children for date/period
 */
export function useUnassignedChildren(date: string, period: 'AM' | 'PM') {
  const children = useQuery(api.assignments.getUnassignedChildren, { date, period });
  return children;
}

/**
 * Get unassigned drivers for date/period
 */
export function useUnassignedDrivers(date: string, period: 'AM' | 'PM') {
  return useQuery(api.assignments.getUnassignedDrivers, { date, period });
}

/**
 * Get all children
 */
export function useChildren() {
  return useQuery(api.children.list);
}

/**
 * Get all drivers
 */
export function useDrivers() {
  return useQuery(api.drivers.list);
}

/**
 * Create a new route assignment
 */
export function useCreateRoute() {
  return useMutation(api.assignments.create);
}

/**
 * Copy routes from previous day
 */
export function useCopyFromPreviousDay() {
  return useMutation(api.assignments.copyFromPreviousDay);
}

/**
 * Remove a route
 */
export function useRemoveRoute() {
  return useMutation(api.assignments.remove);
}

/**
 * Update route status
 */
export function useUpdateRouteStatus() {
  return useMutation(api.assignments.updateStatus);
}

/**
 * Copy routes from a specific date
 */
export function useCopyFromDate() {
  return useMutation(api.assignments.copyFromDate);
}

/**
 * Helper: Get today's date string in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Helper: Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Helper: Get date relative to today
 */
export function getRelativeDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// =============================================================================
// Dispatch Events - Real-time Sync with Driver App
// =============================================================================

/**
 * Get all events for a specific route
 * Shows event history: when driver marked pickup, when dispatcher created route, etc.
 */
export function useRouteEvents(routeId?: Id<"routes">) {
  return useQuery(
    api.dispatchEvents.getForRoute,
    routeId ? { routeId } : "skip"
  );
}

/**
 * Get recent dispatch events across all resources
 * Useful for real-time monitoring dashboard
 */
export function useRecentEvents(limit?: number) {
  return useQuery(api.dispatchEvents.getRecent, { limit });
}

/**
 * Get events by type (e.g., "status_changed")
 * Useful for filtering specific event types
 */
export function useEventsByType(eventType: string, limit?: number) {
  return useQuery(api.dispatchEvents.getByType, { eventType, limit });
}

/**
 * Get all events for a specific date
 * Shows all activity for a given day
 */
export function useEventsForDate(date: string) {
  return useQuery(api.dispatchEvents.getForDate, { date });
}

export function useRouteCountsForDate(date: string) {
  return useQuery(api.assignments.getRouteCountsForDate, { date });
}

export function useAllDrivers() {
  return useQuery(api.drivers.listAll);
}

export function useAddDriver() {
  return useAction(api.drivers.addDriver);
}

export function useDeactivateDriver() {
  return useMutation(api.drivers.deactivate);
}

export function useReactivateDriver() {
  return useMutation(api.drivers.reactivate);
}

export function useUpdateDriver() {
  return useMutation(api.drivers.update);
}

// =============================================================================
// Children Management
// =============================================================================

export function useAllChildren() {
  return useQuery(api.children.listAll);
}

export function useAddChild() {
  return useMutation(api.children.create);
}

export function useDeactivateChild() {
  return useMutation(api.children.deactivate);
}

export function useReactivateChild() {
  return useMutation(api.children.reactivate);
}

export function useUpdateChild() {
  return useMutation(api.children.update);
}

// =============================================================================
// Schools & Districts Management
// =============================================================================

/**
 * Get all districts with rates
 * Returns districts sorted alphabetically
 */
export function useAllDistricts() {
  return useQuery(api.schools.getDistricts);
}

/**
 * Get all schools with district information
 * Returns schools sorted alphabetically with enriched district data
 */
export function useAllSchools() {
  return useQuery(api.schools.getSchools);
}

/**
 * Get schools filtered by district
 * @param districtId - The district ID to filter by
 */
export function useSchoolsByDistrict(districtId: string | undefined) {
  return useQuery(
    api.schools.getSchoolsByDistrict,
    districtId ? { districtId: districtId as any } : "skip"
  );
}

/**
 * Get complete school details including contacts, schedule, and non-school days
 * @param schoolId - The school ID to fetch details for
 */
export function useSchoolDetails(schoolId: string | undefined) {
  return useQuery(
    api.schools.getSchoolDetails,
    schoolId ? { schoolId: schoolId as any } : "skip"
  );
}

/**
 * Add a new district
 */
export function useAddDistrict() {
  return useMutation(api.schools.importDistricts);
}

/**
 * Add a new school
 */
export function useAddSchool() {
  return useMutation(api.schools.importSchools);
}

/**
 * Add school contacts
 */
export function useAddSchoolContacts() {
  return useMutation(api.schools.importSchoolContacts);
}

/**
 * Add school schedule
 */
export function useAddSchoolSchedule() {
  return useMutation(api.schools.importSchoolSchedules);
}

/**
 * Add non-school days
 */
export function useAddNonSchoolDays() {
  return useMutation(api.schools.importNonSchoolDays);
}

/**
 * Update an existing district
 */
export function useUpdateDistrict() {
  return useMutation(api.schools.updateDistrict);
}

/**
 * Update an existing school
 */
export function useUpdateSchool() {
  return useMutation(api.schools.updateSchool);
}

// =============================================================================
// School Calendar - Non-School Days & Schedule Mutations
// =============================================================================

/**
 * Add a single non-school day (for immediate toggle)
 */
export function useAddNonSchoolDay() {
  return useMutation(api.schools.addNonSchoolDay);
}

/**
 * Remove a single non-school day (for immediate toggle)
 */
export function useRemoveNonSchoolDay() {
  return useMutation(api.schools.removeNonSchoolDay);
}

/**
 * Bulk update non-school days (for Save operation)
 * Efficiently adds and removes multiple dates in one transaction
 */
export function useBulkUpdateNonSchoolDays() {
  return useMutation(api.schools.bulkUpdateNonSchoolDays);
}

/**
 * Create or update school schedule times
 * Handles AM start, PM release, minimum day, aftercare times
 */
export function useUpsertSchoolSchedule() {
  return useMutation(api.schools.upsertSchoolSchedule);
}

// =============================================================================
// Reports - Specialized Report Queries
// =============================================================================

/**
 * Get driver-child assignment pairings for a specific date and period
 * Used for: Assignments Report Tab
 */
export function useDriverChildReport(date: string, period: 'AM' | 'PM') {
  return useQuery(api.reports.getRoutesForDateRange, { date, period });
}

/**
 * Get district/school hierarchy with children for a specific date and period
 * Used for: Districts Report Tab
 */
export function useDistrictSchoolReport(date: string, period: 'AM' | 'PM') {
  return useQuery(api.reports.getDistrictSchoolReport, { date, period });
}

// =============================================================================
// Route Scheduling - Smart Copy System
// =============================================================================

/**
 * Get the last valid schedule date (14-day lookback)
 * Returns the most recent date with routes before the target date
 */
export function useLastValidScheduleDate(targetDate: string) {
  return useQuery(api.assignments.getLastValidScheduleDate, { targetDate });
}

/**
 * Get scheduling alerts for a specific date
 * Returns closures, early dismissals, and other schedule modifications
 * @param simulateAllClosed - "Rain Day Test" mode to simulate all schools closed
 */
export function useSchedulingAlerts(date: string, simulateAllClosed?: boolean) {
  return useQuery(api.schools.getSchedulingAlertsForDate, {
    date,
    simulateAllClosed: simulateAllClosed || false
  });
}

/**
 * Copy routes from the last valid day (Smart Copy)
 * Filters out children whose schools are closed on the target date
 */
export function useCopyFromLastValidDay() {
  return useMutation(api.assignments.copyFromLastValidDay);
}

/**
 * =====================================================================
 * Mutations
 */

