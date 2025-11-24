import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';

type CategoryFilter = 'all' | 'pickup' | 'dropoff' | 'delay' | 'emergency' | 'schedule' | 'general';

export default function TemplatesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const templates = useQuery(api.smsTemplates.list, {
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  });
  const deactivate = useMutation(api.smsTemplates.deactivate);
  const reactivate = useMutation(api.smsTemplates.reactivate);
  const duplicate = useMutation(api.smsTemplates.duplicate);

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subtextColor = isDark ? '#888888' : '#666666';
  const modalBg = isDark ? '#333' : '#ffffff';

  const categoryColors: Record<string, string> = {
    pickup: '#34C759', dropoff: '#007AFF', delay: '#FF9500',
    emergency: '#FF3B30', schedule: '#AF52DE', general: '#8E8E93', custom: '#5856D6',
  };

  const filterOptions: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'dropoff', label: 'Dropoff' },
    { key: 'delay', label: 'Delay' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'schedule', label: 'Schedule' },
  ];

  const handleToggleActive = async (template: any) => {
    try {
      if (template.isActive) {
        await deactivate({ id: template._id });
        Alert.alert('Success', 'Template deactivated');
      } else {
        await reactivate({ id: template._id });
        Alert.alert('Success', 'Template reactivated');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDuplicate = async (template: any) => {
    try {
      await duplicate({ id: template._id, newName: `${template.name} (Copy)` });
      Alert.alert('Success', 'Template duplicated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderTemplate = ({ item }: { item: any }) => {
    const catColor = categoryColors[item.category] || '#8E8E93';
    return (
      <Pressable 
        style={[styles.templateCard, { backgroundColor: cardBg, opacity: item.isActive ? 1 : 0.6 }]}
        onPress={() => { setSelectedTemplate(item); setShowModal(true); }}
      >
        <View style={styles.templateHeader}>
          <View style={styles.templateInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>{item.category}</Text>
            </View>
            <View style={[styles.langBadge, { backgroundColor: isDark ? '#444' : '#f0f0f0' }]}>
              <Text style={[styles.langText, { color: subtextColor }]}>{item.language}</Text>
            </View>
          </View>
          {!item.isActive && (
            <Text style={styles.inactiveBadge}>INACTIVE</Text>
          )}
        </View>
        <Text style={[styles.templateName, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.templatePreview, { color: subtextColor }]} numberOfLines={2}>
          {item.messageText}
        </Text>
        <View style={styles.templateFooter}>
          <Text style={[styles.usageText, { color: subtextColor }]}>
            Used {item.usageCount || 0} times
          </Text>
          <Text style={[styles.targetText, { color: subtextColor }]}>
            For: {item.targetRecipientType}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {filterOptions.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.filterTab, categoryFilter === opt.key && styles.filterTabActive]}
            onPress={() => setCategoryFilter(opt.key)}
          >
            <Text style={[styles.filterText, { color: categoryFilter === opt.key ? '#007AFF' : subtextColor }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={templates || []}
        renderItem={renderTemplate}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="file-text-o" size={48} color={subtextColor} />
            <Text style={[styles.emptyText, { color: subtextColor }]}>No templates found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{selectedTemplate?.name}</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <FontAwesome name="times" size={24} color={subtextColor} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: subtextColor }]}>Category</Text>
                <Text style={[styles.modalValue, { color: textColor }]}>{selectedTemplate?.category}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: subtextColor }]}>Language</Text>
                <Text style={[styles.modalValue, { color: textColor }]}>{selectedTemplate?.language}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: subtextColor }]}>Target</Text>
                <Text style={[styles.modalValue, { color: textColor }]}>{selectedTemplate?.targetRecipientType}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: subtextColor }]}>Message</Text>
                <Text style={[styles.modalMessageText, { color: textColor }]}>{selectedTemplate?.messageText}</Text>
              </View>
              {selectedTemplate?.variables?.length > 0 && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: subtextColor }]}>Variables</Text>
                  {selectedTemplate.variables.map((v: any, i: number) => (
                    <Text key={i} style={[styles.variableText, { color: textColor }]}>
                      • {`{{${v.key}}}`} - {v.label} {v.required && '(required)'}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={[styles.actionButton, { borderColor: subtextColor }]} onPress={() => handleToggleActive(selectedTemplate)}>
                <FontAwesome name={selectedTemplate?.isActive ? 'eye-slash' : 'eye'} size={16} color={subtextColor} />
                <Text style={[styles.actionText, { color: subtextColor }]}>
                  {selectedTemplate?.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </Pressable>
              <Pressable style={[styles.actionButton, { borderColor: '#007AFF' }]} onPress={() => handleDuplicate(selectedTemplate)}>
                <FontAwesome name="copy" size={16} color="#007AFF" />
                <Text style={[styles.actionText, { color: '#007AFF' }]}>Duplicate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { maxHeight: 50 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  filterTabActive: { backgroundColor: '#007AFF20' },
  filterText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16 },
  templateCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  templateInfo: { flexDirection: 'row', gap: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  langBadge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  langText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  inactiveBadge: { fontSize: 10, fontWeight: '600', color: '#FF3B30' },
  templateName: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  templatePreview: { fontSize: 14, lineHeight: 20 },
  templateFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  usageText: { fontSize: 12 },
  targetText: { fontSize: 12, textTransform: 'capitalize' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { marginBottom: 20 },
  modalRow: { marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  modalValue: { fontSize: 16 },
  modalMessageText: { fontSize: 15, lineHeight: 22 },
  variableText: { fontSize: 14, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600' },
});
