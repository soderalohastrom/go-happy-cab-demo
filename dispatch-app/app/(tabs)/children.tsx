import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAllChildren, useAddChild, useDeactivateChild, useReactivateChild } from '../../hooks/useConvexRoutes';
import { Id } from '../../convex/_generated/dataModel';

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

export default function ChildrenScreen() {
  const children = useAllChildren();
  const addChild = useAddChild();
  const deactivateChild = useDeactivateChild();
  const reactivateChild = useReactivateChild();

  const [modalVisible, setModalVisible] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    schoolName: '',
    dateOfBirth: '',
    homeLanguage: '',
    rideType: '',
    studentId: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddChild = async () => {
    if (!newChild.firstName || !newChild.lastName || !newChild.grade || !newChild.schoolName) {
      Alert.alert('Error', 'Please fill in required fields: First Name, Last Name, Grade, and School Name.');
      return;
    }
    setIsAdding(true);
    try {
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
      setModalVisible(false);
      setNewChild({
        firstName: '',
        lastName: '',
        grade: '',
        schoolName: '',
        dateOfBirth: '',
        homeLanguage: '',
        rideType: '',
        studentId: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add child.');
    } finally {
      setIsAdding(false);
    }
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
      <TouchableOpacity
        style={[styles.actionButton, !item.active && styles.reactivateButton]}
        onPress={() => handleToggleActive(item)}
      >
        <Text style={styles.actionButtonText}>{item.active ? 'Deactivate' : 'Reactivate'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Children Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      {children === undefined ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={children}
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
              <Text style={styles.modalTitle}>Add New Child</Text>

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
                placeholder="Grade (e.g., K, 1st, 2nd) *"
                placeholderTextColor="#999"
                value={newChild.grade}
                onChangeText={(text) => setNewChild({ ...newChild, grade: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="School Name *"
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

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleAddChild} disabled={isAdding}>
                  {isAdding ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.submitButtonText]}>Add Child</Text>
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
