/**
 * DraggableCard Component
 * 
 * Draggable child or driver card with touch gestures and animations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';

interface DraggableCardProps {
  id: string;
  type: 'child' | 'driver';
  name: string;
  onDragStart: (id: string, type: 'child' | 'driver', name: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (id: string, type: 'child' | 'driver', x: number, y: number) => void;
  disabled?: boolean;
  badge?: string; // e.g., "School Closed"
  showLockIcon?: boolean; // Show lock icon for past period disabled cards
}

export function DraggableCard({ id, type, name, onDragStart, onDragMove, onDragEnd, disabled, badge, showLockIcon }: DraggableCardProps) {
  const isDragging = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(!disabled) // Disable gesture when disabled
    .onStart(() => {
      isDragging.value = 1;
      runOnJS(onDragStart)(id, type, name);
    })
    .onUpdate((e) => {
      runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      isDragging.value = 0;
      runOnJS(onDragEnd)(id, type, e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value === 1 ? 0 : 1, // Hide original during drag
  }));

  // Disabled children get grayed-out styling
  const backgroundColor = disabled
    ? '#E0E0E0'
    : (type === 'child' ? '#FFF9C4' : '#BBDEFB');
  const borderColor = disabled
    ? '#9E9E9E'
    : (type === 'child' ? '#FBC02D' : '#1976D2');
  const icon = type === 'child' ? '👧' : '🚗';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[
        styles.card,
        { backgroundColor, borderColor },
        animatedStyle,
        disabled && styles.cardDisabled
      ]}>
        <Text style={[styles.icon, disabled && styles.iconDisabled]}>{icon}</Text>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, disabled && styles.nameDisabled]} numberOfLines={1}>{name}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {/* Lock icon for past period disabled cards */}
        {showLockIcon && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#6c757d" />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  iconDisabled: {
    opacity: 0.5,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nameDisabled: {
    color: '#757575',
  },
  badge: {
    backgroundColor: '#EF5350',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  lockOverlay: {
    marginLeft: 8,
    padding: 4,
  },
});

