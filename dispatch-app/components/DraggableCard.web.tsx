/**
 * DraggableCard Component (Web Version)
 *
 * Web-specific implementation using pointer events for drag functionality.
 * Bypasses react-native-gesture-handler/reanimated which cause build issues on web.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DraggableCardProps {
  id: string;
  type: 'child' | 'driver';
  name: string;
  onDragStart: (id: string, type: 'child' | 'driver', name: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (id: string, type: 'child' | 'driver', x: number, y: number) => void;
}

export function DraggableCard({ id, type, name, onDragStart, onDragMove, onDragEnd }: DraggableCardProps) {
  const isDragging = useRef(false);
  const cardRef = useRef<View>(null);

  const backgroundColor = type === 'child' ? '#FFF9C4' : '#BBDEFB';
  const borderColor = type === 'child' ? '#FBC02D' : '#1976D2';
  const icon = type === 'child' ? '👧' : '🚗';

  // Handle pointer/mouse move during drag
  const handlePointerMove = useCallback((e: PointerEvent | MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    onDragMove(e.clientX, e.clientY);
  }, [onDragMove]);

  // Handle pointer/mouse up to end drag
  const handlePointerUp = useCallback((e: PointerEvent | MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Remove global listeners
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.removeEventListener('mousemove', handlePointerMove);
    document.removeEventListener('mouseup', handlePointerUp);

    onDragEnd(id, type, e.clientX, e.clientY);
  }, [id, type, onDragEnd, handlePointerMove]);

  // Handle pointer/mouse down to start drag
  const handlePointerDown = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    // Add global listeners to track movement anywhere on screen
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);

    onDragStart(id, type, name);
    onDragMove(e.clientX, e.clientY);
  }, [id, type, name, onDragStart, onDragMove, handlePointerMove, handlePointerUp]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <View
      ref={cardRef}
      style={[
        styles.card,
        { backgroundColor, borderColor },
        isDragging.current && styles.dragging
      ]}
      // @ts-ignore - Web-specific event handlers
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
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
  dragging: {
    opacity: 0.5,
    cursor: 'grabbing',
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
