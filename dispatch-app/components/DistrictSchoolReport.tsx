/**
 * DistrictSchoolReport Component
 *
 * Displays hierarchical District → School → Children structure for a specific date/period.
 * Features collapsible accordion sections for districts and schools.
 */

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDistrictSchoolReport, getTodayString } from '../hooks/useConvexRoutes';

type Period = 'AM' | 'PM';

export default function DistrictSchoolReport() {
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('AM');

  // Accordion state
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  const reportData = useDistrictSchoolReport(selectedDate, selectedPeriod);

  // Toggle district expansion
  const toggleDistrict = (districtId: string) => {
    setExpandedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(districtId)) {
        next.delete(districtId);
        // Collapse all schools in this district when district collapses
        const schoolsToCollapse = reportData
          ?.find((d) => d.districtId === districtId)
          ?.schools.map((s) => s.schoolId) || [];
        setExpandedSchools((prevSchools) => {
          const nextSchools = new Set(prevSchools);
          schoolsToCollapse.forEach((schoolId) => nextSchools.delete(schoolId));
          return nextSchools;
        });
      } else {
        next.add(districtId);
      }
      return next;
    });
  };

  // Toggle school expansion
  const toggleSchool = (schoolId: string) => {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      next.has(schoolId) ? next.delete(schoolId) : next.add(schoolId);
      return next;
    });
  };

  // Loading state
  if (reportData === undefined) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading district data...</Text>
      </View>
    );
  }

  // Empty state
  if (reportData.length === 0) {
    return (
      <View style={styles.container}>
        <DatePeriodPicker
          selectedDate={selectedDate}
          selectedPeriod={selectedPeriod}
          onDateChange={setSelectedDate}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No assignments for this date/period</Text>
          <Text style={styles.emptySubtext}>
            Try selecting a different date or period
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DatePeriodPicker
        selectedDate={selectedDate}
        selectedPeriod={selectedPeriod}
        onDateChange={setSelectedDate}
        onPeriodChange={setSelectedPeriod}
      />

      <FlatList
        data={reportData}
        keyExtractor={(item) => item.districtId}
        renderItem={({ item: district }) => {
          const isDistrictExpanded = expandedDistricts.has(district.districtId);
          const totalChildren = district.schools.reduce(
            (sum, school) => sum + school.children.length,
            0
          );

          return (
            <View style={styles.districtSection}>
              {/* District Header */}
              <TouchableOpacity
                style={styles.districtHeader}
                onPress={() => toggleDistrict(district.districtId)}
              >
                <View style={styles.headerLeft}>
                  <Text style={styles.expandIcon}>
                    {isDistrictExpanded ? '▼' : '▶'}
                  </Text>
                  <Text style={styles.districtName}>{district.districtName}</Text>
                </View>
                <Text style={styles.districtCount}>
                  {totalChildren} {totalChildren === 1 ? 'child' : 'children'}
                </Text>
              </TouchableOpacity>

              {/* Schools (visible when district expanded) */}
              {isDistrictExpanded &&
                district.schools.map((school) => {
                  const isSchoolExpanded = expandedSchools.has(school.schoolId);

                  return (
                    <View key={school.schoolId} style={styles.schoolSection}>
                      {/* School Header */}
                      <TouchableOpacity
                        style={styles.schoolHeader}
                        onPress={() => toggleSchool(school.schoolId)}
                      >
                        <View style={styles.headerLeft}>
                          <Text style={styles.expandIcon}>
                            {isSchoolExpanded ? '▼' : '▶'}
                          </Text>
                          <Text style={styles.schoolName}>{school.schoolName}</Text>
                        </View>
                        <Text style={styles.schoolCount}>
                          {school.children.length}
                        </Text>
                      </TouchableOpacity>

                      {/* Children (visible when school expanded) */}
                      {isSchoolExpanded &&
                        school.children.map((child) => (
                          <View key={child.childId} style={styles.childRow}>
                            <Text style={styles.childName}>{child.childName}</Text>
                            <Text style={styles.childGrade}>{child.grade}</Text>
                          </View>
                        ))}
                    </View>
                  );
                })}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

/**
 * Date and Period Picker Component
 * (Reused from DriverChildReport)
 */
interface DatePeriodPickerProps {
  selectedDate: string;
  selectedPeriod: Period;
  onDateChange: (date: string) => void;
  onPeriodChange: (period: Period) => void;
}

function DatePeriodPicker({
  selectedDate,
  selectedPeriod,
  onDateChange,
  onPeriodChange,
}: DatePeriodPickerProps) {
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const adjustDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    onDateChange(date.toISOString().split('T')[0]);
  };

  return (
    <View style={styles.pickerContainer}>
      {/* Date Navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => adjustDate(-1)}
        >
          <Text style={styles.dateButtonText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => adjustDate(1)}
        >
          <Text style={styles.dateButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Period Toggle */}
      <View style={styles.periodToggle}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'AM' && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange('AM')}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'AM' && styles.periodButtonTextActive,
            ]}
          >
            AM
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'PM' && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange('PM')}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'PM' && styles.periodButtonTextActive,
            ]}
          >
            PM
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 16,
  },
  districtSection: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  districtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
    width: 16,
  },
  districtName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  districtCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  schoolSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginLeft: 16,
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingLeft: 24,
    backgroundColor: '#FFFFFF',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  schoolCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingLeft: 48,
    paddingRight: 16,
    backgroundColor: '#FAFAFA',
  },
  childName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#333',
    flex: 1,
  },
  childGrade: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
});
