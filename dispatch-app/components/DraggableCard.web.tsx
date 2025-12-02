/**
 * DraggableCard Component (Web Version)
 *
 * Web-specific implementation using pointer events for drag functionality.
 * Bypasses react-native-gesture-handler/reanimated which cause build issues on web.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DraggableCardProps {
  id: string;
  type: 'child' | 'driver';
  name: string;
  onDragStart: (id: string, type: 'child' | 'driver', name: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (id: string, type: 'child' | 'driver', x: number, y: number) => void;
  disabled?: boolean;
  badge?: string; // e.g., "School Closed"
}

export function DraggableCard({ id, type, name, onDragStart, onDragMove, onDragEnd, disabled, badge }: DraggableCardProps) {
  const isDragging = useRef(false);

  // Store latest callbacks in refs to avoid stale closure issues
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  // Keep refs up to date
  useEffect(() => {
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [onDragMove, onDragEnd]);

  // Disabled children get grayed-out styling
  const backgroundColor = disabled
    ? '#E0E0E0'
    : (type === 'child' ? '#FFF9C4' : '#BBDEFB');
  const borderColor = disabled
    ? '#9E9E9E'
    : (type === 'child' ? '#FBC02D' : '#1976D2');
  const icon = type === 'child' ? '👧' : '🚗';

  // Handle pointer/mouse down to start drag
  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    // Don't allow dragging if disabled
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;

    // Handle pointer/mouse move during drag - defined inline to use refs
    const handleMove = (moveEvent: PointerEvent | MouseEvent) => {
      if (!isDragging.current) return;
      moveEvent.preventDefault();
      onDragMoveRef.current(moveEvent.clientX, moveEvent.clientY);
    };

    // Handle pointer/mouse up to end drag
    const handleUp = (upEvent: PointerEvent | MouseEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      // Remove listeners
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      onDragEndRef.current(id, type, upEvent.clientX, upEvent.clientY);
    };

    // Add global listeners to track movement anywhere on screen
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    onDragStart(id, type, name);
    onDragMoveRef.current(e.clientX, e.clientY);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor },
        disabled && styles.cardDisabled,
      ]}
      // @ts-ignore - Web-specific event handlers
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
    >
      <Text style={[styles.icon, disabled && styles.iconDisabled]}>{icon}</Text>
      <View style={styles.nameContainer}>
        <Text style={[styles.name, disabled && styles.nameDisabled]} numberOfLines={1}>{name}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
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
    cursor: 'grab',
    userSelect: 'none',
  } as any,
  cardDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  } as any,
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
  } as any,
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
