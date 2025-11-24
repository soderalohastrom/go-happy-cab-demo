import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DraggableCardProps {
  id: string;
  type: 'child' | 'driver';
  name: string;
  onDragStart: (id: string, type: 'child' | 'driver', name: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (id: string, type: 'child' | 'driver', x: number, y: number) => void;
}

export function DraggableCard({ id, type, name }: DraggableCardProps) {
  const backgroundColor = type === 'child' ? '#FFF9C4' : '#BBDEFB';
  const borderColor = type === 'child' ? '#FBC02D' : '#1976D2';
  const icon = type === 'child' ? '👧' : '🚗';

  return (
    <View style={[styles.card, { backgroundColor, borderColor }]}>
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
    // elevation: 3, // Elevation can sometimes cause issues on web if not handled
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
