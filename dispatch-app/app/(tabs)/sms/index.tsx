import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

/**
 * SMS Dashboard - Main screen for SMS Switchboard
 * Shows stats, quick actions, and recent messages
 */
export default function SMSDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fetch data from Convex
  const stats = useQuery(api.smsMessages.getStats);
  const recentMessages = useQuery(api.smsMessages.list, { limit: 5 });
  const recipientCounts = useQuery(api.smsRecipients.getCounts);

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subtextColor = isDark ? '#888888' : '#666666';

  if (!stats || !recipientCounts) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={[styles.loadingText, { color: subtextColor }]}>Loading SMS Dashboard...</Text>
      </View>
    );
  }

  const quickActions = [
    { title: 'Send SMS', icon: 'paper-plane', route: '/sms/send', color: '#007AFF' },
    { title: 'Messages', icon: 'envelope', route: '/sms/messages', color: '#34C759' },
    { title: 'Recipients', icon: 'users', route: '/sms/recipients', color: '#FF9500' },
    { title: 'Templates', icon: 'file-text', route: '/sms/templates', color: '#AF52DE' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.route}
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={() => router.push(action.route)}
            >
              {({ pressed, hovered }) => (
                <View style={[styles.actionContent, (pressed || hovered) && styles.actionPressed]}>
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                    <FontAwesome name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.actionTitle, { color: textColor }]}>{action.title}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recent Messages */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Messages</Text>
          <Pressable onPress={() => router.push('/sms/messages')}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>
        {recentMessages && recentMessages.length > 0 ? (
          recentMessages.map((message) => (
            <View key={message._id} style={[styles.messageRow, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
              <View style={styles.messageInfo}>
                <Text style={[styles.messageName, { color: textColor }]}>{message.recipientName}</Text>
                <Text style={[styles.messageContent, { color: subtextColor }]} numberOfLines={1}>
                  {message.messageContent}
                </Text>
              </View>
              <View style={styles.messageStatus}>
                <StatusBadge status={message.status} />
                <Text style={[styles.messageTime, { color: subtextColor }]}>
                  {message.sentAt ? new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: subtextColor }]}>No messages sent yet</Text>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <FontAwesome name="send" size={24} color="#007AFF" />
          <Text style={[styles.statValue, { color: textColor }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: subtextColor }]}>Total Sent</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <FontAwesome name="check-circle" size={24} color="#34C759" />
          <Text style={[styles.statValue, { color: textColor }]}>{stats.delivered}</Text>
          <Text style={[styles.statLabel, { color: subtextColor }]}>Delivered</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <FontAwesome name="exclamation-circle" size={24} color="#FF3B30" />
          <Text style={[styles.statValue, { color: textColor }]}>{stats.failed}</Text>
          <Text style={[styles.statLabel, { color: subtextColor }]}>Failed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <FontAwesome name="dollar" size={24} color="#FF9500" />
          <Text style={[styles.statValue, { color: textColor }]}>{stats.totalCredits}</Text>
          <Text style={[styles.statLabel, { color: subtextColor }]}>Credits Used</Text>
        </View>
      </View>

      {/* Recipients Summary */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Recipients</Text>
        <View style={styles.recipientStats}>
          <View style={styles.recipientStat}>
            <Text style={[styles.recipientValue, { color: textColor }]}>{recipientCounts.byType.parent}</Text>
            <Text style={[styles.recipientLabel, { color: subtextColor }]}>Parents</Text>
          </View>
          <View style={styles.recipientStat}>
            <Text style={[styles.recipientValue, { color: textColor }]}>{recipientCounts.byType.driver}</Text>
            <Text style={[styles.recipientLabel, { color: subtextColor }]}>Drivers</Text>
          </View>
          <View style={styles.recipientStat}>
            <Text style={[styles.recipientValue, { color: textColor }]}>{recipientCounts.active}</Text>
            <Text style={[styles.recipientLabel, { color: subtextColor }]}>Total Active</Text>
          </View>
        </View>
      </View>

      {/* Spacer for bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    sent: { bg: '#007AFF20', text: '#007AFF' },
    delivered: { bg: '#34C75920', text: '#34C759' },
    failed: { bg: '#FF3B3020', text: '#FF3B30' },
    queued: { bg: '#FF950020', text: '#FF9500' },
    draft: { bg: '#8E8E9320', text: '#8E8E93' },
  };
  const colors = statusColors[status] || statusColors.draft;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 150 : '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  seeAll: {
    color: '#007AFF',
    fontSize: 14,
  },
  recipientStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recipientStat: {
    alignItems: 'center',
  },
  recipientValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recipientLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 120 : '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionContent: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  messageInfo: {
    flex: 1,
    marginRight: 12,
  },
  messageName: {
    fontSize: 15,
    fontWeight: '500',
  },
  messageContent: {
    fontSize: 13,
    marginTop: 2,
  },
  messageStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
});
