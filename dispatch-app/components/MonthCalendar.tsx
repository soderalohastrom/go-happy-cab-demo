/**
 * MonthCalendar Component
 * 
 * Displays a month view calendar with indicators showing which days have routes
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouteDateRange } from '../hooks/useConvexRoutes';

interface MonthCalendarProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateSelect: (date: string) => void;
}

export default function MonthCalendar({ selectedDate, onDateSelect }: MonthCalendarProps) {
  // Get the first and last day of the current month
  const { startDate, endDate } = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [selectedDate]);

  // Query routes for the month
  const routeSummary = useRouteDateRange(startDate, endDate);

  // Build marked dates object for the calendar
  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    // Mark selected date
    marked[selectedDate] = {
      selected: true,
      selectedColor: '#2196F3',
    };

    // Mark dates with routes
    if (routeSummary) {
      Object.entries(routeSummary).forEach(([date, counts]) => {
        const hasAM = counts.AM > 0;
        const hasPM = counts.PM > 0;

        // If this is the selected date, keep it selected but add dots
        if (date === selectedDate) {
          marked[date] = {
            ...marked[date],
            marked: true,
            dotColor: hasAM && hasPM ? '#4CAF50' : hasAM || hasPM ? '#FF9800' : undefined,
          };
        } else if (hasAM || hasPM) {
          // Non-selected dates with routes
          marked[date] = {
            marked: true,
            dotColor: hasAM && hasPM ? '#4CAF50' : '#FF9800',
          };
        }
      });
    }

    return marked;
  }, [selectedDate, routeSummary]);

  // Get route counts for selected date
  const selectedDateCounts = routeSummary?.[selectedDate];

  const handleDayPress = (day: DateData) => {
    onDateSelect(day.dateString);
  };

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
          monthTextColor: '#000',
          textMonthFontSize: 18,
          textMonthFontWeight: 'bold',
        }}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Both AM & PM scheduled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>AM or PM scheduled</Text>
        </View>
      </View>

      {/* Selected date summary */}
      {selectedDateCounts && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>AM Routes:</Text>
              <Text style={styles.summaryValue}>{selectedDateCounts.AM || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>PM Routes:</Text>
              <Text style={styles.summaryValue}>{selectedDateCounts.PM || 0}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  summary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

