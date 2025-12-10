import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useCrmContacts, useCrmLabels, useCrmStats } from '../hooks/useConvexRoutes';

interface CrmContact {
  _id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  organizationName?: string;
  organizationTitle?: string;
  organizationDepartment?: string;
  email?: string;
  phone?: string;
  address?: string;
  labels: string[];
  isActive: boolean;
}

interface LabelInfo {
  label: string;
  count: number;
}

export default function CrmContactsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const contacts = useCrmContacts(selectedLabel || undefined);
  const labels = useCrmLabels();
  const stats = useCrmStats();

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchQuery) return contacts;

    const lower = searchQuery.toLowerCase();
    return contacts.filter((contact: CrmContact) => {
      const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
      const org = (contact.organizationName || '').toLowerCase();
      const title = (contact.organizationTitle || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.phone || '').replace(/\D/g, '');
      const address = (contact.address || '').toLowerCase();

      return fullName.includes(lower) ||
             org.includes(lower) ||
             title.includes(lower) ||
             email.includes(lower) ||
             address.includes(lower) ||
             phone.includes(searchQuery.replace(/\D/g, ''));
    });
  }, [contacts, searchQuery]);

  // Format display name like Google Contacts
  const getDisplayName = (contact: CrmContact): string => {
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }
    return contact.organizationName || 'Unknown';
  };

  // Format job title & company column
  const getJobCompany = (contact: CrmContact): string => {
    const parts: string[] = [];
    if (contact.organizationTitle) parts.push(contact.organizationTitle);
    if (contact.organizationName) parts.push(contact.organizationName);
    return parts.join(', ');
  };

  const renderLabelsSidebar = () => (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarTitle}>Labels</Text>

      {/* All Contacts */}
      <TouchableOpacity
        style={[styles.labelItem, !selectedLabel && styles.labelItemActive]}
        onPress={() => setSelectedLabel(null)}
      >
        <Text style={[styles.labelText, !selectedLabel && styles.labelTextActive]}>
          Contacts
        </Text>
        <Text style={[styles.labelCount, !selectedLabel && styles.labelCountActive]}>
          {stats?.total || 0}
        </Text>
      </TouchableOpacity>

      <View style={styles.labelDivider} />

      {/* Dynamic Labels */}
      <ScrollView style={styles.labelsList} showsVerticalScrollIndicator={false}>
        {labels?.map((item: LabelInfo) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.labelItem, selectedLabel === item.label && styles.labelItemActive]}
            onPress={() => setSelectedLabel(selectedLabel === item.label ? null : item.label)}
          >
            <Text
              style={[styles.labelText, selectedLabel === item.label && styles.labelTextActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Text style={[styles.labelCount, selectedLabel === item.label && styles.labelCountActive]}>
              {item.count}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
      <Text style={[styles.headerCell, styles.jobColumn]}>Job title & company</Text>
      <Text style={[styles.headerCell, styles.phoneColumn]}>Phone number</Text>
      <Text style={[styles.headerCell, styles.addressColumn]}>Address</Text>
      <Text style={[styles.headerCell, styles.labelsColumn]}>Labels</Text>
    </View>
  );

  const renderContact = ({ item }: { item: CrmContact }) => (
    <TouchableOpacity style={styles.tableRow}>
      <Text style={[styles.cell, styles.nameColumn]} numberOfLines={1}>
        {getDisplayName(item)}
      </Text>
      <Text style={[styles.cell, styles.jobColumn, styles.secondaryText]} numberOfLines={1}>
        {getJobCompany(item)}
      </Text>
      <Text style={[styles.cell, styles.phoneColumn]} numberOfLines={1}>
        {item.phone || ''}
      </Text>
      <Text style={[styles.cell, styles.addressColumn, styles.secondaryText]} numberOfLines={1}>
        {item.address?.split('\n')[0] || ''}
      </Text>
      <View style={[styles.labelsColumn, styles.labelsCell]}>
        {item.labels.slice(0, 2).map((label, idx) => (
          <View key={idx} style={styles.labelBadge}>
            <Text style={styles.labelBadgeText} numberOfLines={1}>{label}</Text>
          </View>
        ))}
        {item.labels.length > 2 && (
          <Text style={styles.moreLabels}>+{item.labels.length - 2}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!contacts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Labels Sidebar (web) */}
      {Platform.OS === 'web' && renderLabelsSidebar()}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Global CRM</Text>
            <Text style={styles.subtitle}>
              Manage all your customer relationships in one place.
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#5f6368"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mobile Labels (horizontal scroll) */}
        {Platform.OS !== 'web' && (
          <ScrollView
            horizontal
            style={styles.mobileLabelBar}
            showsHorizontalScrollIndicator={false}
          >
            <TouchableOpacity
              style={[styles.mobileLabelChip, !selectedLabel && styles.mobileLabelChipActive]}
              onPress={() => setSelectedLabel(null)}
            >
              <Text style={[styles.mobileLabelChipText, !selectedLabel && styles.mobileLabelChipTextActive]}>
                All ({stats?.total || 0})
              </Text>
            </TouchableOpacity>
            {labels?.slice(0, 10).map((item: LabelInfo) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.mobileLabelChip, selectedLabel === item.label && styles.mobileLabelChipActive]}
                onPress={() => setSelectedLabel(selectedLabel === item.label ? null : item.label)}
              >
                <Text style={[styles.mobileLabelChipText, selectedLabel === item.label && styles.mobileLabelChipTextActive]}>
                  {item.label} ({item.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Contact Count */}
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            Contacts ({filteredContacts.length})
          </Text>
        </View>

        {/* Table */}
        {Platform.OS === 'web' ? (
          <>
            {renderTableHeader()}
            <FlatList
              data={filteredContacts}
              renderItem={renderContact}
              keyExtractor={(item) => item._id}
              style={styles.tableBody}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No contacts found</Text>
                </View>
              }
            />
          </>
        ) : (
          /* Mobile card view */
          <FlatList
            data={filteredContacts}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.mobileCard}>
                <Text style={styles.mobileCardName}>{getDisplayName(item)}</Text>
                {getJobCompany(item) && (
                  <Text style={styles.mobileCardJob}>{getJobCompany(item)}</Text>
                )}
                {item.phone && (
                  <Text style={styles.mobileCardPhone}>{item.phone}</Text>
                )}
                {item.labels.length > 0 && (
                  <View style={styles.mobileCardLabels}>
                    {item.labels.slice(0, 2).map((label, idx) => (
                      <View key={idx} style={styles.labelBadge}>
                        <Text style={styles.labelBadgeText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.mobileList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No contacts found</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#5f6368',
  },

  // Sidebar (Labels)
  sidebar: {
    width: 220,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 16,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 0,
  },
  labelItemActive: {
    backgroundColor: '#e8f0fe',
  },
  labelText: {
    fontSize: 14,
    color: '#202124',
    flex: 1,
  },
  labelTextActive: {
    color: '#1967d2',
    fontWeight: '500',
  },
  labelCount: {
    fontSize: 12,
    color: '#5f6368',
    marginLeft: 8,
  },
  labelCountActive: {
    color: '#1967d2',
  },
  labelDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginHorizontal: 24,
  },
  labelsList: {
    flex: 1,
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: '#202124',
  },
  subtitle: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    paddingHorizontal: 16,
    maxWidth: 720,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#202124',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#5f6368',
  },

  // Count Bar
  countBar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countText: {
    fontSize: 14,
    color: '#5f6368',
  },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5f6368',
    textTransform: 'uppercase',
  },

  // Table Row
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  tableBody: {
    flex: 1,
  },
  cell: {
    fontSize: 14,
    color: '#202124',
  },
  secondaryText: {
    color: '#5f6368',
  },

  // Column widths (Google Contacts style)
  nameColumn: {
    width: '22%',
    minWidth: 150,
  },
  jobColumn: {
    width: '22%',
    minWidth: 150,
  },
  phoneColumn: {
    width: '15%',
    minWidth: 120,
  },
  addressColumn: {
    width: '21%',
    minWidth: 150,
  },
  labelsColumn: {
    width: '20%',
    minWidth: 140,
  },

  // Labels in table
  labelsCell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  labelBadge: {
    backgroundColor: '#e8eaed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
  labelBadgeText: {
    fontSize: 11,
    color: '#3c4043',
  },
  moreLabels: {
    fontSize: 11,
    color: '#5f6368',
    alignSelf: 'center',
  },

  // Mobile Labels Bar
  mobileLabelBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mobileLabelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    marginRight: 8,
  },
  mobileLabelChipActive: {
    backgroundColor: '#1967d2',
  },
  mobileLabelChipText: {
    fontSize: 14,
    color: '#3c4043',
  },
  mobileLabelChipTextActive: {
    color: '#fff',
  },

  // Mobile Card View
  mobileList: {
    padding: 16,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mobileCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 4,
  },
  mobileCardJob: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 4,
  },
  mobileCardPhone: {
    fontSize: 14,
    color: '#1967d2',
    marginBottom: 8,
  },
  mobileCardLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#5f6368',
  },
});
