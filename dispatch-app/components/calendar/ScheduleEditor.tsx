/**
 * ScheduleEditor Component
 *
 * Time input fields for AM/PM schedule times.
 * Allows editing AM start, PM release, minimum day, and aftercare times.
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export interface ScheduleData {
  amStartTime: string;
  pmReleaseTime: string;
  minDayDismissalTime: string;
  pmAftercare: string;
}

interface ScheduleEditorProps {
  schedule: ScheduleData;
  onChange: (field: keyof ScheduleData, value: string) => void;
}

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Daily Schedule</Text>

      <View style={styles.row}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>AM Start</Text>
          <TextInput
            style={styles.input}
            value={schedule.amStartTime}
            onChangeText={(value) => onChange('amStartTime', value)}
            placeholder="8:45 AM"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>PM Release</Text>
          <TextInput
            style={styles.input}
            value={schedule.pmReleaseTime}
            onChangeText={(value) => onChange('pmReleaseTime', value)}
            placeholder="3:15 PM"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Min Day</Text>
          <TextInput
            style={styles.input}
            value={schedule.minDayDismissalTime}
            onChangeText={(value) => onChange('minDayDismissalTime', value)}
            placeholder="12:30 PM"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Aftercare</Text>
          <TextInput
            style={styles.input}
            value={schedule.pmAftercare}
            onChangeText={(value) => onChange('pmAftercare', value)}
            placeholder="6:00 PM"
            placeholderTextColor="#999"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldContainer: {
    flex: 1,
    marginHorizontal: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});
