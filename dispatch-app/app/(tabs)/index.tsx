import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

import { Text, View } from '@/components/Themed';

export default function TabOneScreen() {
  // Test Convex connection by querying children
  const children = useQuery(api.children.list);

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🚗 Go Happy Cab Dispatch</Text>
        <Text style={styles.subtitle}>Convex Connection Test</Text>
        
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        
        {children === undefined ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Connecting to Convex...</Text>
          </View>
        ) : (
          <View style={styles.dataContainer}>
            <Text style={styles.successText}>✅ Connected to Convex!</Text>
            <Text style={styles.countText}>
              Found {children.length} children in database
            </Text>
            
            <View style={styles.list}>
              {children.map((child) => (
                <View key={child._id} style={styles.listItem}>
                  <Text style={styles.emoji}>👧</Text>
                  <Text style={styles.childName}>{child.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
  dataContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  countText: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 20,
  },
  list: {
    width: '100%',
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '500',
  },
});
