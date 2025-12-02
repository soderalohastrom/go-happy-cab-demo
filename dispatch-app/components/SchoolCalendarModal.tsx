/**
 * SchoolCalendarModal Component
 *
 * Full-screen modal for managing school year calendar and schedules.
 * Features:
 * - Visual calendar grid showing all school year months (M-F only)
 * - Click to toggle non-school days
 * - Schedule time editor for AM/PM times
 * - Tracks unsaved changes with save/cancel workflow
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { MonthGrid } from './calendar/MonthGrid';
import { ScheduleEditor, ScheduleData } from './calendar/ScheduleEditor';
import {
  useSchoolDetails,
  useBulkUpdateNonSchoolDays,
  useUpsertSchoolSchedule,
} from '../hooks/useConvexRoutes';
import { Id } from '../convex/_generated/dataModel';

interface SchoolCalendarModalProps {
  visible: boolean;
  schoolId: Id<'schools'> | null;
  schoolName: string;
  onClose: () => void;
}

export function SchoolCalendarModal({
  visible,
  schoolId,
  schoolName,
  onClose,
}: SchoolCalendarModalProps) {
  const { width } = useWindowDimensions();
  const schoolDetails = useSchoolDetails(schoolId ?? undefined);
  const bulkUpdateNonSchoolDays = useBulkUpdateNonSchoolDays();
  const upsertSchedule = useUpsertSchoolSchedule();

  // Local state for unsaved changes
  const [localNonSchoolDates, setLocalNonSchoolDates] = useState<Set<string>>(new Set());
  const [localSchedule, setLocalSchedule] = useState<ScheduleData>({
    amStartTime: '',
    pmReleaseTime: '',
    minDayDismissalTime: '',
    pmAftercare: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state when school data loads
  useEffect(() => {
    if (schoolDetails) {
      // Initialize non-school dates
      const dates = new Set<string>(
        (schoolDetails.nonSchoolDays || []).map((d: { date: string }) => d.date)
      );
      setLocalNonSchoolDates(dates);

      // Initialize schedule
      const schedule = schoolDetails.schedule;
      setLocalSchedule({
        amStartTime: schedule?.amStartTime || '',
        pmReleaseTime: schedule?.pmReleaseTime || '',
        minDayDismissalTime: schedule?.minDayDismissalTime || '',
        pmAftercare: schedule?.pmAftercare || '',
      });

      setHasChanges(false);
    }
  }, [schoolDetails]);

  // Calculate months to display based on school year
  const months = useMemo(() => {
    if (!schoolDetails) return [];

    const firstDay = schoolDetails.firstDay;
    const lastDay = schoolDetails.lastDay;

    if (!firstDay || !lastDay) return [];

    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);

    const result: { year: number; month: number }[] = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      result.push({
        year: current.getFullYear(),
        month: current.getMonth(),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return result;
  }, [schoolDetails]);

  // Handle day toggle
  const handleDayPress = (dateString: string) => {
    setLocalNonSchoolDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateString)) {
        next.delete(dateString);
      } else {
        next.add(dateString);
      }
      return next;
    });
    setHasChanges(true);
  };

  // Handle schedule field change
  const handleScheduleChange = (field: keyof ScheduleData, value: string) => {
    setLocalSchedule((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!schoolId || !schoolDetails) return;

    setIsSaving(true);
    try {
      // Calculate dates to add and remove
      const originalDates = new Set<string>(
        (schoolDetails.nonSchoolDays || []).map((d: { date: string }) => d.date)
      );

      const toAdd: { date: string; description?: string }[] = [];
      const toRemove: string[] = [];

      // Find dates to add (in local but not in original)
      localNonSchoolDates.forEach((date) => {
        if (!originalDates.has(date)) {
          toAdd.push({ date });
        }
      });

      // Find dates to remove (in original but not in local)
      originalDates.forEach((date) => {
        if (!localNonSchoolDates.has(date)) {
          toRemove.push(date);
        }
      });

      // Update non-school days if there are changes
      if (toAdd.length > 0 || toRemove.length > 0) {
        await bulkUpdateNonSchoolDays({
          schoolId,
          toAdd,
          toRemove,
        });
      }

      // Update schedule
      await upsertSchedule({
        schoolId,
        amStartTime: localSchedule.amStartTime || '8:00 AM',
        pmReleaseTime: localSchedule.pmReleaseTime || '3:00 PM',
        minDayDismissalTime: localSchedule.minDayDismissalTime || undefined,
        pmAftercare: localSchedule.pmAftercare || undefined,
      });

      setHasChanges(false);
      Alert.alert('Saved', 'Calendar and schedule updated successfully!');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  // Calculate columns based on screen width
  const columnsPerRow = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  // Loading state
  if (!schoolDetails && visible) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </Modal>
    );
  }

  const firstDay = schoolDetails?.firstDay || '';
  const lastDay = schoolDetails?.lastDay || '';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{schoolName}</Text>
            <Text style={styles.subtitle}>School Year Calendar</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendSchool]} />
            <Text style={styles.legendText}>School Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendNonSchool]}>
              <Text style={styles.legendX}>X</Text>
            </View>
            <Text style={styles.legendText}>Non-School Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendOutside]} />
            <Text style={styles.legendText}>Outside School Year</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.monthsGrid, { flexWrap: 'wrap' }]}>
            {months.map(({ year, month }, index) => (
              <View
                key={`${year}-${month}`}
                style={{ width: `${100 / columnsPerRow}%`, minWidth: 240 }}
              >
                <MonthGrid
                  year={year}
                  month={month}
                  nonSchoolDates={localNonSchoolDates}
                  firstDayOfSchool={firstDay}
                  lastDayOfSchool={lastDay}
                  onDayPress={handleDayPress}
                />
              </View>
            ))}
          </View>

          {/* Schedule Editor */}
          <ScheduleEditor schedule={localSchedule} onChange={handleScheduleChange} />
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {hasChanges && (
            <Text style={styles.unsavedText}>• Unsaved changes</Text>
          )}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton, !hasChanges && styles.disabledButton]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#666',
    lineHeight: 32,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendSchool: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legendNonSchool: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  legendOutside: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legendX: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF5350',
  },
  legendText: {
    fontSize: 13,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  monthsGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unsavedText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
});
