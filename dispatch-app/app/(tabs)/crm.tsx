import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAllChildren, useAllDrivers, useAllSchools } from '../../hooks/useConvexRoutes';
import ChildrenContent from '../../components/ChildrenContent';
import DriversContent from '../../components/DriversContent';
import SchoolsContent from '../../components/SchoolsContent';

type ActiveTab = 'children' | 'drivers' | 'schools' | null;

export default function CrmScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  // Get counts for badges
  const children = useAllChildren();
  const drivers = useAllDrivers();
  const schools = useAllSchools();

  const childrenCount = children?.length ?? 0;
  const driversCount = drivers?.length ?? 0;
  const schoolsCount = schools?.length ?? 0;

  const handleTabPress = (tab: 'children' | 'drivers' | 'schools') => {
    // Toggle: if same tab pressed, deselect; otherwise select new tab
    setActiveTab(activeTab === tab ? null : tab);
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'children' && styles.activeSegment]}
          onPress={() => handleTabPress('children')}
        >
          <Text style={[styles.segmentText, activeTab === 'children' && styles.activeSegmentText]}>
            Children ({childrenCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'drivers' && styles.activeSegment]}
          onPress={() => handleTabPress('drivers')}
        >
          <Text style={[styles.segmentText, activeTab === 'drivers' && styles.activeSegmentText]}>
            Drivers ({driversCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'schools' && styles.activeSegment]}
          onPress={() => handleTabPress('schools')}
        >
          <Text style={[styles.segmentText, activeTab === 'schools' && styles.activeSegmentText]}>
            Schools ({schoolsCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {activeTab === null && (
        <View style={styles.placeholderContainer}>
          <View style={styles.dashedCard}>
            <Text style={styles.placeholderTitle}>Global CRM - Company Contacts</Text>
            <Text style={styles.comingSoon}>Coming soon...</Text>
          </View>

          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerIcon}>ℹ️</Text>
            <Text style={styles.disclaimerText}>
              Please edit entities within each of the above tabs. Only adds and edits within these areas will be reflected in the App with Child / Driver / School pairings.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'children' && <ChildrenContent />}
      {activeTab === 'drivers' && <DriversContent />}
      {activeTab === 'schools' && <SchoolsContent />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    margin: 16,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeSegment: {
    backgroundColor: '#FFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeSegmentText: {
    color: '#007AFF',
  },
  placeholderContainer: {
    flex: 1,
    padding: 16,
  },
  dashedCard: {
    borderWidth: 2,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  disclaimerIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
});
