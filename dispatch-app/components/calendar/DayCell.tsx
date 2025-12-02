/**
 * DayCell Component
 *
 * Individual clickable day cell for the school calendar.
 * Displays the day number with visual state indicators.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export type DayState = 'school' | 'nonSchool' | 'weekend' | 'outside';

interface DayCellProps {
  day: number;
  state: DayState;
  isToday?: boolean;
  onPress?: () => void;
}

export function DayCell({ day, state, isToday, onPress }: DayCellProps) {
  const isDisabled = state === 'weekend' || state === 'outside';

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        state === 'school' && styles.schoolDay,
        state === 'nonSchool' && styles.nonSchoolDay,
        state === 'weekend' && styles.weekend,
        state === 'outside' && styles.outside,
        isToday && styles.today,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
    >
      {state === 'nonSchool' ? (
        <View style={styles.xContainer}>
          <Text style={styles.xMark}>X</Text>
          <Text style={styles.dayNumberSmall}>{day}</Text>
        </View>
      ) : (
        <Text
          style={[
            styles.dayNumber,
            isDisabled && styles.disabledText,
            isToday && styles.todayText,
          ]}
        >
          {day > 0 ? day : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 2,
  },
  schoolDay: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nonSchoolDay: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  weekend: {
    backgroundColor: '#F5F5F5',
  },
  outside: {
    backgroundColor: 'transparent',
  },
  today: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  todayText: {
    color: '#2196F3',
    fontWeight: '700',
  },
  xContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xMark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF5350',
    lineHeight: 18,
  },
  dayNumberSmall: {
    fontSize: 8,
    color: '#EF5350',
    marginTop: -4,
  },
});
