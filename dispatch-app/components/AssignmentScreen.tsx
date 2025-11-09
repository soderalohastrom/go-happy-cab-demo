/**
 * AssignmentScreen Component
 * 
 * Main dispatch interface with AM/PM tabs, drag-and-drop pairing, and route management
 */

import React, { 
  useState, 
  useRef 
} from 'react';
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
  useRouteCountsForDate,
  useCreateRoute,
  useCopyFromPreviousDay,
  useRemoveRoute,
} from '../hooks/useConvexRoutes';
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';
import { DragOverlay } from './DragOverlay';

interface AssignmentScreenProps {
  date: string; // YYYY-MM-DD format
}

export default function AssignmentScreen({ date }: AssignmentScreenProps) {
  const [activePeriod, setActivePeriod] = useState<'AM' | 'PM'>('AM');
  const [sortBy, setSortBy] = useState<'child' | 'driver'>('child');
  const wrapperRef = useRef<View>(null);
  const [wrapperOffsetY, setWrapperOffsetY] = useState(0);

  // CARPOOL STATE: Track temporary carpool groupings before "Done" button click
  // Map<driverId, childIds[]> - max 3 children per driver
  const [driverCarpools, setDriverCarpools] = useState<Map<string, string[]>>(new Map());

  // Drop zone tracking for drag-and-drop
  const [dropZones, setDropZones] = useState<Map<string, {
    type: 'child' | 'driver',
    layout: { x: number; y: number; width: number; height: number }
  }>>(new Map());

  // Drag overlay state - renders at root level to float above all UI
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedId: string;
    draggedType: 'child' | 'driver';
    draggedName: string;
    x: number;
    y: number;
  }>({
    isDragging: false,
    draggedId: '',
    draggedType: 'child',
    draggedName: '',
    x: 0,
    y: 0,
  });

  // Track which drop zone is currently hovered for visual feedback
  const [hoveredDropZoneId, setHoveredDropZoneId] = useState<string | null>(null);

  // CARPOOL: Track which carpool groups are expanded in the paired routes section
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Queries
  const routes = useRoutesForDatePeriod(date, activePeriod);
  const unassignedChildren = useUnassignedChildren(date, activePeriod);
  const unassignedDrivers = useUnassignedDrivers(date, activePeriod);
  const routeCounts = useRouteCountsForDate(date);

  // Mutations
  const createRoute = useCreateRoute();
  const copyFromPreviousDay = useCopyFromPreviousDay();
  const removeRoute = useRemoveRoute();
  
  // CARPOOL: Group routes by driver to detect carpools
  // Carpool = multiple routes with same driverId + date + period
  const groupRoutesByDriver = (routes: typeof sortedRoutes) => {
    const groups = new Map<string, typeof routes>();
    routes.forEach(route => {
      const key = `${route.driverId}_${route.date}_${route.period}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(route);
    });
    return groups;
  };

  // Sort routes alphabetically by child or driver
  const sortedRoutes = routes ? [...routes].sort((a, b) => {
    if (sortBy === 'child') {
      return a.childName.localeCompare(b.childName);
    } else {
      return a.driverName.localeCompare(b.driverName);
    }
  }) : [];

  // Group routes by driver for carpool detection
  const routeGroups = groupRoutesByDriver(sortedRoutes);
  
  const handleWrapperLayout = () => {
    wrapperRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setWrapperOffsetY(pageY);
    });
  };

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
  
  // Handle drag start - show overlay
  const handleDragStart = (id: string, type: 'child' | 'driver', name: string) => {
    setDragState({
      isDragging: true,
      draggedId: id,
      draggedType: type,
      draggedName: name,
      x: 0,
      y: 0,
    });
  };
  
  // Handle drag move - update overlay position and highlight valid drop zones
  const handleDragMove = (x: number, y: number) => {
    setDragState(prev => ({ ...prev, x, y }));
    
    // Find which drop zone we're hovering over
    // Use raw finger position for collision (card is centered on finger)
    let hoveredId: string | null = null;
    dropZones.forEach(({ type, layout }, id) => {
      if (
        x >= layout.x && 
        x <= layout.x + layout.width &&
        y >= layout.y && 
        y <= layout.y + layout.height
      ) {
        // Only highlight if it's opposite type (valid drop target)
        if (type !== dragState.draggedType) {
          hoveredId = id;
        }
      }
    });
    setHoveredDropZoneId(hoveredId);
  };
  
  // Handle drag end - ONE-DIRECTIONAL: Only allow children → drivers (not vice versa)
  // Adds children to temporary carpool state, requiring "Done" button to finalize
  const handleDragEnd = async (
    draggedId: string,
    draggedType: 'child' | 'driver',
    x: number,
    y: number
  ) => {
    // Hide overlay and clear hover state
    setDragState(prev => ({ ...prev, isDragging: false }));
    setHoveredDropZoneId(null);

    // CARPOOL RULE: Only children can be dragged (one-directional)
    if (draggedType !== 'child') {
      // Drivers cannot be dragged
      return;
    }

    // Find which drop zone the child was dropped on
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

    // CARPOOL RULE: Child must be dropped on a driver
    if (targetType !== 'driver') {
      return;
    }

    const driverId = targetId;
    const childId = draggedId;

    // Add to temporary carpool state (max 3 children per driver)
    setDriverCarpools(prev => {
      const updated = new Map(prev);
      const existingChildren = updated.get(driverId) || [];

      // CARPOOL RULE: Max 3 children per driver
      if (existingChildren.length >= 3) {
        Alert.alert('Max Carpool Size', 'Driver can only have 3 children maximum', [{ text: 'OK' }]);
        return prev; // Don't update state
      }

      // Don't add duplicate
      if (existingChildren.includes(childId)) {
        return prev;
      }

      updated.set(driverId, [...existingChildren, childId]);
      return updated;
    });
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

  // TESTING HELPER: Clear all routes for current date/period
  const handleClearAllRoutes = async () => {
    Alert.alert(
      'Clear All Routes?',
      `This will remove all ${routes.length} routes for ${activePeriod} on ${date}. This is useful for testing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove all routes for this date/period
              for (const route of routes) {
                await removeRoute({ id: route._id as any });
              }
              Alert.alert('Success', 'All routes cleared!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to clear routes');
            }
          },
        },
      ]
    );
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

  // CARPOOL: Remove child from temporary carpool before Done button
  const handleRemoveFromCarpool = (driverId: string, childId: string) => {
    setDriverCarpools(prev => {
      const updated = new Map(prev);
      const existingChildren = updated.get(driverId) || [];
      const filtered = existingChildren.filter(id => id !== childId);

      if (filtered.length === 0) {
        updated.delete(driverId);
      } else {
        updated.set(driverId, filtered);
      }

      return updated;
    });
  };

  // CARPOOL: Finalize carpool by creating individual route records
  // Each child gets their own route record with same driverId/date/period
  // Driver App will detect this as a carpool automatically
  const handleDoneClick = async (driverId: string) => {
    const childIds = driverCarpools.get(driverId);
    if (!childIds || childIds.length === 0) {
      return;
    }

    try {
      // Create one route per child (carpool pattern)
      for (const childId of childIds) {
        await createRoute({
          date,
          period: activePeriod,
          childId: childId as any,
          driverId: driverId as any,
          status: 'assigned',
        });
      }

      // Clear carpool state for this driver
      setDriverCarpools(prev => {
        const updated = new Map(prev);
        updated.delete(driverId);
        return updated;
      });

      Alert.alert('Success', `Carpool created with ${childIds.length} children!`, [{ text: 'OK' }]);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to create carpool';

      // Better error message for "already assigned" scenario
      if (errorMsg.includes('already assigned')) {
        Alert.alert(
          'Already Assigned',
          'This driver or one of the children is already assigned for this period. To test again:\n\n1. Navigate to a different date, OR\n2. Remove existing routes first (tap X on scheduled routes)\n\nNote: This validation prevents double-booking in production.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  // Loading state
  if (routes === undefined || unassignedChildren === undefined || unassignedDrivers === undefined || routeCounts === undefined) {
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
    <View 
      style={styles.wrapper} 
      ref={wrapperRef} 
      onLayout={handleWrapperLayout} 
      collapsable={false}
    >
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
            {routeCounts?.amCount ?? 0}
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
            {routeCounts?.pmCount ?? 0}
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
            👉 Drag & Drop to Create Carpools
          </Text>
          <Text style={styles.pairingHint}>
            Drag children onto drivers (max 3 per driver), then tap Done ✓
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
                  unassignedChildren.map((child) => {
                    // Check if child is already in a carpool (shouldn't show in unassigned, but safety check)
                    const isInCarpool = Array.from(driverCarpools.values()).some(
                      children => children.includes(child._id)
                    );

                    // Skip if already in carpool (shouldn't happen due to Convex query filtering)
                    if (isInCarpool) return null;

                    return (
                      <DropZone
                        key={child._id}
                        id={child._id}
                        type="child"
                        isHighlighted={hoveredDropZoneId === child._id}
                        onRegister={handleRegisterDropZone}
                      >
                        <DraggableCard
                          id={child._id}
                          type="child"
                          name={`${child.firstName} ${child.lastName}`}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                        />
                      </DropZone>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Drivers Column - CARPOOL UI: Shows stacked children + Done button */}
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
                  unassignedDrivers.map((driver) => {
                    const carpoolChildren = driverCarpools.get(driver._id) || [];
                    const hasCarpool = carpoolChildren.length > 0;

                    return (
                      <DropZone
                        key={driver._id}
                        id={driver._id}
                        type="driver"
                        isHighlighted={hoveredDropZoneId === driver._id}
                        onRegister={handleRegisterDropZone}
                      >
                        <View style={styles.driverCardWrapper}>
                          {/* Driver Card - NOT DRAGGABLE (one-directional) */}
                          <View style={[
                            styles.driverCard,
                            hasCarpool && styles.driverCardWithCarpool
                          ]}>
                            <View style={styles.driverCardContent}>
                              <Text style={styles.driverIcon}>🚗</Text>
                              <Text style={styles.driverName} numberOfLines={1}>
                                {driver.firstName} {driver.lastName}
                              </Text>
                              {hasCarpool && (
                                <View style={styles.carpoolCountBadge}>
                                  <Text style={styles.carpoolCountText}>{carpoolChildren.length}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* CARPOOL: Stacked children (vertical) */}
                          {hasCarpool && (
                            <View style={styles.carpoolChildrenStack}>
                              {carpoolChildren.map((childId) => {
                                const child = unassignedChildren.find(c => c._id === childId);
                                if (!child) return null;

                                return (
                                  <View key={childId} style={styles.carpoolChildCard}>
                                    <Text style={styles.carpoolChildIcon}>👧</Text>
                                    <Text style={styles.carpoolChildName} numberOfLines={1}>
                                      {child.firstName} {child.lastName}
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.carpoolRemoveButton}
                                      onPress={() => handleRemoveFromCarpool(driver._id, childId)}
                                    >
                                      <Text style={styles.carpoolRemoveText}>✕</Text>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}

                              {/* CARPOOL: Done Button */}
                              <TouchableOpacity
                                style={styles.carpoolDoneButton}
                                onPress={() => handleDoneClick(driver._id)}
                              >
                                <Text style={styles.carpoolDoneButtonText}>✓ Done</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </DropZone>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Paired Routes - CARPOOL: Show expandable groups */}
      {routes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduled Routes ({routes.length})</Text>
            <View style={styles.sectionHeaderRight}>
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
              {/* Clear All Button (for testing) */}
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAllRoutes}
              >
                <Text style={styles.clearAllButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Render route groups (singles or carpools) */}
          {Array.from(routeGroups.entries()).map(([groupKey, groupRoutes]) => {
            const isCarpool = groupRoutes.length > 1;
            const isExpanded = expandedGroups.has(groupKey);
            const firstRoute = groupRoutes[0];

            if (isCarpool) {
              // CARPOOL GROUP: Show as expandable card
              return (
                <View key={groupKey}>
                  <TouchableOpacity
                    style={[styles.routeCard, styles.carpoolGroupCard]}
                    onPress={() => {
                      setExpandedGroups(prev => {
                        const updated = new Set(prev);
                        if (updated.has(groupKey)) {
                          updated.delete(groupKey);
                        } else {
                          updated.add(groupKey);
                        }
                        return updated;
                      });
                    }}
                  >
                    <View style={styles.routeInfo}>
                      <View style={styles.carpoolGroupHeader}>
                        <Text style={styles.carpoolGroupIcon}>🚗👧👧</Text>
                        <Text style={styles.carpoolGroupDriver}>{firstRoute.driverName}</Text>
                        <View style={styles.carpoolGroupBadge}>
                          <Text style={styles.carpoolGroupBadgeText}>
                            {groupRoutes.length} children
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.carpoolExpandHint}>
                        {isExpanded ? '▼ Tap to collapse' : '▶ Tap to expand'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded: Show all children in carpool */}
                  {isExpanded && (
                    <View style={styles.carpoolExpandedChildren}>
                      {groupRoutes.map((route) => (
                        <View key={route._id} style={styles.carpoolChildRouteCard}>
                          <View style={styles.carpoolChildRouteInfo}>
                            <Text style={styles.personIcon}>👧</Text>
                            <Text style={styles.personName}>{route.childName}</Text>
                            {route.scheduledTime && (
                              <Text style={styles.timeText}>⏰ {route.scheduledTime}</Text>
                            )}

                            {/* Status Indicators */}
                            {route.status === 'completed' && (
                              <Text style={styles.statusBadgeCompleted}>✅ Picked up</Text>
                            )}
                            {route.status === 'no_show' && (
                              <Text style={styles.statusBadgeNoShow}>❌ No-show</Text>
                            )}
                            {route.status === 'cancelled' && (
                              <Text style={styles.statusBadgeCancelled}>🔔 Pre-cancelled</Text>
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
                </View>
              );
            } else {
              // SINGLE ROUTE: Show as regular card
              const route = firstRoute;
              return (
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
              );
            }
          })}
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
      
      {/* Drag Overlay - renders at root level to float above all UI */}
      <DragOverlay
        isDragging={dragState.isDragging}
        absoluteX={dragState.x}
        absoluteY={dragState.y}
        wrapperOffsetY={wrapperOffsetY}
        type={dragState.draggedType}
        name={dragState.draggedName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  clearAllButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
  },
  clearAllButtonText: {
    fontSize: 20,
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
  // CARPOOL STYLES
  driverCardWrapper: {
    marginVertical: 6,
  },
  driverCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#BBDEFB',
    borderWidth: 2,
    borderColor: '#1976D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverCardWithCarpool: {
    borderColor: '#4CAF50',
    backgroundColor: '#C8E6C9',
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  carpoolCountBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  carpoolCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  carpoolChildrenStack: {
    marginTop: 8,
    paddingLeft: 12,
    gap: 6,
  },
  carpoolChildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  carpoolChildIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  carpoolChildName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  carpoolRemoveButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  carpoolRemoveText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
  },
  carpoolDoneButton: {
    marginTop: 4,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  carpoolDoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // CARPOOL GROUP DISPLAY STYLES (for paired routes section)
  carpoolGroupCard: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  carpoolGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  carpoolGroupIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  carpoolGroupDriver: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  carpoolGroupBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  carpoolGroupBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  carpoolExpandHint: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  carpoolExpandedChildren: {
    marginTop: 8,
    marginLeft: 16,
    marginBottom: 8,
    gap: 6,
  },
  carpoolChildRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  carpoolChildRouteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

