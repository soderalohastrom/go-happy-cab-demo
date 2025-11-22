/**
 * ReportTabs Component
 *
 * Reusable segmented control for switching between different report types.
 * Based on the custom tab pattern from Schools screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type TabType = 'payroll' | 'assignments' | 'districts';

interface ReportTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function ReportTabs({ activeTab, onTabChange }: ReportTabsProps) {
  return (
    <View style={styles.segmentedControl}>
      <TouchableOpacity
        style={[styles.segment, activeTab === 'payroll' && styles.activeSegment]}
        onPress={() => onTabChange('payroll')}
      >
        <Text style={[styles.segmentText, activeTab === 'payroll' && styles.activeSegmentText]}>
          Payroll
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, activeTab === 'assignments' && styles.activeSegment]}
        onPress={() => onTabChange('assignments')}
      >
        <Text style={[styles.segmentText, activeTab === 'assignments' && styles.activeSegmentText]}>
          Assignments
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, activeTab === 'districts' && styles.activeSegment]}
        onPress={() => onTabChange('districts')}
      >
        <Text style={[styles.segmentText, activeTab === 'districts' && styles.activeSegmentText]}>
          Districts
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeSegment: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeSegmentText: {
    color: '#FFFFFF',
  },
});
