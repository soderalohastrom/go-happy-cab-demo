import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { PublicDriverCard } from '../../components/PublicDriverCard';
import { Ionicons } from '@expo/vector-icons';

// Define interfaces for the data structure
interface Passenger {
  childName: string;
  schoolName?: string;
  grade?: string;
  [key: string]: any;
}

interface Assignment {
  driverName: string;
  children: Passenger[]; // Array of passengers
}

interface Manifest {
  date: string;
  period: string;
  publishedAt: number; // timestamp
  assignments: Assignment[];
}

export default function PublicDispatchPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  
  const manifest = useQuery<Manifest | null | undefined>(api.publish.getPublicManifest, { 
    slug: slug || "" 
  });

  if (!slug) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Invalid Page URL</Text>
      </View>
    );
  }

  if (manifest === undefined) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Dispatch Board...</Text>
      </View>
    );
  }

  if (manifest === null) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Dispatch Board Not Found</Text>
        <Text style={styles.subText}>This schedule may have expired or the link is incorrect.</Text>
      </View>
    );
  }

  // Calculate totals
  const totalDrivers = manifest.assignments.length;
  // Use explicit types in reduce callback
  const totalPassengers = manifest.assignments.reduce((sum: number, d: Assignment) => sum + d.children.length, 0);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <View style={styles.container}>
      {/* Print-specific styles using a standard HTML style tag for Web */}
      {Platform.OS === 'web' && (
        <style type="text/css">{`
          @media print {
            /* Hide non-essential elements */
            [data-print="hide"] { 
              display: none !important; 
            }
            /* Reset backgrounds */
            body { 
              background-color: #fff !important; 
              -webkit-print-color-adjust: exact; 
            }
            /* Main container reset */
            [data-print="container"] {
              background-color: #fff !important;
            }
            /* Grid layout adjustments for print optimization */
            [data-print="grid"] {
              display: block !important; /* Fallback to block to help breaks */
              width: 100% !important;
            }
            /* Card break avoidance */
            [data-print="card"] {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 16px;
              width: 100% !important;
              max-width: 100% !important;
              border: 1px solid #ddd !important;
              box-shadow: none !important;
            }
            /* Hide header background/shadow to save ink, keep logo */
            [data-print="header"] {
              shadow-none !important;
              border-bottom: 2px solid #000 !important;
            }
          }
          /* Hide print button on mobile devices (portrait phones) */
          @media screen and (max-width: 768px) {
            [data-responsive="desktop-only"] {
              display: none !important;
            }
          }
        `}</style>
      )}

      <Stack.Screen options={{ 
        title: `Dispatch: ${manifest.date} (${manifest.period})`,
        headerShown: false 
      }} />

      {/* @ts-ignore */}
      <View style={styles.header} dataSet={{ print: "header" }}>
        <View style={styles.headerContent}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Ionicons name="bus" size={24} color="#713f12" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Go Happy Rides</Text>
              <Text style={styles.brandSubtitle}>
                Dispatch for {manifest.date} • {manifest.period} Shift
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
             <View style={styles.statsRow}>
              <View style={[styles.statBadge, styles.statBlue]}>
                <Ionicons name="bus-outline" size={16} color="#1d4ed8" style={styles.statIcon} />
                <Text style={styles.statTextBlue}>{totalDrivers} Drivers</Text>
              </View>
              <View style={[styles.statBadge, styles.statIndigo]}>
                <Ionicons name="people-outline" size={16} color="#4338ca" style={styles.statIcon} />
                <Text style={styles.statTextIndigo}>{totalPassengers} Riders</Text>
              </View>
            </View>
            
            {/* Print Button */}
            {Platform.OS === 'web' && (
              /* @ts-ignore */
              <TouchableOpacity 
                style={styles.printButton} 
                onPress={handlePrint}
                dataSet={{ print: "hide", responsive: "desktop-only" }} // Hide on print AND mobile
              >
                <Ionicons name="print-outline" size={20} color="#374151" />
                <Text style={styles.printButtonText}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content Grid */}
      {/* @ts-ignore */}
      <ScrollView contentContainerStyle={styles.scrollContent} dataSet={{ print: "container" }}>
        {/* @ts-ignore */}
        <View style={styles.gridContainer} dataSet={{ print: "grid" }}>
          {manifest.assignments.map((assignment: Assignment, index: number) => (
            /* @ts-ignore */
            <View key={index} style={styles.gridItem} dataSet={{ print: "card" }}>
              <PublicDriverCard 
                driverName={assignment.driverName}
                passengers={assignment.children}
              />
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date(manifest.publishedAt).toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Responsive Grid Styles helper
// On web, we can use media queries or calc(), but in standard RN styles we usually use Flexbox wrapping.
// For a true responsive grid in RN Web without extra libs, we rely on flexWrap: 'wrap'.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    color: '#1f2937',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerContent: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    backgroundColor: '#facc15',
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statIcon: {
    marginRight: 6,
  },
  statBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  statIndigo: {
    backgroundColor: '#eef2ff',
    borderColor: '#e0e7ff',
  },
  statTextBlue: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  statTextIndigo: {
    color: '#4338ca',
    fontWeight: '700',
    fontSize: 13,
  },
  printButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1400,
    width: '100%',
  },
  gridItem: {
    width: '100%',
    maxWidth: 380,
    minWidth: 300,
    flexGrow: 1,
    flexBasis: 300, 
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
