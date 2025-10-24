/**
 * Convex Hooks for Dispatch App
 * 
 * Provides React hooks for querying and mutating routes, children, and drivers
 */

import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

/**
 * Get routes for a specific date and period (AM/PM)
 */
export function useRoutesForDatePeriod(date: string, period: 'AM' | 'PM') {
  return useQuery(api.assignments.getForDatePeriod, { date, period });
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
  return useQuery(api.assignments.getUnassignedChildren, { date, period });
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

