import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAllDrivers, useAddDriver } from '../../hooks/useConvexRoutes';
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
  const addDriver = useAddDriver();

  const [modalVisible, setModalVisible] = useState(false);
  const [newDriver, setNewDriver] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDriver = async () => {
    if (!newDriver.firstName || !newDriver.lastName || !newDriver.email || !newDriver.phone) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setIsAdding(true);
    try {
      await addDriver(newDriver);
      Alert.alert('Success', 'Driver added successfully!');
      setModalVisible(false);
      setNewDriver({ firstName: '', lastName: '', email: '', phone: '' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add driver.');
    } finally {
      setIsAdding(false);
    }
  };

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
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Driver</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#999"
              value={newDriver.firstName}
              onChangeText={(text) => setNewDriver({ ...newDriver, firstName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#999"
              value={newDriver.lastName}
              onChangeText={(text) => setNewDriver({ ...newDriver, lastName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={newDriver.email}
              onChangeText={(text) => setNewDriver({ ...newDriver, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              value={newDriver.phone}
              onChangeText={(text) => setNewDriver({ ...newDriver, phone: text })}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleAddDriver} disabled={isAdding}>
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.submitButtonText]}>Add Driver</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
});
