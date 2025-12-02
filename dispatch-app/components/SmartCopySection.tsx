/**
 * SmartCopySection Component
 *
 * Replaces the simple "Copy Previous Day's Routes" button with schedule-aware
 * smart copy functionality. Shows:
 * - Last valid schedule date with 14-day lookback
 * - Gap information (e.g., "3 days ago (skipped weekend)")
 * - School closure alerts before copying
 * - Rain Day Test toggle for developers
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import CollapsibleAlertsBanner from './CollapsibleAlertsBanner';
import {
  useLastValidScheduleDate,
  useSchedulingAlerts,
  useCopyFromLastValidDay,
} from '../hooks/useConvexRoutes';

interface SmartCopySectionProps {
  targetDate: string;
  onCopySuccess?: (result: { copied: number; skipped: number; message: string }) => void;
  onCopyError?: (error: string) => void;
}

export default function SmartCopySection({
  targetDate,
  onCopySuccess,
  onCopyError,
}: SmartCopySectionProps) {
  // Developer toggle for Rain Day Test (only in __DEV__ mode)
  const [rainDayTest, setRainDayTest] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Query for last valid schedule date
  const lastValidDate = useLastValidScheduleDate(targetDate);

  // Query for scheduling alerts (with Rain Day Test simulation)
  const schedulingAlerts = useSchedulingAlerts(targetDate, rainDayTest);

  // Mutation for smart copy
  const copyFromLastValidDay = useCopyFromLastValidDay();

  // Loading state
  const isLoading = lastValidDate === undefined || schedulingAlerts === undefined;

  // Format date for display (e.g., "Mon, Dec 19")
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date for button (e.g., "12/19/25")
  const formatDateCompact = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
  };

  // Handle copy button press
  const handleCopy = async () => {
    if (!lastValidDate?.date) {
      Alert.alert('Error', 'No valid schedule found in the last 14 days');
      return;
    }

    // Show confirmation with closure warning if applicable
    const closureCount = schedulingAlerts?.closures?.length || 0;
    const warningText = closureCount > 0
      ? `\n\nNote: ${closureCount} school${closureCount > 1 ? 's are' : ' is'} closed. Children from closed schools will be skipped.`
      : '';

    Alert.alert(
      'Copy Routes?',
      `Copy routes from ${formatDateShort(lastValidDate.date)} (${lastValidDate.daysAgo} day${lastValidDate.daysAgo > 1 ? 's' : ''} ago)?${warningText}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy Routes',
          onPress: async () => {
            setIsCopying(true);
            try {
              const result = await copyFromLastValidDay({
                targetDate,
                sourceDate: lastValidDate.date,
              });

              if (onCopySuccess) {
                onCopySuccess(result);
              } else {
                Alert.alert(
                  'Success',
                  result.message || `Copied ${result.copied} routes${result.skipped > 0 ? `, skipped ${result.skipped} (closed schools)` : ''}`
                );
              }
            } catch (error: any) {
              const errorMsg = error.message || 'Failed to copy routes';
              if (onCopyError) {
                onCopyError(errorMsg);
              } else {
                Alert.alert('Error', errorMsg);
              }
            } finally {
              setIsCopying(false);
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FF9800" />
        <Text style={styles.loadingText}>Checking schedule...</Text>
      </View>
    );
  }

  // No valid date found in 14-day lookback
  if (!lastValidDate) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No Recent Schedule</Text>
          <Text style={styles.emptyText}>
            No routes found in the last 14 days.{'\n'}
            Create routes manually using drag & drop.
          </Text>
        </View>
      </View>
    );
  }

  // Transform alerts for CollapsibleAlertsBanner
  const closures = (schedulingAlerts?.closures || []).map((c: any) => ({
    schoolId: c.schoolId,
    schoolName: c.schoolName,
    reason: c.reason || 'School Closed',
  }));

  const adjustments = (schedulingAlerts?.adjustments || []).map((a: any) => ({
    schoolId: a.schoolId,
    schoolName: a.schoolName,
    type: a.type,
    adjustedTime: a.adjustedTime,
    originalTime: a.originalTime,
  }));

  return (
    <View style={styles.container}>
      {/* Developer Rain Day Toggle */}
      {__DEV__ && (
        <View style={styles.devToggle}>
          <Text style={styles.devToggleLabel}>🧪 Rain Day Test</Text>
          <Switch
            value={rainDayTest}
            onValueChange={setRainDayTest}
            trackColor={{ false: '#E0E0E0', true: '#CE93D8' }}
            thumbColor={rainDayTest ? '#9C27B0' : '#BDBDBD'}
          />
        </View>
      )}

      {/* Scheduling Alerts Banner */}
      <CollapsibleAlertsBanner
        closures={closures}
        adjustments={adjustments}
        isRainDayTest={rainDayTest}
      />

      {/* Source Date Info */}
      <View style={styles.sourceInfo}>
        <Text style={styles.sourceLabel}>Copy from:</Text>
        <Text style={styles.sourceDate}>
          {formatDateShort(lastValidDate.date)}
        </Text>
        <View style={styles.sourceMeta}>
          <Text style={styles.sourceAgo}>
            {lastValidDate.daysAgo} day{lastValidDate.daysAgo > 1 ? 's' : ''} ago
          </Text>
          <Text style={styles.sourceDot}>•</Text>
          <Text style={styles.sourceCount}>
            {lastValidDate.routeCount} route{lastValidDate.routeCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.sourceDot}>•</Text>
          <Text style={styles.sourceCount}>
            {lastValidDate.driverCount} driver{lastValidDate.driverCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Smart Copy Button */}
      <TouchableOpacity
        style={[
          styles.copyButton,
          isCopying && styles.copyButtonDisabled,
          closures.length > 0 && styles.copyButtonWarning,
        ]}
        onPress={handleCopy}
        disabled={isCopying}
      >
        {isCopying ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.copyButtonText}>Copying...</Text>
          </>
        ) : (
          <>
            <Text style={styles.copyButtonIcon}>📋</Text>
            <Text style={styles.copyButtonText}>
              Copy from {formatDateCompact(lastValidDate.date)}
            </Text>
            {closures.length > 0 && (
              <Text style={styles.copyButtonBadge}>
                {closures.length} skipped
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Gap Explanation */}
      {lastValidDate.daysAgo > 1 && (
        <Text style={styles.gapExplanation}>
          {lastValidDate.label || `Skipped ${lastValidDate.daysAgo - 1} day${lastValidDate.daysAgo > 2 ? 's' : ''} without routes`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  // Developer Toggle
  devToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CE93D8',
    borderStyle: 'dashed',
  },
  devToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B1FA2',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Source Info
  sourceInfo: {
    marginBottom: 12,
  },
  sourceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sourceDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceAgo: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  sourceDot: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 6,
  },
  sourceCount: {
    fontSize: 13,
    color: '#666',
  },
  // Copy Button
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  copyButtonWarning: {
    backgroundColor: '#F57C00',
  },
  copyButtonIcon: {
    fontSize: 18,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  copyButtonBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  // Gap Explanation
  gapExplanation: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});