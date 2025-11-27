/**
 * DragOverlay Component (Web Version)
 *
 * Web-specific implementation using standard React Native components.
 * Bypasses react-native-reanimated which causes build issues on web.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DragOverlayProps {
  isDragging: boolean;
  absoluteX: number;
  absoluteY: number;
  wrapperOffsetY: number;
  type: 'child' | 'driver';
  name: string;
}

export function DragOverlay({ isDragging, absoluteX, absoluteY, type, name }: DragOverlayProps) {
  if (!isDragging) {
    return null;
  }

  const backgroundColor = type === 'child' ? '#FFF9C4' : '#BBDEFB';
  const borderColor = type === 'child' ? '#FBC02D' : '#1976D2';
  const icon = type === 'child' ? '👧' : '🚗';

  // Card dimensions for centering
  const cardWidth = 180;
  const cardHeight = 50;

  // WEB: Use raw gesture coordinates directly - they're already viewport-relative
  const relativeX = absoluteX;
  const relativeY = absoluteY;

  return (
    <View style={[styles.overlay, { pointerEvents: 'none' }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor,
            borderColor,
            position: 'absolute',
            // Center the card on the finger position
            left: relativeX - (cardWidth / 2),
            top: relativeY - (cardHeight / 2),
            width: cardWidth,
            opacity: 0.85,
          }
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // WEB: Use fixed positioning for viewport-relative positioning
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    pointerEvents: 'none',
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
    shadowRadius: 6,
  } as any,
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
