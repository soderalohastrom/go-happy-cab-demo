// ============================================================
// TIME BOUNDARY HELPERS
// Determines what can be edited based on current time
// Used for past-period editing safeguards
// ============================================================

/**
 * Get current date in ISO format (YYYY-MM-DD) using local timezone
 */
export const getTodayISO = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Get current period based on time of day
 * AM: Before 12:00 PM (noon)
 * PM: 12:00 PM and after
 *
 * Note: This uses a simple noon cutoff. Adjust if your
 * dispatch operations have different AM/PM boundaries.
 */
export const getCurrentPeriod = (): 'AM' | 'PM' => {
  const now = new Date();
  return now.getHours() < 12 ? 'AM' : 'PM';
};

/**
 * Determine if a date/period combination is in the past
 * and therefore should be protected from editing
 */
export const isPastPeriod = (date: string, period: 'AM' | 'PM'): boolean => {
  const today = getTodayISO();

  // Past date = always past
  if (date < today) {
    return true;
  }

  // Future date = never past
  if (date > today) {
    return false;
  }

  // Same date: check period
  const currentPeriod = getCurrentPeriod();

  // If currently PM, then AM period has passed
  if (currentPeriod === 'PM' && period === 'AM') {
    return true;
  }

  return false;
};

/**
 * Get human-readable label for time status
 */
export const getPeriodStatusLabel = (date: string, period: 'AM' | 'PM'): string => {
  const today = getTodayISO();

  if (date < today) {
    return 'Past Date';
  }

  if (date > today) {
    return 'Future';
  }

  const currentPeriod = getCurrentPeriod();

  if (currentPeriod === 'PM' && period === 'AM') {
    return 'AM Complete';
  }

  if (period === currentPeriod) {
    return 'Active Now';
  }

  return 'Upcoming';
};

/**
 * Check if route can be modified based on status
 * Completed/no_show/cancelled routes should be protected
 */
export const isRouteEditable = (
  status: string,
  date: string,
  period: 'AM' | 'PM'
): { editable: boolean; reason?: string } => {

  // Terminal statuses = not editable
  const terminalStatuses = ['completed', 'no_show', 'cancelled', 'late_cancel'];
  if (terminalStatuses.includes(status)) {
    return {
      editable: false,
      reason: `Route already marked as ${status.replace('_', ' ')}`
    };
  }

  // Past period = not editable (unless admin override)
  if (isPastPeriod(date, period)) {
    return {
      editable: false,
      reason: 'This time period has passed'
    };
  }

  return { editable: true };
};

/**
 * Get editing permissions for current view
 * Returns flags for UI to use
 */
export const getEditPermissions = (date: string, period: 'AM' | 'PM') => {
  const past = isPastPeriod(date, period);
  const today = getTodayISO();

  return {
    canDragDrop: !past,
    canUnpair: !past,
    canCopyRoutes: date >= today,
    canDeleteRoutes: !past,
    showPastWarning: past,
    statusLabel: getPeriodStatusLabel(date, period),
  };
};

/**
 * Format date for display in warning messages
 * e.g., "AM on Dec 5" or "PM on Dec 5, 2025"
 */
export const formatPeriodLabel = (date: string, period: 'AM' | 'PM'): string => {
  const dateObj = new Date(date + 'T12:00:00'); // Avoid timezone issues
  const today = getTodayISO();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  // Add year if not current year
  const currentYear = new Date().getFullYear();
  if (dateObj.getFullYear() !== currentYear) {
    options.year = 'numeric';
  }

  const formattedDate = dateObj.toLocaleDateString('en-US', options);

  if (date === today) {
    return `${period} today`;
  }

  return `${period} on ${formattedDate}`;
};
