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
  onRegister: (
    id: string, 
    type: 'child' | 'driver', 
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
}

export function DropZone({ id, type, children, onRegister }: DropZoneProps) {
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
      style={styles.dropZone}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dropZone: {
    minHeight: 60,
  },
});

