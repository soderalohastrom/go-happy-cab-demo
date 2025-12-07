import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAllDrivers, useAddDriver, useDeactivateDriver, useReactivateDriver, useUpdateDriver } from '../hooks/useConvexRoutes';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

// Define a type for the driver object for clarity
type Driver = {
  _id: Id<"drivers">;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "on_shift" | "off_shift" | "suspended";
  active: boolean;
  onHold?: boolean;
  onHoldSince?: string;
};

export default function DriversContent() {
  const drivers = useAllDrivers();
  const addDriver = useAddDriver();
  const toggleOnHold = useMutation(api.drivers.toggleOnHold);
  const deactivateDriver = useDeactivateDriver();
  const reactivateDriver = useReactivateDriver();
  const updateDriver = useUpdateDriver();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriver, setNewDriver] = useState({
    employeeId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    primaryLanguage: '',
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    },
    startDate: '',
    availabilityAM: '',
    availabilityPM: '',
    specialEquipment: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    // New fields from Google Sheets import
    dateOfBirth: '',
    jobTitle: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseStateOfIssue: '',
    licenseZipCode: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter drivers based on search query
  const filteredDrivers = drivers?.filter(driver => {
    const query = searchQuery.toLowerCase();
    return (
      driver.firstName.toLowerCase().includes(query) ||
      driver.lastName.toLowerCase().includes(query) ||
      driver.email.toLowerCase().includes(query) ||
      driver.phone.includes(query) ||
      (driver.employeeId && driver.employeeId.toLowerCase().includes(query))
    );
  });

  const handleSubmit = async () => {
    if (!newDriver.employeeId || !newDriver.firstName || !newDriver.lastName || !newDriver.email || !newDriver.phone) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setIsAdding(true);
    try {
      if (modalMode === 'edit' && editingDriver) {
        await updateDriver({
          id: editingDriver._id,
          employeeId: newDriver.employeeId,
          firstName: newDriver.firstName,
          middleName: newDriver.middleName || undefined,
          lastName: newDriver.lastName,
          email: newDriver.email,
          phone: newDriver.phone,
          primaryLanguage: newDriver.primaryLanguage || undefined,
          address: newDriver.address.street ? newDriver.address : undefined,
          startDate: newDriver.startDate || undefined,
          availabilityAM: newDriver.availabilityAM || undefined,
          availabilityPM: newDriver.availabilityPM || undefined,
          specialEquipment: newDriver.specialEquipment || undefined,
          emergencyContact: newDriver.emergencyContact.name ? newDriver.emergencyContact : undefined,
          // New fields from Google Sheets import
          dateOfBirth: newDriver.dateOfBirth || undefined,
          jobTitle: newDriver.jobTitle || undefined,
          licenseNumber: newDriver.licenseNumber || undefined,
          licenseExpiry: newDriver.licenseExpiry || undefined,
          licenseStateOfIssue: newDriver.licenseStateOfIssue || undefined,
          licenseZipCode: newDriver.licenseZipCode || undefined,
        });
        Alert.alert('Success', 'Driver updated successfully!');
      } else {
        await addDriver(newDriver);
        Alert.alert('Success', 'Driver added successfully!');
      }
      setModalVisible(false);
      setNewDriver({
        employeeId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        primaryLanguage: '',
        address: { street: '', street2: '', city: '', state: '', zip: '' },
        startDate: '',
        availabilityAM: '',
        availabilityPM: '',
        specialEquipment: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        dateOfBirth: '',
        jobTitle: '',
        licenseNumber: '',
        licenseExpiry: '',
        licenseStateOfIssue: '',
        licenseZipCode: '',
      });
      setEditingDriver(null);
      setModalMode('add');
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${modalMode} driver.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingDriver(null);
    setNewDriver({
      employeeId: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      primaryLanguage: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      startDate: '',
      availabilityAM: '',
      availabilityPM: '',
      specialEquipment: '',
      emergencyContact: { name: '', phone: '', relationship: '' },
      dateOfBirth: '',
      jobTitle: '',
      licenseNumber: '',
      licenseExpiry: '',
      licenseStateOfIssue: '',
      licenseZipCode: '',
    });
    setModalVisible(true);
  };

  const handleOpenEditModal = (driver: Driver) => {
    setModalMode('edit');
    setEditingDriver(driver);
    setNewDriver({
      employeeId: driver.employeeId || '',
      firstName: driver.firstName,
      middleName: (driver as any).middleName || '',
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      primaryLanguage: (driver as any).primaryLanguage || '',
      address: (driver as any).address || { street: '', street2: '', city: '', state: '', zip: '' },
      startDate: (driver as any).startDate || '',
      availabilityAM: (driver as any).availabilityAM || '',
      availabilityPM: (driver as any).availabilityPM || '',
      specialEquipment: (driver as any).specialEquipment || '',
      emergencyContact: (driver as any).emergencyContact || { name: '', phone: '', relationship: '' },
      // New fields from Google Sheets import
      dateOfBirth: (driver as any).dateOfBirth || '',
      jobTitle: (driver as any).jobTitle || '',
      licenseNumber: (driver as any).licenseNumber || '',
      licenseExpiry: (driver as any).licenseExpiry || '',
      licenseStateOfIssue: (driver as any).licenseStateOfIssue || '',
      licenseZipCode: (driver as any).licenseZipCode || '',
    });
    setModalVisible(true);
  };

  const handleToggleActive = (driver: Driver) => {
    const action = driver.active ? 'Deactivate' : 'Reactivate';
    Alert.alert(
      `${action} Driver`,
      `Are you sure you want to ${action.toLowerCase()} ${driver.firstName} ${driver.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: driver.active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (driver.active) {
                await deactivateDriver({ id: driver._id });
              } else {
                await reactivateDriver({ id: driver._id });
              }
              Alert.alert('Success', `Driver has been ${action.toLowerCase()}d.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} driver.`);
            }
          },
        },
      ]
    );
  };

  const handleToggleOnHold = async (driver: Driver) => {
    try {
      await toggleOnHold({ id: driver._id });
      // No alert needed - the visual change is immediate feedback
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle on hold status.');
    }
  };

  const renderDriver = ({ item }: { item: Driver }) => (
    <View style={[styles.driverCard, item.onHold && styles.onHoldCard]}>
      <View style={styles.driverInfo}>
        <Text style={[styles.driverName, item.onHold && styles.onHoldText]}>{item.firstName} {item.lastName}</Text>
        <Text style={[styles.driverContact, item.onHold && styles.onHoldText]}>{item.email} | {item.phone}</Text>
      </View>
      <View style={styles.onHoldToggleContainer}>
        <Text style={[styles.onHoldLabel, item.onHold && styles.onHoldText]}>On Hold</Text>
        <Switch
          value={item.onHold || false}
          onValueChange={() => handleToggleOnHold(item)}
          trackColor={{ false: '#E0E0E0', true: '#FFCC80' }}
          thumbColor={item.onHold ? '#FF9800' : '#FFFFFF'}
        />
      </View>
      <View style={styles.driverStatus}>
        <View style={[styles.statusIndicator, item.active ? styles.active : styles.inactive]} />
        <Text style={[styles.statusText, item.onHold && styles.onHoldText]}>{item.active ? 'Active' : 'Inactive'}</Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleOpenEditModal(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, !item.active && styles.reactivateButton]}
          onPress={() => handleToggleActive(item)}
        >
          <Text style={styles.actionButtonText}>{item.active ? 'Deactivate' : 'Reactivate'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
          <Text style={styles.addButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search drivers by name, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {drivers === undefined ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={filteredDrivers}
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
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add New Driver' : 'Edit Driver'}</Text>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Employee ID *"
                placeholderTextColor="#999"
                value={newDriver.employeeId}
                onChangeText={(text) => setNewDriver({ ...newDriver, employeeId: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                placeholderTextColor="#999"
                value={newDriver.firstName}
                onChangeText={(text) => setNewDriver({ ...newDriver, firstName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name *"
                placeholderTextColor="#999"
                value={newDriver.lastName}
                onChangeText={(text) => setNewDriver({ ...newDriver, lastName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address *"
                placeholderTextColor="#999"
                value={newDriver.email}
                onChangeText={(text) => setNewDriver({ ...newDriver, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                placeholderTextColor="#999"
                value={newDriver.phone}
                onChangeText={(text) => setNewDriver({ ...newDriver, phone: text })}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Middle Name"
                placeholderTextColor="#999"
                value={newDriver.middleName}
                onChangeText={(text) => setNewDriver({ ...newDriver, middleName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Primary Language (e.g., Portuguese, Spanish)"
                placeholderTextColor="#999"
                value={newDriver.primaryLanguage}
                onChangeText={(text) => setNewDriver({ ...newDriver, primaryLanguage: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={newDriver.dateOfBirth}
                onChangeText={(text) => setNewDriver({ ...newDriver, dateOfBirth: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Job Title"
                placeholderTextColor="#999"
                value={newDriver.jobTitle}
                onChangeText={(text) => setNewDriver({ ...newDriver, jobTitle: text })}
              />

              {/* Address Section */}
              <Text style={styles.sectionTitle}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                placeholderTextColor="#999"
                value={newDriver.address.street}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  address: { ...newDriver.address, street: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Apt/Unit/Suite (Optional)"
                placeholderTextColor="#999"
                value={newDriver.address.street2}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  address: { ...newDriver.address, street2: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#999"
                value={newDriver.address.city}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  address: { ...newDriver.address, city: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor="#999"
                value={newDriver.address.state}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  address: { ...newDriver.address, state: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="ZIP Code"
                placeholderTextColor="#999"
                value={newDriver.address.zip}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  address: { ...newDriver.address, zip: text }
                })}
                keyboardType="numeric"
              />

              {/* Employment Details Section */}
              <Text style={styles.sectionTitle}>Employment Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Start Date (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={newDriver.startDate}
                onChangeText={(text) => setNewDriver({ ...newDriver, startDate: text })}
              />

              <Text style={styles.fieldLabel}>Availability AM</Text>
              <Picker
                selectedValue={newDriver.availabilityAM}
                onValueChange={(value) => setNewDriver({ ...newDriver, availabilityAM: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select..." value="" />
                <Picker.Item label="YES" value="YES" />
                <Picker.Item label="NO" value="NO" />
                <Picker.Item label="LIMITED" value="LIMITED" />
              </Picker>

              <Text style={styles.fieldLabel}>Availability PM</Text>
              <Picker
                selectedValue={newDriver.availabilityPM}
                onValueChange={(value) => setNewDriver({ ...newDriver, availabilityPM: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select..." value="" />
                <Picker.Item label="YES" value="YES" />
                <Picker.Item label="NO" value="NO" />
                <Picker.Item label="LIMITED" value="LIMITED" />
              </Picker>

              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Special Equipment (e.g., Car Seats, Booster)"
                placeholderTextColor="#999"
                value={newDriver.specialEquipment}
                onChangeText={(text) => setNewDriver({ ...newDriver, specialEquipment: text })}
                multiline
                numberOfLines={2}
              />

              {/* License Information Section */}
              <Text style={styles.sectionTitle}>License Information</Text>
              <TextInput
                style={styles.input}
                placeholder="License Number"
                placeholderTextColor="#999"
                value={newDriver.licenseNumber}
                onChangeText={(text) => setNewDriver({ ...newDriver, licenseNumber: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="License Expiry (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={newDriver.licenseExpiry}
                onChangeText={(text) => setNewDriver({ ...newDriver, licenseExpiry: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="License State of Issue (e.g., CA)"
                placeholderTextColor="#999"
                value={newDriver.licenseStateOfIssue}
                onChangeText={(text) => setNewDriver({ ...newDriver, licenseStateOfIssue: text })}
                autoCapitalize="characters"
                maxLength={2}
              />
              <TextInput
                style={styles.input}
                placeholder="License Zip Code"
                placeholderTextColor="#999"
                value={newDriver.licenseZipCode}
                onChangeText={(text) => setNewDriver({ ...newDriver, licenseZipCode: text })}
                keyboardType="numeric"
              />

              {/* Emergency Contact Section */}
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact Name"
                placeholderTextColor="#999"
                value={newDriver.emergencyContact.name}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  emergencyContact: { ...newDriver.emergencyContact, name: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Contact Phone"
                placeholderTextColor="#999"
                value={newDriver.emergencyContact.phone}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  emergencyContact: { ...newDriver.emergencyContact, phone: text }
                })}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Spouse, Parent)"
                placeholderTextColor="#999"
                value={newDriver.emergencyContact.relationship}
                onChangeText={(text) => setNewDriver({
                  ...newDriver,
                  emergencyContact: { ...newDriver.emergencyContact, relationship: text }
                })}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit} disabled={isAdding}>
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.submitButtonText]}>
                    {modalMode === 'add' ? 'Add Driver' : 'Update Driver'}
                  </Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F5F5F5',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    backgroundColor: '#4CAF50',
  },
  inactive: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  editButtonText: {
    color: '#2196F3',
    fontWeight: '500',
    fontSize: 12,
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
  reactivateButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'stretch',
  },
  scrollContainer: {
    maxHeight: 400,
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
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  picker: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
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
  // On Hold styles
  onHoldCard: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  onHoldText: {
    color: '#999',
  },
  onHoldToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  onHoldLabel: {
    fontSize: 11,
    marginRight: 4,
    color: '#666',
  },
});
