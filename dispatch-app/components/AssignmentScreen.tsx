/**
 * AssignmentScreen Component
 * 
 * Main dispatch interface with AM/PM tabs, drag-and-drop pairing, and route management
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
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';

interface AssignmentScreenProps {
  date: string; // YYYY-MM-DD format
}

export default function AssignmentScreen({ date }: AssignmentScreenProps) {
  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>('AM');
  const [sortBy, setSortBy] = useState<'child' | 'driver'>('child');
  
  // Drop zone tracking for drag-and-drop
  const [dropZones, setDropZones] = useState<Map<string, { 
    type: 'child' | 'driver', 
    layout: { x: number; y: number; width: number; height: number }
  }>>(new Map());

  // Queries
  const routes = useRoutesForDatePeriod(date, activePeriod);
  const unassignedChildren = useUnassignedChildren(date, activePeriod);
  const unassignedDrivers = useUnassignedDrivers(date, activePeriod);

  // Mutations
  const createRoute = useCreateRoute();
  const copyFromPreviousDay = useCopyFromPreviousDay();
  const removeRoute = useRemoveRoute();
  
  // Sort routes alphabetically by child or driver
  const sortedRoutes = routes ? [...routes].sort((a, b) => {
    if (sortBy === 'child') {
      return a.childName.localeCompare(b.childName);
    } else {
      return a.driverName.localeCompare(b.driverName);
    }
  }) : [];
  
  // Register drop zone positions for collision detection
  const handleRegisterDropZone = (
    id: string, 
    type: 'child' | 'driver', 
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    setDropZones(prev => {
      const updated = new Map(prev);
      updated.set(id, { type, layout });
      return updated;
    });
  };
  
  // Handle drag end - create route if dropped on opposite type
  const handleDragEnd = async (
    draggedId: string, 
    draggedType: 'child' | 'driver', 
    x: number, 
    y: number
  ) => {
    // Find which drop zone the item was dropped on
    let targetId: string | null = null;
    let targetType: 'child' | 'driver' | null = null;

    dropZones.forEach(({ type, layout }, id) => {
      if (
        x >= layout.x && 
        x <= layout.x + layout.width &&
        y >= layout.y && 
        y <= layout.y + layout.height
      ) {
        targetId = id;
        targetType = type;
      }
    });

    if (!targetId || !targetType) {
      // Dropped outside any valid zone
      return;
    }

    // Don't allow pairing same types (child on child, driver on driver)
    if (draggedType === targetType) {
      return;
    }

    // Create the pairing!
    try {
      const childId = draggedType === 'child' ? draggedId : targetId;
      const driverId = draggedType === 'driver' ? draggedId : targetId;

      await createRoute({
        date,
        period: activePeriod,
        childId: childId as any,
        driverId: driverId as any,
        status: 'assigned',
      });
      
      // Success feedback
      Alert.alert('Success', 'Route created!', [{ text: 'OK' }], { cancelable: true });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create route');
    }
  };

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

      {/* Drag-and-Drop Pairing Zone: Side-by-side columns */}
      {(unassignedChildren.length > 0 || unassignedDrivers.length > 0) && (
        <View style={styles.pairingContainer}>
          <Text style={styles.pairingTitle}>
            👉 Drag & Drop to Create Routes
          </Text>
          <Text style={styles.pairingHint}>
            Drag a child onto a driver (or vice versa) to pair them
          </Text>
          
          <View style={styles.columnsContainer}>
            {/* Children Column */}
            <View style={styles.column}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>Children</Text>
                <View style={styles.columnBadge}>
                  <Text style={styles.columnBadgeText}>{unassignedChildren.length}</Text>
                </View>
              </View>
              <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                {unassignedChildren.length === 0 ? (
                  <Text style={styles.emptyColumnText}>✅ All assigned!</Text>
                ) : (
                  unassignedChildren.map((child) => (
                    <DropZone
                      key={child._id}
                      id={child._id}
                      type="child"
                      onRegister={handleRegisterDropZone}
                    >
                      <DraggableCard
                        id={child._id}
                        type="child"
                        name={`${child.firstName} ${child.lastName}`}
                        onDragEnd={handleDragEnd}
                      />
                    </DropZone>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Drivers Column */}
            <View style={styles.column}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>Drivers</Text>
                <View style={styles.columnBadge}>
                  <Text style={styles.columnBadgeText}>{unassignedDrivers.length}</Text>
                </View>
              </View>
              <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                {unassignedDrivers.length === 0 ? (
                  <Text style={styles.emptyColumnText}>✅ All assigned!</Text>
                ) : (
                  unassignedDrivers.map((driver) => (
                    <DropZone
                      key={driver._id}
                      id={driver._id}
                      type="driver"
                      onRegister={handleRegisterDropZone}
                    >
                      <DraggableCard
                        id={driver._id}
                        type="driver"
                        name={`${driver.firstName} ${driver.lastName}`}
                        onDragEnd={handleDragEnd}
                      />
                    </DropZone>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Paired Routes */}
      {routes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduled Routes ({routes.length})</Text>
            {/* Sort Toggle */}
            <View style={styles.sortToggle}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'child' && styles.sortButtonActive]}
                onPress={() => setSortBy('child')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'child' && styles.sortButtonTextActive]}>
                  By Child
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'driver' && styles.sortButtonActive]}
                onPress={() => setSortBy('driver')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'driver' && styles.sortButtonTextActive]}>
                  By Driver
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {sortedRoutes.map((route) => (
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
                
                {/* Status Indicators - Real-time updates from Driver App */}
                {route.status === 'completed' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeCompleted}>✅ Picked up</Text>
                  </View>
                )}
                {route.status === 'no_show' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeNoShow}>❌ No-show</Text>
                  </View>
                )}
                {route.status === 'cancelled' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeCancelled}>🔔 Pre-cancelled</Text>
                  </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sortToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: 2,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  sortButtonActive: {
    backgroundColor: '#2196F3',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#fff',
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
  statusBadge: {
    marginTop: 4,
  },
  statusBadgeCompleted: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBadgeNoShow: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBadgeCancelled: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
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
  pairingContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
  },
  pairingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  pairingHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  column: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    minHeight: 350,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  columnBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  columnBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  columnScroll: {
    flex: 1,
  },
  emptyColumnText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
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

