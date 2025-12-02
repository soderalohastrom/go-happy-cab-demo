/**
 * CollapsibleAlertsBanner Component
 *
 * Displays school closure alerts and schedule adjustments in a collapsible banner.
 * Shows summary when collapsed ("3 schools closed"), expands to show details.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface SchoolClosure {
  schoolId: string;
  schoolName: string;
  reason: string;
}

interface ScheduleAdjustment {
  schoolId: string;
  schoolName: string;
  type: 'early_dismissal' | 'minimum_day' | 'weekly_early';
  adjustedTime: string;
  originalTime?: string;
}

interface CollapsibleAlertsBannerProps {
  closures: SchoolClosure[];
  adjustments: ScheduleAdjustment[];
  isRainDayTest?: boolean;
}

export default function CollapsibleAlertsBanner({
  closures,
  adjustments,
  isRainDayTest = false,
}: CollapsibleAlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAlerts = closures.length + adjustments.length;

  // Don't render if no alerts
  if (totalAlerts === 0) {
    return null;
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Summary text for collapsed state
  const getSummaryText = () => {
    const parts: string[] = [];

    if (closures.length > 0) {
      parts.push(`${closures.length} school${closures.length > 1 ? 's' : ''} closed`);
    }

    if (adjustments.length > 0) {
      parts.push(`${adjustments.length} schedule change${adjustments.length > 1 ? 's' : ''}`);
    }

    return parts.join(' • ');
  };

  // Get icon for adjustment type
  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'early_dismissal':
        return '🕐';
      case 'minimum_day':
        return '📅';
      case 'weekly_early':
        return '🔄';
      default:
        return '⚠️';
    }
  };

  // Get label for adjustment type
  const getAdjustmentLabel = (type: string) => {
    switch (type) {
      case 'early_dismissal':
        return 'Early Dismissal';
      case 'minimum_day':
        return 'Minimum Day';
      case 'weekly_early':
        return 'Weekly Early Release';
      default:
        return 'Schedule Change';
    }
  };

  return (
    <View style={[
      styles.container,
      closures.length > 0 ? styles.containerWarning : styles.containerInfo,
      isRainDayTest && styles.containerRainDay,
    ]}>
      {/* Rain Day Test Badge */}
      {isRainDayTest && (
        <View style={styles.rainDayBadge}>
          <Text style={styles.rainDayBadgeText}>🧪 RAIN DAY TEST</Text>
        </View>
      )}

      {/* Collapsed Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.alertIcon}>
            {closures.length > 0 ? '🚫' : '⚠️'}
          </Text>
          <Text style={[
            styles.summaryText,
            closures.length > 0 && styles.summaryTextWarning,
          ]}>
            {getSummaryText()}
          </Text>
        </View>
        <Text style={styles.expandIcon}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* School Closures */}
          {closures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚫 School Closures</Text>
              {closures.map((closure) => (
                <View key={closure.schoolId} style={styles.alertItem}>
                  <Text style={styles.schoolName}>{closure.schoolName}</Text>
                  <Text style={styles.alertReason}>{closure.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Schedule Adjustments */}
          {adjustments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Schedule Changes</Text>
              {adjustments.map((adj) => (
                <View key={`${adj.schoolId}-${adj.type}`} style={styles.alertItem}>
                  <View style={styles.adjustmentHeader}>
                    <Text style={styles.adjustmentIcon}>
                      {getAdjustmentIcon(adj.type)}
                    </Text>
                    <Text style={styles.schoolName}>{adj.schoolName}</Text>
                  </View>
                  <View style={styles.adjustmentDetails}>
                    <Text style={styles.adjustmentType}>
                      {getAdjustmentLabel(adj.type)}
                    </Text>
                    <Text style={styles.adjustmentTime}>
                      {adj.originalTime ? `${adj.originalTime} → ` : ''}
                      {adj.adjustedTime}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  containerWarning: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  containerInfo: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  containerRainDay: {
    borderWidth: 2,
    borderColor: '#9C27B0',
    borderStyle: 'dashed',
  },
  rainDayBadge: {
    backgroundColor: '#9C27B0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rainDayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    flex: 1,
  },
  summaryTextWarning: {
    color: '#E65100',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  alertItem: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alertReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustmentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  adjustmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  adjustmentType: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '500',
  },
  adjustmentTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});