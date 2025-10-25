import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAllDrivers } from '../../hooks/useConvexRoutes';
import { Id } from '../../convex/_generated/dataModel';

// Define a type for the driver object for clarity
type Driver = {
  _id: Id<"drivers">;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "on_shift" | "off_shift" | "suspended";
  active: boolean;
};

export default function DriversScreen() {
  const drivers = useAllDrivers();

  const renderDriver = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.driverContact}>{item.email} | {item.phone}</Text>
      </View>
      <View style={styles.driverStatus}>
        <View style={[styles.statusIndicator, item.active ? styles.active : styles.inactive]} />
        <Text style={styles.statusText}>{item.active ? 'Active' : 'Inactive'}</Text>
      </View>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>{item.active ? 'Deactivate' : 'Activate'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Management</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {drivers === undefined ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={drivers}
          renderItem={renderDriver}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverContact: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  driverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  active: {
    backgroundColor: '#4CAF50', // Green
  },
  inactive: {
    backgroundColor: '#F44336', // Red
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 12,
  },
});
