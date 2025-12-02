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
  Alert,
  Platform,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import {
  useRoutesForDatePeriod,
  useUnassignedChildren,
  useUnassignedDrivers,
  useRouteCountsForDate,
  useCreateRoute,
  useRemoveRoute,
  useSchedulingAlerts,
} from '../hooks/useConvexRoutes';
import { DraggableCard } from './DraggableCard';
import { DropZone } from './DropZone';
import { DragOverlay } from './DragOverlay';
import SmartCopySection from './SmartCopySection';

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

  // SET RATE MODAL STATE: Track modal visibility and rate adjustments
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [rateModalDriverId, setRateModalDriverId] = useState<string | null>(null);
  // Map<childId, rateAdjustment> - stores bonus amount per child (default 0)
  const [childRates, setChildRates] = useState<Map<string, number>>(new Map());
  const BASE_RATE = 25; // Base rate per child in dollars

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
  const schedulingAlerts = useSchedulingAlerts(date);

  // Create a Set of closed school IDs for quick lookup
  const closedSchoolIds = new Set(
    (schedulingAlerts?.closures || []).map((c: any) => c.schoolId)
  );

  // Mutations
  const createRoute = useCreateRoute();
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
    // PLATFORM-SPECIFIC COLLISION DETECTION
    // Card is 180px wide x 50px tall, centered on finger in both cases
    let adjustedX = x;
    let adjustedY = y;

    if (Platform.OS === 'web') {
      // WEB: position:fixed aligns gesture coords with measureInWindow
      // Check at raw finger position (card center)
      adjustedX = x;
      adjustedY = y;
    } else {
      // NATIVE: Card top edge positioned at y - wrapperOffsetY - 25
      // measureInWindow gives window coords, so adjust for card centering
      adjustedX = x;
      adjustedY = y - 25; // Account for card being centered vertically
    }

    let hoveredId: string | null = null;
    dropZones.forEach(({ type, layout }, id) => {
      if (
        adjustedX >= layout.x &&
        adjustedX <= layout.x + layout.width &&
        adjustedY >= layout.y &&
        adjustedY <= layout.y + layout.height
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
    // PLATFORM-SPECIFIC: Same logic as handleDragMove for consistency
    let adjustedX = x;
    let adjustedY = y;

    if (Platform.OS === 'web') {
      // WEB: No adjustment needed
      adjustedX = x;
      adjustedY = y;
    } else {
      // NATIVE: Adjust for card centering
      adjustedX = x;
      adjustedY = y - 25;
    }

    let targetId: string | null = null;
    let targetType: 'child' | 'driver' | null = null;

    dropZones.forEach(({ type, layout }, id) => {
      if (
        adjustedX >= layout.x &&
        adjustedX <= layout.x + layout.width &&
        adjustedY >= layout.y &&
        adjustedY <= layout.y + layout.height
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

  // SET RATE: Open modal to adjust rates before finalizing routes
  const handleSetRateClick = (driverId: string) => {
    const childIds = driverCarpools.get(driverId);
    if (!childIds || childIds.length === 0) {
      return;
    }

    // Initialize rates for each child (default 0 bonus)
    const initialRates = new Map<string, number>();
    childIds.forEach(childId => {
      initialRates.set(childId, 0);
    });
    setChildRates(initialRates);
    setRateModalDriverId(driverId);
    setRateModalVisible(true);
  };

  // Update rate adjustment for a specific child
  const handleRateChange = (childId: string, adjustment: number) => {
    setChildRates(prev => {
      const updated = new Map(prev);
      updated.set(childId, adjustment);
      return updated;
    });
  };

  // CARPOOL: Finalize carpool by creating individual route records
  // Each child gets their own route record with same driverId/date/period
  // Driver App will detect this as a carpool automatically
  const handleConfirmRoutes = async () => {
    if (!rateModalDriverId) return;

    const childIds = driverCarpools.get(rateModalDriverId);
    if (!childIds || childIds.length === 0) {
      setRateModalVisible(false);
      return;
    }

    try {
      // Create one route per child (carpool pattern)
      for (const childId of childIds) {
        const rateAdjustment = childRates.get(childId) || 0;
        const totalRate = BASE_RATE + rateAdjustment;

        await createRoute({
          date,
          period: activePeriod,
          childId: childId as any,
          driverId: rateModalDriverId as any,
          status: 'assigned',
          // TODO: Store rate in route when schema supports it
          // rate: totalRate,
          // rateAdjustment: rateAdjustment,
        });
      }

      // Clear carpool state for this driver
      setDriverCarpools(prev => {
        const updated = new Map(prev);
        updated.delete(rateModalDriverId);
        return updated;
      });

      // Close modal and reset state
      setRateModalVisible(false);
      setRateModalDriverId(null);
      setChildRates(new Map());

      const totalBonus = Array.from(childRates.values()).reduce((sum, adj) => sum + adj, 0);
      const message = totalBonus > 0
        ? `Routes created with $${totalBonus} bonus applied!`
        : `Carpool created with ${childIds.length} children!`;

      Alert.alert('Success', message, [{ text: 'OK' }]);
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

  // Cancel and close the rate modal
  const handleCancelRateModal = () => {
    setRateModalVisible(false);
    setRateModalDriverId(null);
    setChildRates(new Map());
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

      {/* Smart Copy Section (show if empty) - Schedule-aware route copying */}
      {isEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No routes scheduled for this period</Text>
          <SmartCopySection
            targetDate={date}
            onCopySuccess={(result) => {
              Alert.alert('Success', result.message);
            }}
            onCopyError={(error) => {
              Alert.alert('Error', error);
            }}
          />
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

                    // Check if child's school is closed today
                    const isSchoolClosed = child.schoolId && closedSchoolIds.has(child.schoolId);

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
                          disabled={isSchoolClosed}
                          badge={isSchoolClosed ? "School Closed" : undefined}
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

                              {/* SET RATE: Opens modal to adjust rates before finalizing routes */}
                              <TouchableOpacity
                                style={styles.carpoolDoneButton}
                                onPress={() => handleSetRateClick(driver._id)}
                              >
                                <Text style={styles.carpoolDoneButtonText}>💰 Set Rate</Text>
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
              // SINGLE ROUTE: Show as stacked card (child above driver)
              const route = firstRoute;
              return (
                <View key={route._id} style={styles.routeCard}>
                  <View style={styles.routeInfo}>
                    {/* Stacked layout for single pairings */}
                    <View style={styles.singleRouteStack}>
                      {/* Child row */}
                      <View style={styles.singleRoutePerson}>
                        <Text style={styles.personIcon}>👧</Text>
                        <Text style={styles.singleRoutePersonName} numberOfLines={1}>
                          {route.childName}
                        </Text>
                      </View>
                      {/* Driver row */}
                      <View style={styles.singleRoutePerson}>
                        <Text style={styles.personIcon}>🚗</Text>
                        <Text style={styles.singleRoutePersonName} numberOfLines={1}>
                          {route.driverName}
                        </Text>
                        {route.scheduledTime && (
                          <Text style={styles.singleRouteTime}>⏰ {route.scheduledTime}</Text>
                        )}
                      </View>
                    </View>

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

      {/* SET RATE MODAL - Lightbox with greyed backdrop for rate adjustments */}
      <Modal
        visible={rateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelRateModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCancelRateModal}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Set Pay Rates</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCancelRateModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Driver Info */}
            {rateModalDriverId && (
              <View style={styles.modalDriverInfo}>
                <Text style={styles.modalDriverLabel}>Driver:</Text>
                <Text style={styles.modalDriverName}>
                  {unassignedDrivers?.find(d => d._id === rateModalDriverId)?.firstName || ''}{' '}
                  {unassignedDrivers?.find(d => d._id === rateModalDriverId)?.lastName || 'Selected Driver'}
                </Text>
              </View>
            )}

            {/* Rate Adjustment Section */}
            <View style={styles.modalRateSection}>
              <Text style={styles.modalSectionTitle}>Adjust Rates by Child</Text>
              <Text style={styles.modalSectionSubtitle}>
                Base rate: ${BASE_RATE}/child • Add bonus for difficult routes
              </Text>

              {/* Child Rate Cards */}
              <ScrollView style={styles.modalChildList}>
                {rateModalDriverId && driverCarpools.get(rateModalDriverId)?.map(childId => {
                  const child = unassignedChildren?.find(c => c._id === childId);
                  const adjustment = childRates.get(childId) || 0;
                  const totalRate = BASE_RATE + adjustment;

                  return (
                    <View key={childId} style={styles.modalChildCard}>
                      <View style={styles.modalChildInfo}>
                        <Text style={styles.modalChildName}>
                          👧 {child?.firstName || ''} {child?.lastName || 'Child'}
                        </Text>
                        {child?.specialNeeds && child.specialNeeds.length > 0 && (
                          <Text style={styles.modalChildNeeds}>
                            ⚠️ {child.specialNeeds.join(', ')}
                          </Text>
                        )}
                      </View>

                      {/* Rate Adjustment Controls */}
                      <View style={styles.modalRateControls}>
                        <TouchableOpacity
                          style={styles.modalRateButton}
                          onPress={() => handleRateChange(childId, Math.max(0, adjustment - 5))}
                        >
                          <Text style={styles.modalRateButtonText}>−</Text>
                        </TouchableOpacity>

                        <View style={styles.modalRateDisplay}>
                          <Text style={styles.modalRateValue}>${totalRate}</Text>
                          {adjustment > 0 && (
                            <Text style={styles.modalRateBonus}>+${adjustment}</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.modalRateButton}
                          onPress={() => handleRateChange(childId, adjustment + 5)}
                        >
                          <Text style={styles.modalRateButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Total Summary */}
              <View style={styles.modalTotalSection}>
                <Text style={styles.modalTotalLabel}>Total for this route:</Text>
                <Text style={styles.modalTotalValue}>
                  ${Array.from(childRates.values()).reduce((sum, adj) => sum + BASE_RATE + adj, 0)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelRateModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmRoutes}
              >
                <Text style={styles.modalConfirmText}>✓ Confirm Routes</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  // SINGLE ROUTE STACKED LAYOUT STYLES
  singleRouteStack: {
    gap: 4,
  },
  singleRoutePerson: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  singleRoutePersonName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  singleRouteTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // SET RATE MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  modalDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  modalDriverLabel: {
    fontSize: 14,
    color: '#1565C0',
    marginRight: 8,
  },
  modalDriverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  modalRateSection: {
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalSectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  modalChildList: {
    maxHeight: 200,
  },
  modalChildCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  modalChildInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalChildName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalChildNeeds: {
    fontSize: 11,
    color: '#F57C00',
    marginTop: 2,
  },
  modalRateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRateButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    lineHeight: 28,
  },
  modalRateDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  modalRateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  modalRateBonus: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

