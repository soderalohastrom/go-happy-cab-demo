/**
 * DraggableCard Component
 * 
 * Draggable child or driver card with touch gestures and animations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  onDragEnd: (id: string, type: 'child' | 'driver', x: number, y: number) => void;
}

export function DraggableCard({ id, type, name, onDragEnd }: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Scale up and bring to front during drag
      scale.value = withSpring(1.1);
      zIndex.value = 1000;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      // Call drag end handler with absolute position
      runOnJS(onDragEnd)(id, type, e.absoluteX, e.absoluteY);
      
      // Animate back to original position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 1;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  const backgroundColor = type === 'child' ? '#FFF9C4' : '#BBDEFB';
  const borderColor = type === 'child' ? '#FBC02D' : '#1976D2';
  const icon = type === 'child' ? '👧' : '🚗';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, { backgroundColor, borderColor }, animatedStyle]}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
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

