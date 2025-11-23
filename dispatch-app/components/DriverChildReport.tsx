/**
 * DriverChildReport Component
 *
 * Displays driver-child assignment pairings for a specific date and period.
 * Shows each driver with their assigned children in a card-based layout.
 */

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDriverChildReport, getTodayString } from '../hooks/useConvexRoutes';
import { exportCSV } from '../utils/exportAssignments';
import { useGoogleSheetsExport } from '../hooks/useGoogleSheetsExport';
import { FontAwesome } from '@expo/vector-icons';

type Period = 'AM' | 'PM';

export default function DriverChildReport() {
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('AM');
  const [isExporting, setIsExporting] = useState(false);

  const reportData = useDriverChildReport(selectedDate, selectedPeriod);
  const { exportAssignmentsToNewSheet, isExporting: isExportingSheets, exportError } = useGoogleSheetsExport();

  // CSV Export Handler
  const handleExportCSV = async () => {
    if (!reportData || reportData.length === 0) {
      Alert.alert('No Data', 'No assignments to export for this date/period');
      return;
    }

    setIsExporting(true);
    const result = await exportCSV({
      selectedDate,
      selectedPeriod,
      drivers: reportData,
    });
    setIsExporting(false);

    if (result.success) {
      Alert.alert('Export Successful', 'CSV file has been shared');
    } else {
      Alert.alert('Export Failed', result.error || 'Unknown error occurred');
    }
  };

  // Google Sheets Export Handler
  const handleExportToGoogleSheets = async () => {
    if (!reportData || reportData.length === 0) {
      Alert.alert('No Data', 'No assignments to export for this date/period');
      return;
    }

    const result = await exportAssignmentsToNewSheet(reportData, selectedDate, selectedPeriod);

    if (result) {
      Alert.alert(
        'Export Successful',
        `Exported ${result.summary.totalDrivers} drivers with ${result.summary.totalAssignments} assignments to Google Sheets`
      );
    } else if (exportError) {
      Alert.alert('Export Failed', exportError);
    }
  };

  // Loading state
  if (reportData === undefined) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
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

      {/* Export Buttons */}
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={[styles.exportButton, styles.csvButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExportCSV}
          disabled={isExporting || !reportData || reportData.length === 0}
        >
          <FontAwesome name="file-excel-o" size={16} color="white" />
          <Text style={styles.exportButtonText}>CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.exportButton,
            styles.sheetsButton,
            (isExportingSheets || !reportData || reportData.length === 0) && styles.exportButtonDisabled
          ]}
          onPress={handleExportToGoogleSheets}
          disabled={isExportingSheets || !reportData || reportData.length === 0}
        >
          {isExportingSheets ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <FontAwesome name="google" size={16} color="white" />
              <View>
                <Text style={styles.exportButtonText}>Google Sheets</Text>
                <Text style={styles.exportButtonSubtext}>Formatted</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {exportError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {exportError}</Text>
        </View>
      )}

      <FlatList
        data={reportData}
        keyExtractor={(item) => item.driverId}
        renderItem={({ item }) => (
          <View style={styles.driverCard}>
            <Text style={styles.driverName}>{item.driverName}</Text>
            <View style={styles.childrenContainer}>
              {item.children.map((child, index) => (
                <View key={child.childId} style={styles.childRow}>
                  <Text style={styles.childName}>{child.childName}</Text>
                  <Text style={styles.childDetails}>
                    {child.grade} • {child.schoolName}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.childCount}>
              {item.children.length} {item.children.length === 1 ? 'child' : 'children'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

/**
 * Date and Period Picker Component
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
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  childrenContainer: {
    marginBottom: 12,
  },
  childRow: {
    paddingVertical: 6,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    marginBottom: 8,
  },
  childName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  childDetails: {
    fontSize: 13,
    color: '#666',
  },
  childCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    textAlign: 'right',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  csvButton: {
    backgroundColor: '#6B7280',
  },
  sheetsButton: {
    backgroundColor: '#0F9D58', // Google green
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButtonSubtext: {
    color: 'white',
    fontSize: 11,
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#FEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C00',
    fontSize: 14,
  },
});
