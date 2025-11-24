import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';

type StatusFilter = 'all' | 'sent' | 'delivered' | 'failed' | 'queued';

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const messages = useQuery(api.smsMessages.list, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100,
  });

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subtextColor = isDark ? '#888888' : '#666666';

  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'failed', label: 'Failed' },
    { key: 'queued', label: 'Queued' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, { name: string; color: string }> = {
      delivered: { name: 'check-circle', color: '#34C759' },
      sent: { name: 'paper-plane', color: '#007AFF' },
      failed: { name: 'times-circle', color: '#FF3B30' },
      queued: { name: 'clock-o', color: '#FF9500' },
    };
    return icons[status] || { name: 'circle-o', color: '#8E8E93' };
  };

  const renderMessage = ({ item }: { item: any }) => {
    const statusIcon = getStatusIcon(item.status);
    return (
      <View style={[styles.messageCard, { backgroundColor: cardBg }]}>
        <View style={styles.messageHeader}>
          <View style={styles.recipientInfo}>
            <FontAwesome 
              name={item.recipientType === 'parent' ? 'user' : 'id-badge'} 
              size={14} 
              color={subtextColor} 
              style={styles.typeIcon} 
            />
            <Text style={[styles.recipientName, { color: textColor }]}>{item.recipientName}</Text>
          </View>
          <View style={styles.statusContainer}>
            <FontAwesome name={statusIcon.name as any} size={14} color={statusIcon.color} />
            <Text style={[styles.statusText, { color: statusIcon.color }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.phone, { color: subtextColor }]}>{item.recipientPhone}</Text>
        <Text style={[styles.messageContent, { color: textColor }]} numberOfLines={2}>
          {item.messageContent}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, { color: subtextColor }]}>
            {formatDate(item.sentAt || item._creationTime)}
          </Text>
          <Text style={[styles.segments, { color: subtextColor }]}>
            {item.segmentCount || 1} seg
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.filterContainer, { backgroundColor: cardBg }]}>
        {filterOptions.map((option) => (
          <Pressable 
            key={option.key} 
            style={[styles.filterTab, statusFilter === option.key && styles.filterTabActive]} 
            onPress={() => setStatusFilter(option.key)}
          >
            <Text style={[styles.filterText, { color: statusFilter === option.key ? '#007AFF' : subtextColor }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={messages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="envelope-o" size={48} color={subtextColor} />
            <Text style={[styles.emptyText, { color: subtextColor }]}>
              No messages {statusFilter !== 'all' ? `(${statusFilter})` : 'yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  filterTabActive: { backgroundColor: '#007AFF20' },
  filterText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16, gap: 12 },
  messageCard: { padding: 16, borderRadius: 12, marginBottom: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recipientInfo: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { marginRight: 6 },
  recipientName: { fontSize: 16, fontWeight: '600' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  phone: { fontSize: 13, marginBottom: 8 },
  messageContent: { fontSize: 14, lineHeight: 20 },
  messageFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timestamp: { fontSize: 12 },
  segments: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 16 },
});
