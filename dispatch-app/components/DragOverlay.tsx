/**
 * DragOverlay Component
 * 
 * Renders dragged item at root level, outside ScrollView stacking context
 * This ensures dragged cards float ABOVE all UI elements
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface DragOverlayProps {
  isDragging: boolean;
  x: number;
  y: number;
  type: 'child' | 'driver';
  name: string;
}

export function DragOverlay({ isDragging, x, y, type, name }: DragOverlayProps) {
  if (!isDragging) return null;

  const backgroundColor = type === 'child' ? '#FFF9C4' : '#BBDEFB';
  const borderColor = type === 'child' ? '#FBC02D' : '#1976D2';
  const icon = type === 'child' ? '👧' : '🚗';

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View 
        style={[
          styles.card, 
          { 
            backgroundColor, 
            borderColor,
            position: 'absolute',
            left: x - 85,  // Better centering (card width ~170)
            top: y - 60,   // Above finger so you can see drop zone
            opacity: 0.85, // Semi-transparent to see through
          }
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'none', // Let touches pass through
  },
  card: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    width: 200,
  },
  icon: { 
    fontSize: 24, 
    marginRight: 10,
  },
  name: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    flex: 1,
  },
});

