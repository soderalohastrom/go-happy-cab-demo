/**
 * AssignmentScreen Component
 * 
 * Main dispatch interface with AM/PM tabs, unassigned lists, and route management
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import {
  useRoutesForDatePeriod,
  useUnassignedChildren,
  useUnassignedDrivers,
  useCreateRoute,
  useCopyFromPreviousDay,
  useRemoveRoute,
} from '../hooks/useConvexRoutes';

interface AssignmentScreenProps {
  date: string; // YYYY-MM-DD format
}

export default function AssignmentScreen({ date }: AssignmentScreenProps) {
  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>('AM');

  // Queries
  const routes = useRoutesForDatePeriod(date, activePeriod);
  const unassignedChildren = useUnassignedChildren(date, activePeriod);
  const unassignedDrivers = useUnassignedDrivers(date, activePeriod);

  // Mutations
  const createRoute = useCreateRoute();
  const copyFromPreviousDay = useCopyFromPreviousDay();
  const removeRoute = useRemoveRoute();

  // Handle copy from previous day
  const handleCopyPreviousDay = async () => {
    try {
      const result = await copyFromPreviousDay({ targetDate: date });
      Alert.alert('Success', result.message);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to copy routes');
    }
  };

  // Handle remove route
  const handleRemoveRoute = async (routeId: string) => {
    Alert.alert(
      'Remove Route',
      'Are you sure you want to remove this route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRoute({ id: routeId as any });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove route');
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (routes === undefined || unassignedChildren === undefined || unassignedDrivers === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  // Check if this date has no routes yet
  const isEmpty = routes.length === 0;

  return (
    <ScrollView style={styles.container}>
      {/* Period Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activePeriod === 'AM' && styles.activeTab]}
          onPress={() => setActivePeriod('AM')}
        >
          <Text style={[styles.tabText, activePeriod === 'AM' && styles.activeTabText]}>
            🌅 AM Pickup
          </Text>
          <Text style={[styles.tabCount, activePeriod === 'AM' && styles.activeTabCount]}>
            {activePeriod === 'AM' ? routes.length : 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activePeriod === 'PM' && styles.activeTab]}
          onPress={() => setActivePeriod('PM')}
        >
          <Text style={[styles.tabText, activePeriod === 'PM' && styles.activeTabText]}>
            🌇 PM Dropoff
          </Text>
          <Text style={[styles.tabCount, activePeriod === 'PM' && styles.activeTabCount]}>
            {activePeriod === 'PM' ? routes.length : 0}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Copy Previous Day Button (show if empty) */}
      {isEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No routes scheduled for this period</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyPreviousDay}>
            <Text style={styles.copyButtonText}>📋 Copy Previous Day's Routes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Routes */}
      {routes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled Routes ({routes.length})</Text>
          {routes.map((route) => (
            <View key={route._id} style={styles.routeCard}>
              <View style={styles.routeInfo}>
                <View style={styles.routePair}>
                  <View style={styles.person}>
                    <Text style={styles.personIcon}>👧</Text>
                    <Text style={styles.personName}>{route.childName}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.person}>
                    <Text style={styles.personIcon}>🚗</Text>
                    <Text style={styles.personName}>{route.driverName}</Text>
                  </View>
                </View>
                {route.scheduledTime && (
                  <Text style={styles.timeText}>⏰ {route.scheduledTime}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveRoute(route._id)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Unassigned Children */}
      {unassignedChildren.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Unassigned Children ({unassignedChildren.length})
          </Text>
          <Text style={styles.sectionHint}>
            These children need {activePeriod} routes
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unassignedList}>
            {unassignedChildren.map((child) => (
              <View key={child._id} style={styles.unassignedCard}>
                <Text style={styles.unassignedIcon}>👧</Text>
                <Text style={styles.unassignedName}>
                  {child.firstName} {child.lastName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Unassigned Drivers */}
      {unassignedDrivers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Drivers ({unassignedDrivers.length})
          </Text>
          <Text style={styles.sectionHint}>
            These drivers have no {activePeriod} routes yet
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unassignedList}>
            {unassignedDrivers.map((driver) => (
              <View key={driver._id} style={styles.unassignedCard}>
                <Text style={styles.unassignedIcon}>🚗</Text>
                <Text style={styles.unassignedName}>
                  {driver.firstName} {driver.lastName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          ✅ {routes.length} routes scheduled
        </Text>
        {unassignedChildren.length > 0 && (
          <Text style={styles.summaryWarning}>
            ⚠️ {unassignedChildren.length} children still need assignment
          </Text>
        )}
      </View>
    </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  activeTabText: {
    color: '#fff',
  },
  tabCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
  },
  activeTabCount: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  copyButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
  },
  routeInfo: {
    flex: 1,
  },
  routePair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  personName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  arrow: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#F44336',
  },
  unassignedList: {
    marginTop: 8,
  },
  unassignedCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
  },
  unassignedIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  unassignedName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  summary: {
    padding: 16,
    margin: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  summaryWarning: {
    fontSize: 14,
    color: '#F57C00',
  },
});

