import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Alert } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';

type RecipientFilter = 'all' | 'parent' | 'driver' | 'teacher' | 'custom';

export default function RecipientsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [typeFilter, setTypeFilter] = useState<RecipientFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const recipients = useQuery(api.smsRecipients.list, {
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: 'active',
  });
  const counts = useQuery(api.smsRecipients.getCounts);
  const syncParents = useMutation(api.smsRecipients.syncFromParents);
  const syncDrivers = useMutation(api.smsRecipients.syncFromDrivers);

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subtextColor = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#333' : '#f9f9f9';
  const borderColor = isDark ? '#444' : '#ddd';

  const filteredRecipients = useMemo(() => {
    if (!recipients) return [];
    if (!searchQuery) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter(
      (r) => r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.childName?.toLowerCase().includes(q)
    );
  }, [recipients, searchQuery]);

  const filterOptions: { key: RecipientFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: counts?.total },
    { key: 'parent', label: 'Parents', count: counts?.byType.parent },
    { key: 'driver', label: 'Drivers', count: counts?.byType.driver },
  ];

  const handleSync = async (type: 'parents' | 'drivers') => {
    try {
      const result = type === 'parents' ? await syncParents() : await syncDrivers();
      Alert.alert('Sync Complete', `Synced ${result.synced} ${type}, skipped ${result.skipped}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = { parent: 'user', driver: 'id-badge', teacher: 'graduation-cap', custom: 'address-card' };
    return icons[type] || 'user';
  };

  const renderRecipient = ({ item }: { item: any }) => (
    <View style={[styles.recipientCard, { backgroundColor: cardBg }]}>
      <View style={styles.recipientHeader}>
        <View style={styles.recipientInfo}>
          <View style={[styles.typeIconContainer, { backgroundColor: isDark ? '#444' : '#f0f0f0' }]}>
            <FontAwesome name={getTypeIcon(item.recipientType) as any} size={16} color={subtextColor} />
          </View>
          <View>
            <Text style={[styles.recipientName, { color: textColor }]}>{item.name}</Text>
            <Text style={[styles.recipientPhone, { color: subtextColor }]}>{item.phone}</Text>
          </View>
        </View>
        <View style={styles.recipientMeta}>
          <Text style={[styles.langBadge, { backgroundColor: isDark ? '#444' : '#f0f0f0', color: subtextColor }]}>
            {item.preferredLanguage?.toUpperCase() || 'EN'}
          </Text>
        </View>
      </View>
      {item.childName && (
        <Text style={[styles.childInfo, { color: subtextColor }]}>
          <FontAwesome name="child" size={12} color={subtextColor} /> {item.childName}
        </Text>
      )}
      {item.messageCount > 0 && (
        <Text style={[styles.messageCount, { color: subtextColor }]}>
          {item.messageCount} messages sent
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: cardBg }]}>
        <FontAwesome name="search" size={16} color={subtextColor} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search recipients..."
          placeholderTextColor={subtextColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filterOptions.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.filterTab, typeFilter === opt.key && styles.filterTabActive]}
            onPress={() => setTypeFilter(opt.key)}
          >
            <Text style={[styles.filterText, { color: typeFilter === opt.key ? '#007AFF' : subtextColor }]}>
              {opt.label} {opt.count !== undefined && `(${opt.count})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sync Buttons */}
      <View style={styles.syncRow}>
        <Pressable style={[styles.syncButton, { borderColor }]} onPress={() => handleSync('parents')}>
          <FontAwesome name="refresh" size={14} color="#007AFF" />
          <Text style={styles.syncText}>Sync Parents</Text>
        </Pressable>
        <Pressable style={[styles.syncButton, { borderColor }]} onPress={() => handleSync('drivers')}>
          <FontAwesome name="refresh" size={14} color="#007AFF" />
          <Text style={styles.syncText}>Sync Drivers</Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={filteredRecipients}
        renderItem={renderRecipient}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="users" size={48} color={subtextColor} />
            <Text style={[styles.emptyText, { color: subtextColor }]}>No recipients found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, padding: 12, borderRadius: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  filterTabActive: { backgroundColor: '#007AFF20' },
  filterText: { fontSize: 13, fontWeight: '500' },
  syncRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  syncButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  syncText: { color: '#007AFF', fontSize: 13, fontWeight: '500' },
  listContent: { padding: 16, paddingTop: 8 },
  recipientCard: { padding: 16, borderRadius: 12, marginBottom: 10 },
  recipientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  recipientName: { fontSize: 16, fontWeight: '600' },
  recipientPhone: { fontSize: 13, marginTop: 2 },
  recipientMeta: { alignItems: 'flex-end' },
  langBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  childInfo: { fontSize: 13, marginTop: 8 },
  messageCount: { fontSize: 12, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 16 },
});
