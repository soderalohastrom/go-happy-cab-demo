import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  useAllDistricts,
  useAllSchools,
  useAddDistrict,
  useAddSchool,
  useUpdateDistrict,
  useUpdateSchool,
} from '../hooks/useConvexRoutes';
import { Id } from '../convex/_generated/dataModel';
import { SchoolCalendarModal } from './SchoolCalendarModal';

type District = {
  _id: Id<"districts">;
  districtName: string;
  clientName: string;
  rate: number;
};

type School = {
  _id: Id<"schools">;
  districtId: Id<"districts">;
  districtName: string;
  schoolName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  officePhone: string;
  firstDay: string;
  lastDay: string;
};

export default function SchoolsContent() {
  const districts = useAllDistricts();
  const schools = useAllSchools();
  const addDistrict = useAddDistrict();
  const addSchool = useAddSchool();
  const updateDistrict = useUpdateDistrict();
  const updateSchool = useUpdateSchool();

  // Segmented control state
  const [activeTab, setActiveTab] = useState<'districts' | 'schools'>('schools');

  // District modal state
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [districtModalMode, setDistrictModalMode] = useState<'add' | 'edit'>('add');
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [newDistrict, setNewDistrict] = useState({
    districtName: '',
    clientName: '',
    rate: '',
  });
  const [isAddingDistrict, setIsAddingDistrict] = useState(false);

  // School modal state
  const [schoolModalVisible, setSchoolModalVisible] = useState(false);
  const [schoolModalMode, setSchoolModalMode] = useState<'add' | 'edit'>('add');
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({
    districtName: '',
    schoolName: '',
    streetAddress: '',
    city: '',
    state: 'CA',
    zip: '',
    officePhone: '',
    firstDay: '',
    lastDay: '',
  });
  const [isAddingSchool, setIsAddingSchool] = useState(false);

  // Calendar modal state
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarSchoolId, setCalendarSchoolId] = useState<Id<'schools'> | null>(null);
  const [calendarSchoolName, setCalendarSchoolName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Filter districts
  const filteredDistricts = districts?.filter(district => {
    const query = searchQuery.toLowerCase();
    return (
      district.districtName.toLowerCase().includes(query) ||
      district.clientName.toLowerCase().includes(query)
    );
  }) || [];

  // Filter schools
  const filteredSchools = schools?.filter(school => {
    const query = searchQuery.toLowerCase();
    return (
      school.schoolName.toLowerCase().includes(query) ||
      school.districtName.toLowerCase().includes(query) ||
      school.city.toLowerCase().includes(query)
    );
  }) || [];

  const handleOpenCalendarModal = (school: School) => {
    setCalendarSchoolId(school._id);
    setCalendarSchoolName(school.schoolName);
    setCalendarModalVisible(true);
  };

  // Handle submit district (add or edit)
  const handleSubmitDistrict = async () => {
    if (!newDistrict.districtName || !newDistrict.clientName || !newDistrict.rate) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const rate = parseFloat(newDistrict.rate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid rate.');
      return;
    }

    setIsAddingDistrict(true);
    try {
      if (districtModalMode === 'edit' && editingDistrict) {
        await updateDistrict({
          id: editingDistrict._id,
          districtName: newDistrict.districtName,
          clientName: newDistrict.clientName,
          rate,
        });
        Alert.alert('Success', 'District updated successfully!');
      } else {
        await addDistrict({
          districts: [{
            districtName: newDistrict.districtName,
            clientName: newDistrict.clientName,
            rate,
          }],
        });
        Alert.alert('Success', 'District added successfully!');
      }
      setDistrictModalVisible(false);
      setNewDistrict({ districtName: '', clientName: '', rate: '' });
      setEditingDistrict(null);
      setDistrictModalMode('add');
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${districtModalMode} district.`);
    } finally {
      setIsAddingDistrict(false);
    }
  };

  const handleOpenAddDistrictModal = () => {
    setDistrictModalMode('add');
    setEditingDistrict(null);
    setNewDistrict({ districtName: '', clientName: '', rate: '' });
    setDistrictModalVisible(true);
  };

  const handleOpenEditDistrictModal = (district: District) => {
    setDistrictModalMode('edit');
    setEditingDistrict(district);
    setNewDistrict({
      districtName: district.districtName,
      clientName: district.clientName,
      rate: district.rate.toString(),
    });
    setDistrictModalVisible(true);
  };

  // Handle submit school (add or edit)
  const handleSubmitSchool = async () => {
    if (
      !newSchool.districtName ||
      !newSchool.schoolName ||
      !newSchool.streetAddress ||
      !newSchool.city ||
      !newSchool.state ||
      !newSchool.zip ||
      !newSchool.officePhone ||
      !newSchool.firstDay ||
      !newSchool.lastDay
    ) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsAddingSchool(true);
    try {
      if (schoolModalMode === 'edit' && editingSchool) {
        // Find district by name
        const district = districts?.find(d => d.districtName === newSchool.districtName);
        if (!district) {
          Alert.alert('Error', 'Selected district not found.');
          return;
        }
        await updateSchool({
          id: editingSchool._id,
          districtId: district._id,
          schoolName: newSchool.schoolName,
          streetAddress: newSchool.streetAddress,
          city: newSchool.city,
          state: newSchool.state,
          zip: newSchool.zip,
          officePhone: newSchool.officePhone,
          firstDay: newSchool.firstDay,
          lastDay: newSchool.lastDay,
        });
        Alert.alert('Success', 'School updated successfully!');
      } else {
        await addSchool({
          schools: [newSchool],
        });
        Alert.alert('Success', 'School added successfully!');
      }
      setSchoolModalVisible(false);
      setNewSchool({
        districtName: '',
        schoolName: '',
        streetAddress: '',
        city: '',
        state: 'CA',
        zip: '',
        officePhone: '',
        firstDay: '',
        lastDay: '',
      });
      setEditingSchool(null);
      setSchoolModalMode('add');
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${schoolModalMode} school.`);
    } finally {
      setIsAddingSchool(false);
    }
  };

  const handleOpenAddSchoolModal = () => {
    setSchoolModalMode('add');
    setEditingSchool(null);
    setNewSchool({
      districtName: '',
      schoolName: '',
      streetAddress: '',
      city: '',
      state: 'CA',
      zip: '',
      officePhone: '',
      firstDay: '',
      lastDay: '',
    });
    setSchoolModalVisible(true);
  };

  const handleOpenEditSchoolModal = (school: School) => {
    setSchoolModalMode('edit');
    setEditingSchool(school);
    setNewSchool({
      districtName: school.districtName,
      schoolName: school.schoolName,
      streetAddress: school.streetAddress,
      city: school.city,
      state: school.state,
      zip: school.zip,
      officePhone: school.officePhone,
      firstDay: school.firstDay,
      lastDay: school.lastDay,
    });
    setSchoolModalVisible(true);
  };

  // Render district card
  const renderDistrict = ({ item }: { item: District }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.districtName}</Text>
          <Text style={styles.rateText}>${item.rate.toFixed(2)}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{item.clientName}</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleOpenEditDistrictModal(item)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );

  // Render school card
  const renderSchool = ({ item }: { item: School }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.schoolName}</Text>
          <Text style={styles.districtBadge}>{item.districtName}</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          {item.streetAddress}, {item.city}, {item.state} {item.zip}
        </Text>
        <Text style={styles.phoneText}>{item.officePhone}</Text>
        <Text style={styles.datesText}>
          {item.firstDay} to {item.lastDay}
        </Text>
      </View>
      <View style={styles.cardButtons}>
        {/* Calendar button only on web - dispatch admin feature */}
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => handleOpenCalendarModal(item)}
          >
            <Text style={styles.calendarButtonText}>📅</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleOpenEditSchoolModal(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (districts === undefined || schools === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading schools data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'schools' && styles.activeSegment]}
          onPress={() => setActiveTab('schools')}
        >
          <Text style={[styles.segmentText, activeTab === 'schools' && styles.activeSegmentText]}>
            Schools ({filteredSchools.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'districts' && styles.activeSegment]}
          onPress={() => setActiveTab('districts')}
        >
          <Text style={[styles.segmentText, activeTab === 'districts' && styles.activeSegmentText]}>
            Districts ({filteredDistricts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'schools' ? "🔍 Search schools by name, district, or city..." : "🔍 Search districts by name or client..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Districts View */}
      {activeTab === 'districts' && (
        <>
          <FlatList
            data={filteredDistricts}
            keyExtractor={(item) => item._id}
            renderItem={renderDistrict}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No districts found. Add one to get started!</Text>
            }
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAddDistrictModal}
          >
            <Text style={styles.addButtonText}>+ Add District</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Schools View */}
      {activeTab === 'schools' && (
        <>
          <FlatList
            data={filteredSchools}
            keyExtractor={(item) => item._id}
            renderItem={renderSchool}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No schools found. Add one to get started!</Text>
            }
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAddSchoolModal}
          >
            <Text style={styles.addButtonText}>+ Add School</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Add District Modal */}
      <Modal
        visible={districtModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{districtModalMode === 'add' ? 'Add District' : 'Edit District'}</Text>

            <TextInput
              style={styles.input}
              placeholder="District Name *"
              value={newDistrict.districtName}
              onChangeText={(text) => setNewDistrict({ ...newDistrict, districtName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Client Name *"
              value={newDistrict.clientName}
              onChangeText={(text) => setNewDistrict({ ...newDistrict, clientName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Rate ($/trip) *"
              value={newDistrict.rate}
              onChangeText={(text) => setNewDistrict({ ...newDistrict, rate: text })}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDistrictModalVisible(false)}
                disabled={isAddingDistrict}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitDistrict}
                disabled={isAddingDistrict}
              >
                {isAddingDistrict ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{districtModalMode === 'add' ? 'Add' : 'Update'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* School Calendar Modal */}
      <SchoolCalendarModal
        visible={calendarModalVisible}
        schoolId={calendarSchoolId}
        schoolName={calendarSchoolName}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* Add School Modal */}
      <Modal
        visible={schoolModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSchoolModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{schoolModalMode === 'add' ? 'Add School' : 'Edit School'}</Text>

            <ScrollView style={styles.scrollableForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>DISTRICT</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSchool.districtName}
                  onValueChange={(value) => setNewSchool({ ...newSchool, districtName: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select District *" value="" />
                  {districts.map((district) => (
                    <Picker.Item
                      key={district._id}
                      label={district.districtName}
                      value={district.districtName}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.sectionLabel}>SCHOOL INFO</Text>
              <TextInput
                style={styles.input}
                placeholder="School Name *"
                value={newSchool.schoolName}
                onChangeText={(text) => setNewSchool({ ...newSchool, schoolName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Street Address *"
                value={newSchool.streetAddress}
                onChangeText={(text) => setNewSchool({ ...newSchool, streetAddress: text })}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="City *"
                  value={newSchool.city}
                  onChangeText={(text) => setNewSchool({ ...newSchool, city: text })}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="State *"
                  value={newSchool.state}
                  onChangeText={(text) => setNewSchool({ ...newSchool, state: text })}
                  maxLength={2}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Zip Code *"
                  value={newSchool.zip}
                  onChangeText={(text) => setNewSchool({ ...newSchool, zip: text })}
                  keyboardType="number-pad"
                  maxLength={5}
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Office Phone *"
                  value={newSchool.officePhone}
                  onChangeText={(text) => setNewSchool({ ...newSchool, officePhone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.sectionLabel}>SCHOOL YEAR</Text>
              <TextInput
                style={styles.input}
                placeholder="First Day (YYYY-MM-DD) *"
                value={newSchool.firstDay}
                onChangeText={(text) => setNewSchool({ ...newSchool, firstDay: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Day (YYYY-MM-DD) *"
                value={newSchool.lastDay}
                onChangeText={(text) => setNewSchool({ ...newSchool, lastDay: text })}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSchoolModalVisible(false)}
                disabled={isAddingSchool}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitSchool}
                disabled={isAddingSchool}
              >
                {isAddingSchool ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{schoolModalMode === 'add' ? 'Add' : 'Update'}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  cardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  calendarButton: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  calendarButtonText: {
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  editButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  districtBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  phoneText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  datesText: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 40,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },
  scrollableForm: {
    maxHeight: 400,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    width: '48%',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
