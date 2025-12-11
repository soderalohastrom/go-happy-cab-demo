/**
 * DriverChildReport Component
 *
 * Displays driver-child assignment pairings for a specific date and period.
 * Shows each driver with their assigned children in a card-based layout.
 * Includes export functionality for CSV, Google Sheets, and Public Web Publish.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { exportCSV } from '@/utils/exportAssignments';
import { useGoogleSheetsExport } from '@/hooks/useGoogleSheetsExport';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

type Period = 'AM' | 'PM';

interface Child {
    childName: string;
    schoolName: string;
    grade: string;
    childId: string;
}

interface DriverAssignment {
    driverName: string;
    driverId: string;
    children: Child[];
}

export default function DriverChildReport() {
  const { width } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('AM');
  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const reportData = useQuery(api.reports.getRoutesForDateRange, {
    date: selectedDate.toISOString().split('T')[0],
    period: selectedPeriod
  });
  
  const publishManifest = useMutation(api.publish.publishManifest);
  const { exportAssignmentsToNewSheet, isExporting: isExportingSheets, exportError } = useGoogleSheetsExport();

  const handleDateChange = (dateString: string) => {
     setSelectedDate(new Date(dateString));
  };

  const handlePublish = async () => {
    if (!reportData || reportData.length === 0) {
      Alert.alert("No Data", "There are no assignments to publish for this date.");
      return;
    }

    setIsPublishing(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Transform data for public consumption
      const assignments = reportData.map((driver: DriverAssignment) => ({
        driverName: driver.driverName,
        children: driver.children.map(child => ({
          childName: child.childName,
          schoolName: child.schoolName,
          grade: child.grade
        }))
      }));

      const slug = await publishManifest({
        date: dateStr,
        period: selectedPeriod,
        assignments
      });

      // Generate the public URL
      const publicUrl = Linking.createURL(`public/${slug}`);
      
      let displayUrl = publicUrl;
      // On web, construct absolute URL for sharing
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // Handle expo router nesting if any, but clean origin + path is safest for web
        displayUrl = `${origin}/public/${slug}`;
      }

      await Clipboard.setStringAsync(displayUrl);

      if (Platform.OS === 'web') {
        // Web-specific alert since RNW Alert doesn't support custom buttons well
        const shouldOpen = window.confirm(
          `Published Successfully!\n\nThe dispatch board is live.\nLink copied to clipboard: ${displayUrl}\n\nDo you want to open it now?`
        );
        if (shouldOpen) {
          window.open(displayUrl, '_blank');
        }
      } else {
        Alert.alert(
          "Published Successfully!",
          `The dispatch board is live.\n\nLink copied to clipboard:\n${displayUrl}`,
          [
            { text: "OK" },
            { text: "Open", onPress: () => Linking.openURL(displayUrl) }
          ]
        );
      }
    } catch (error) {
      console.error("Publishing error:", error);
      Alert.alert("Error", "Failed to publish manifest. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    if (!reportData || reportData.length === 0) {
      Alert.alert('No Data', 'No assignments to export for this date/period');
      return;
    }

    setIsExporting(true);
    // @ts-ignore - types mismatch between Date object and expected string in existing util if present
    // But assuming exportCSV handles it or we pass what it expects.
    // Based on previous code, passing the raw reportData which is correct structure.
    const result = await exportCSV({
        // @ts-ignore
      selectedDate: selectedDate.toISOString().split('T')[0],
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

    // @ts-ignore
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

  // Empty state handling is inside the main return via conditionals or empty list check
  // But let's keep the picker visible even if empty

  return (
    <View style={styles.container}>
      <DatePeriodPicker
        selectedDate={selectedDate.toISOString().split('T')[0]}
        selectedPeriod={selectedPeriod}
        onDateChange={handleDateChange}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Export Buttons */}
      <View style={styles.exportContainer}>
          <TouchableOpacity
            style={[styles.exportButton, styles.csvButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExportCSV}
            disabled={isExporting || !reportData || reportData.length === 0}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
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
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color="#028174" />
                <View>
                  <Text style={[styles.exportButtonText, styles.sheetsButtonText]}>Google Sheets</Text>
                  <Text style={styles.exportButtonSubtext}>Formatted</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.publishButton, isPublishing && styles.exportButtonDisabled]}
            onPress={handlePublish}
            disabled={isPublishing || !reportData || reportData.length === 0}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
            <Text style={styles.exportButtonText}>Publish</Text>
          </TouchableOpacity>
        </View>

      {/* Error Display */}
      {exportError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {exportError}</Text>
        </View>
      )}

      {reportData.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No assignments for this date/period</Text>
            <Text style={styles.emptySubtext}>
               Try selecting a different date or period
            </Text>
          </View>
      ) : (
          <FlatList
            data={reportData}
            keyExtractor={(item) => item.driverId}
            renderItem={({ item }) => (
              <View style={styles.driverCard}>
                <Text style={styles.driverName}>{item.driverName}</Text>
                <View style={styles.childrenContainer}>
                  {item.children.map((child: Child, index: number) => (
                    <View key={child.childId || index} style={styles.childRow}>
                      <Text style={styles.childName}>{child.childName}</Text>
                      <Text style={styles.childDetails}>
                        {child.grade ? `${child.grade} • ` : ''}{child.schoolName}
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
      )}
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
    // Basic formatting to avoid date timezone issues
    const parts = dateString.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const adjustDate = (days: number) => {
    const parts = selectedDate.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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
    padding: 20,
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
  // Export Button Styles
  exportContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 0, 
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  csvButton: {
    backgroundColor: '#6B7280',
  },
  sheetsButton: {
    backgroundColor: '#0F9D58', // Google green
  },
  publishButton: {
    backgroundColor: '#8b5cf6', // Violet
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  sheetsButtonText: {
    color: 'white',
  },
  exportButtonSubtext: {
    color: 'white',
    fontSize: 10,
    marginTop: 0,
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
  // Driver Card Styles
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
    fontSize: 16,
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
});
