import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAllChildren, useAddChild, useDeactivateChild, useReactivateChild, useUpdateChild, useAllSchools, useAllDrivers } from '../hooks/useConvexRoutes';
import { Id } from '../convex/_generated/dataModel';

// Define a type for the child object for clarity
type Child = {
  _id: Id<"children">;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName: string;
  studentId: string;
  dateOfBirth?: string;
  homeLanguage?: string;
  rideType?: string;
  active: boolean;
};

export default function ChildrenContent() {
  const children = useAllChildren();
  const addChild = useAddChild();
  const deactivateChild = useDeactivateChild();
  const reactivateChild = useReactivateChild();
  const updateChild = useUpdateChild();
  const schools = useAllSchools();
  const drivers = useAllDrivers();

  // Helper function to create initial child state
  const getInitialChildState = () => ({
    firstName: '',
    lastName: '',
    middleName: '',
    preferredName: '',
    grade: '',
    schoolId: '',
    schoolName: '',
    dateOfBirth: '',
    homeLanguage: '',
    rideType: '',
    studentId: '',
    parent1: {
      firstName: '',
      lastName: '',
      phone: '',
    },
    parent2: {
      firstName: '',
      lastName: '',
      phone: '',
    },
    teacher: {
      firstName: '',
      lastName: '',
      phone: '',
    },
    caseManager: {
      firstName: '',
      lastName: '',
    },
    seizureProtocol: false,
    boosterSeat: false,
    specialNeeds: '',
    notes: '',
    defaultAmDriverId: undefined as any,
    defaultPmDriverId: undefined as any,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [newChild, setNewChild] = useState(getInitialChildState());
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter children based on search query
  const filteredChildren = children?.filter(child => {
    const query = searchQuery.toLowerCase();
    return (
      child.firstName.toLowerCase().includes(query) ||
      child.lastName.toLowerCase().includes(query) ||
      child.schoolName.toLowerCase().includes(query) ||
      child.grade.toLowerCase().includes(query)
    );
  });

  const handleSubmit = async () => {
    if (!newChild.firstName || !newChild.lastName || !newChild.grade || !newChild.schoolName) {
      Alert.alert('Error', 'Please fill in required fields: First Name, Last Name, Grade, and School Name.');
      return;
    }
    setIsAdding(true);
    try {
      if (modalMode === 'edit' && editingChild) {
        await updateChild({
          id: editingChild._id,
          firstName: newChild.firstName,
          lastName: newChild.lastName,
          grade: newChild.grade,
          schoolName: newChild.schoolName,
          dateOfBirth: newChild.dateOfBirth || undefined,
          homeLanguage: newChild.homeLanguage || undefined,
          rideType: newChild.rideType || undefined,
          studentId: newChild.studentId || undefined,
        });
        Alert.alert('Success', 'Child updated successfully!');
      } else {
        await addChild({
          firstName: newChild.firstName,
          lastName: newChild.lastName,
          grade: newChild.grade,
          schoolName: newChild.schoolName,
          dateOfBirth: newChild.dateOfBirth || undefined,
          homeLanguage: newChild.homeLanguage || undefined,
          rideType: newChild.rideType || undefined,
          studentId: newChild.studentId || undefined,
        });
        Alert.alert('Success', 'Child added successfully!');
      }
      setModalVisible(false);
      setNewChild(getInitialChildState());
      setEditingChild(null);
      setModalMode('add');
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${modalMode} child.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingChild(null);
    setNewChild(getInitialChildState());
    setModalVisible(true);
  };

  const handleOpenEditModal = (child: Child) => {
    setModalMode('edit');
    setEditingChild(child);
    const childData = child as any; // Type assertion for optional fields
    setNewChild({
      firstName: child.firstName,
      lastName: child.lastName,
      middleName: childData.middleName || '',
      preferredName: childData.preferredName || '',
      grade: child.grade,
      schoolId: childData.schoolId || '',
      schoolName: child.schoolName,
      dateOfBirth: child.dateOfBirth || '',
      homeLanguage: child.homeLanguage || '',
      rideType: child.rideType || '',
      studentId: child.studentId || '',
      parent1: childData.parent1 || { firstName: '', lastName: '', phone: '' },
      parent2: childData.parent2 || { firstName: '', lastName: '', phone: '' },
      teacher: childData.teacher || { firstName: '', lastName: '', phone: '' },
      caseManager: childData.caseManager || { firstName: '', lastName: '' },
      seizureProtocol: childData.seizureProtocol || false,
      boosterSeat: childData.boosterSeat || false,
      specialNeeds: childData.specialNeeds || '',
      notes: childData.notes || '',
      defaultAmDriverId: childData.defaultAmDriverId,
      defaultPmDriverId: childData.defaultPmDriverId,
    });
    setModalVisible(true);
  };

  const handleToggleActive = (child: Child) => {
    const action = child.active ? 'Deactivate' : 'Reactivate';
    Alert.alert(
      `${action} Child`,
      `Are you sure you want to ${action.toLowerCase()} ${child.firstName} ${child.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: child.active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (child.active) {
                await deactivateChild({ id: child._id });
              } else {
                await reactivateChild({ id: child._id });
              }
              Alert.alert('Success', `Child has been ${action.toLowerCase()}d.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} child.`);
            }
          },
        },
      ]
    );
  };

  const renderChild = ({ item }: { item: Child }) => (
    <View style={styles.childCard}>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.childDetails}>
          Grade: {item.grade} | {item.schoolName}
        </Text>
        {item.studentId && (
          <Text style={styles.childMeta}>Student ID: {item.studentId}</Text>
        )}
        {item.homeLanguage && (
          <Text style={styles.childMeta}>Language: {item.homeLanguage}</Text>
        )}
      </View>
      <View style={styles.childStatus}>
        <View style={[styles.statusIndicator, item.active ? styles.active : styles.inactive]} />
        <Text style={styles.statusText}>{item.active ? 'Active' : 'Inactive'}</Text>
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
        <Text style={styles.title}>Children Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
          <Text style={styles.addButtonText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search children, school, or grade..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {children === undefined ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={filteredChildren}
          renderItem={renderChild}
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
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add New Child' : 'Edit Child'}</Text>

              {/* Required Fields */}
              <Text style={styles.sectionLabel}>Required Information</Text>
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                placeholderTextColor="#999"
                value={newChild.firstName}
                onChangeText={(text) => setNewChild({ ...newChild, firstName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name *"
                placeholderTextColor="#999"
                value={newChild.lastName}
                onChangeText={(text) => setNewChild({ ...newChild, lastName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Middle Name"
                placeholderTextColor="#999"
                value={newChild.middleName}
                onChangeText={(text) => setNewChild({ ...newChild, middleName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Preferred Name"
                placeholderTextColor="#999"
                value={newChild.preferredName}
                onChangeText={(text) => setNewChild({ ...newChild, preferredName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Grade (e.g., K, 1st, 2nd) *"
                placeholderTextColor="#999"
                value={newChild.grade}
                onChangeText={(text) => setNewChild({ ...newChild, grade: text })}
              />

              {/* School Picker */}
              <Text style={styles.fieldLabel}>School *</Text>
              <Picker
                selectedValue={newChild.schoolId}
                onValueChange={(value) => setNewChild({ ...newChild, schoolId: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select School..." value="" />
                {schools?.map((school) => (
                  <Picker.Item
                    key={school._id}
                    label={school.schoolName}
                    value={school._id}
                  />
                ))}
              </Picker>
              <TextInput
                style={styles.input}
                placeholder="School Name (fallback if not in list) *"
                placeholderTextColor="#999"
                value={newChild.schoolName}
                onChangeText={(text) => setNewChild({ ...newChild, schoolName: text })}
              />

              {/* Optional Fields */}
              <Text style={styles.sectionLabel}>Optional Information</Text>
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (YYYY-MM-DD)"
                placeholderTextColor="#999"
                value={newChild.dateOfBirth}
                onChangeText={(text) => setNewChild({ ...newChild, dateOfBirth: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Home Language (e.g., Spanish, Portuguese)"
                placeholderTextColor="#999"
                value={newChild.homeLanguage}
                onChangeText={(text) => setNewChild({ ...newChild, homeLanguage: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Ride Type (SOLO or SHARED)"
                placeholderTextColor="#999"
                value={newChild.rideType}
                onChangeText={(text) => setNewChild({ ...newChild, rideType: text })}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                placeholder="Student ID (auto-generated if blank)"
                placeholderTextColor="#999"
                value={newChild.studentId}
                onChangeText={(text) => setNewChild({ ...newChild, studentId: text })}
              />

              {/* Parent/Guardian 1 */}
              <Text style={styles.sectionLabel}>Parent/Guardian 1</Text>
              <TextInput
                style={styles.input}
                placeholder="Parent 1 First Name"
                placeholderTextColor="#999"
                value={newChild.parent1.firstName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent1: { ...newChild.parent1, firstName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Parent 1 Last Name"
                placeholderTextColor="#999"
                value={newChild.parent1.lastName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent1: { ...newChild.parent1, lastName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Parent 1 Phone"
                placeholderTextColor="#999"
                value={newChild.parent1.phone}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent1: { ...newChild.parent1, phone: text }
                })}
                keyboardType="phone-pad"
              />

              {/* Parent/Guardian 2 */}
              <Text style={styles.sectionLabel}>Parent/Guardian 2 (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Parent 2 First Name"
                placeholderTextColor="#999"
                value={newChild.parent2.firstName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent2: { ...newChild.parent2, firstName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Parent 2 Last Name"
                placeholderTextColor="#999"
                value={newChild.parent2.lastName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent2: { ...newChild.parent2, lastName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Parent 2 Phone"
                placeholderTextColor="#999"
                value={newChild.parent2.phone}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  parent2: { ...newChild.parent2, phone: text }
                })}
                keyboardType="phone-pad"
              />

              {/* School Staff */}
              <Text style={styles.sectionLabel}>Teacher</Text>
              <TextInput
                style={styles.input}
                placeholder="Teacher First Name"
                placeholderTextColor="#999"
                value={newChild.teacher.firstName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  teacher: { ...newChild.teacher, firstName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Teacher Last Name"
                placeholderTextColor="#999"
                value={newChild.teacher.lastName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  teacher: { ...newChild.teacher, lastName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Teacher Phone"
                placeholderTextColor="#999"
                value={newChild.teacher.phone}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  teacher: { ...newChild.teacher, phone: text }
                })}
                keyboardType="phone-pad"
              />

              <Text style={styles.sectionLabel}>Case Manager</Text>
              <TextInput
                style={styles.input}
                placeholder="Case Manager First Name"
                placeholderTextColor="#999"
                value={newChild.caseManager.firstName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  caseManager: { ...newChild.caseManager, firstName: text }
                })}
              />
              <TextInput
                style={styles.input}
                placeholder="Case Manager Last Name"
                placeholderTextColor="#999"
                value={newChild.caseManager.lastName}
                onChangeText={(text) => setNewChild({
                  ...newChild,
                  caseManager: { ...newChild.caseManager, lastName: text }
                })}
              />

              {/* Medical & Safety */}
              <Text style={styles.sectionLabel}>Medical & Safety</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Seizure Protocol:</Text>
                <Switch
                  value={newChild.seizureProtocol}
                  onValueChange={(value) => setNewChild({ ...newChild, seizureProtocol: value })}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Booster Seat Required:</Text>
                <Switch
                  value={newChild.boosterSeat}
                  onValueChange={(value) => setNewChild({ ...newChild, boosterSeat: value })}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Special Needs (comma-separated)"
                placeholderTextColor="#999"
                value={newChild.specialNeeds}
                onChangeText={(text) => setNewChild({ ...newChild, specialNeeds: text })}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="General Notes"
                placeholderTextColor="#999"
                value={newChild.notes}
                onChangeText={(text) => setNewChild({ ...newChild, notes: text })}
                multiline
                numberOfLines={3}
              />

              {/* Steady Driver Pairings */}
              <Text style={styles.sectionLabel}>Steady Driver Pairings</Text>
              <Text style={styles.fieldLabel}>Default AM Driver</Text>
              <Picker
                selectedValue={newChild.defaultAmDriverId}
                onValueChange={(value) => setNewChild({ ...newChild, defaultAmDriverId: value })}
                style={styles.picker}
              >
                <Picker.Item label="None (assign manually)" value={undefined} />
                {drivers?.map((driver) => (
                  <Picker.Item
                    key={driver._id}
                    label={`${driver.firstName} ${driver.lastName}`}
                    value={driver._id}
                  />
                ))}
              </Picker>

              <Text style={styles.fieldLabel}>Default PM Driver</Text>
              <Picker
                selectedValue={newChild.defaultPmDriverId}
                onValueChange={(value) => setNewChild({ ...newChild, defaultPmDriverId: value })}
                style={styles.picker}
              >
                <Picker.Item label="None (assign manually)" value={undefined} />
                {drivers?.map((driver) => (
                  <Picker.Item
                    key={driver._id}
                    label={`${driver.firstName} ${driver.lastName}`}
                    value={driver._id}
                  />
                ))}
              </Picker>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit} disabled={isAdding}>
                  {isAdding ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.submitButtonText]}>
                      {modalMode === 'add' ? 'Add Child' : 'Update Child'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  childCard: {
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
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  childDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  childMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  childStatus: {
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
    backgroundColor: '#E8F5E9', // A light green to indicate a positive action
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
