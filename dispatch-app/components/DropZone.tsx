/**
 * DropZone Component
 * 
 * Wrapper that tracks layout position for drop detection
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface DropZoneProps {
  id: string;
  type: 'child' | 'driver';
  children: React.ReactNode;
  isHighlighted?: boolean; // Visual feedback when dragging over
  onRegister: (
    id: string, 
    type: 'child' | 'driver', 
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
}

export function DropZone({ id, type, children, isHighlighted, onRegister }: DropZoneProps) {
  const viewRef = useRef<View>(null);

  const handleLayout = () => {
    // Measure position in window coordinates for drop detection
    viewRef.current?.measureInWindow((x, y, width, height) => {
      onRegister(id, type, { x, y, width, height });
    });
  };

  return (
    <View 
      ref={viewRef} 
      onLayout={handleLayout} 
      style={[
        styles.dropZone,
        isHighlighted && styles.highlighted
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dropZone: {
    minHeight: 60,
  },
  highlighted: {
    backgroundColor: '#E3F2FD', // Light blue highlight
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3', // Blue border
    borderStyle: 'dashed',
  },
});

