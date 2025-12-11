import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface Passenger {
  childName: string;
  schoolName: string;
  grade: string;
}

interface PublicDriverCardProps {
  driverName: string;
  passengers: Passenger[];
}

export const PublicDriverCard: React.FC<PublicDriverCardProps> = ({ driverName, passengers }) => {
  const [copied, setCopied] = useState(false);

  // Helper to determine capability color
  const getCapacityColorStyle = (count: number) => {
    if (count >= 5) return styles.cardPurple;
    if (count >= 3) return styles.cardBlue;
    return styles.cardWhite;
  };

  const handleCopy = async () => {
    const text = `Ride Assignment for ${driverName}:\n` + 
      passengers.map(p => `- ${p.childName} (${p.schoolName})`).join('\n');
    
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.card, getCapacityColorStyle(passengers.length)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="bus" size={20} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.driverName} numberOfLines={1}>{driverName}</Text>
            <Text style={styles.passengerCount}>
              {passengers.length} PASSENGER{passengers.length !== 1 ? 'S' : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.copyButton, copied && styles.copyButtonSuccess]} 
          onPress={handleCopy}
          accessibilityLabel="Copy Manifest"
        >
          <Ionicons 
            name={copied ? "checkmark" : "copy-outline"} 
            size={16} 
            color={copied ? "#15803d" : "#6b7280"} 
          />
        </TouchableOpacity>
      </View>

      {/* Passengers List */}
      <View style={styles.listContainer}>
        {passengers.map((p, idx) => (
          <View key={idx} style={styles.passengerRow}>
            <View style={styles.passengerInfo}>
              <Ionicons name="person" size={14} color="#9ca3af" style={styles.personIcon} />
              <Text style={styles.childName} numberOfLines={1}>{p.childName}</Text>
            </View>
            
            {(p.schoolName && p.schoolName !== 'Unknown School') && (
              <View style={styles.schoolBadge}>
                <Text style={styles.schoolText} numberOfLines={1}>
                  {p.schoolName}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
    // Flex behavior for grid layout parent
    height: '100%', 
    flexDirection: 'column',
  },
  cardWhite: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  cardBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  cardPurple: {
    backgroundColor: '#faf5ff',
    borderColor: '#f3e8ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 12,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  passengerCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  copyButtonSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#dcfce7',
  },
  listContainer: {
    marginTop: 8,
    gap: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(243, 244, 246, 0.8)',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  personIcon: {
    marginRight: 6,
  },
  childName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  schoolBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '45%',
  },
  schoolText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
  },
});
