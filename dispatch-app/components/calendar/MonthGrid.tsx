/**
 * MonthGrid Component
 *
 * Renders a single month's M-F grid for the school calendar.
 * Shows only weekdays (Monday through Friday).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DayCell, DayState } from './DayCell';

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  nonSchoolDates: Set<string>; // Set of "YYYY-MM-DD" strings
  firstDayOfSchool: string; // "YYYY-MM-DD"
  lastDayOfSchool: string; // "YYYY-MM-DD"
  onDayPress: (date: string) => void;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthGrid({
  year,
  month,
  nonSchoolDates,
  firstDayOfSchool,
  lastDayOfSchool,
  onDayPress,
}: MonthGridProps) {
  const today = new Date().toISOString().split('T')[0];

  // Get all weekdays in this month organized by week
  const weeks = getWeeksInMonth(year, month);

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>
        {MONTH_NAMES[month]} {year}
      </Text>

      {/* Weekday headers */}
      <View style={styles.headerRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.headerCell}>
            <Text style={styles.headerText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((dayInfo, dayIndex) => {
            if (!dayInfo) {
              // Empty cell for padding
              return <View key={dayIndex} style={styles.emptyCell} />;
            }

            const { day, dateString } = dayInfo;
            const state = getDayState(dateString, nonSchoolDates, firstDayOfSchool, lastDayOfSchool);

            return (
              <DayCell
                key={dayIndex}
                day={day}
                state={state}
                isToday={dateString === today}
                onPress={() => onDayPress(dateString)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Helper: Get day state based on date
function getDayState(
  dateString: string,
  nonSchoolDates: Set<string>,
  firstDay: string,
  lastDay: string
): DayState {
  // Check if outside school year
  if (dateString < firstDay || dateString > lastDay) {
    return 'outside';
  }

  // Check if it's a non-school day
  if (nonSchoolDates.has(dateString)) {
    return 'nonSchool';
  }

  return 'school';
}

// Helper: Get all weekdays organized by week
function getWeeksInMonth(
  year: number,
  month: number
): (({ day: number; dateString: string } | null)[])[] {
  const weeks: (({ day: number; dateString: string } | null)[])[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let currentWeek: ({ day: number; dateString: string } | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // Monday = 0 index, Friday = 4 index in our grid
    const gridIndex = dayOfWeek - 1;

    // If this is Monday and we have a previous week, push it
    if (gridIndex === 0 && currentWeek.length > 0) {
      // Pad the previous week to 5 days
      while (currentWeek.length < 5) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }

    // Pad with empty cells at the start of the week
    while (currentWeek.length < gridIndex) {
      currentWeek.push(null);
    }

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentWeek.push({ day, dateString });
  }

  // Push the last week if it has content
  if (currentWeek.length > 0) {
    while (currentWeek.length < 5) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 220,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerCell: {
    width: 36,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emptyCell: {
    width: 36,
    height: 36,
    margin: 2,
  },
});
