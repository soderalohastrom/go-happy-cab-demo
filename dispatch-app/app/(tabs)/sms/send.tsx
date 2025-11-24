import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type RecipientType = 'parent' | 'driver' | 'custom';

/**
 * Send SMS Screen
 * Form to compose and send SMS messages with template support
 */
export default function SendSMS() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form state
  const [recipientType, setRecipientType] = useState<RecipientType>('parent');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch data
  const recipients = useQuery(api.smsRecipients.list, { type: recipientType, status: 'active' });
  const templates = useQuery(api.smsTemplates.list, { recipientType, activeOnly: true });
  const sendMessage = useMutation(api.smsMessages.send);

  // Filter recipients by search
  const filteredRecipients = useMemo(() => {
    if (!recipients) return [];
    if (!searchQuery) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.childName && r.childName.toLowerCase().includes(q))
    );
  }, [recipients, searchQuery]);

  // Get selected recipient details
  const selectedRecipient = useMemo(() => {
    if (!recipients || !selectedRecipientId) return null;
    return recipients.find((r) => r._id === selectedRecipientId);
  }, [recipients, selectedRecipientId]);

  // Get selected template
  const selectedTemplate = useMemo(() => {
    if (!templates || !selectedTemplateId) return null;
    return templates.find((t) => t._id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Apply template with variable substitution
  const applyTemplate = (template: any) => {
    if (!template) return;
    
    let text = template.messageText;
    
    // Substitute variables based on selected recipient
    if (selectedRecipient) {
      text = text.replace(/\{\{parent_name\}\}/g, selectedRecipient.name);
      text = text.replace(/\{\{child_name\}\}/g, selectedRecipient.childName || '[Child Name]');
      text = text.replace(/\{\{driver_name\}\}/g, selectedRecipient.name);
    }
    
    // Time-based substitutions
    text = text.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    text = text.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    
    // Default values from template variables
    template.variables?.forEach((v: any) => {
      if (v.defaultValue) {
        text = text.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.defaultValue);
      }
    });
    
    setMessageContent(text);
    setSelectedTemplateId(template._id);
  };

  // Calculate SMS segments
  const segmentCount = Math.ceil(messageContent.length / 160) || 0;
  const charsRemaining = 160 - (messageContent.length % 160);

  // Handle send
  const handleSend = async () => {
    // Validation
    if (recipientType === 'custom') {
      if (!customPhone.trim() || !customName.trim()) {
        Alert.alert('Error', 'Please enter recipient name and phone number');
        return;
      }
    } else {
      if (!selectedRecipientId || !selectedRecipient) {
        Alert.alert('Error', 'Please select a recipient');
        return;
      }
    }

    if (!messageContent.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        recipientType: recipientType as any,
        recipientId: recipientType === 'custom' ? undefined : selectedRecipientId!,
        recipientName: recipientType === 'custom' ? customName : selectedRecipient!.name,
        recipientPhone: recipientType === 'custom' ? customPhone : selectedRecipient!.phone,
        templateId: selectedTemplateId ? (selectedTemplateId as any) : undefined,
        messageContent: messageContent.trim(),
        language: selectedRecipient?.preferredLanguage || 'en',
      });

      Alert.alert('Success', `Message sent to ${recipientType === 'custom' ? customName : selectedRecipient!.name}!`);

      // Reset form
      setSelectedRecipientId(null);
      setSelectedTemplateId(null);
      setMessageContent('');
      setCustomPhone('');
      setCustomName('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const subtextColor = isDark ? '#888888' : '#666666';
  const borderColor = isDark ? '#333' : '#ddd';
  const inputBg = isDark ? '#333' : '#f9f9f9';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Recipient Type Tabs */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.label, { color: textColor }]}>Recipient Type</Text>
        <View style={styles.tabs}>
          {(['parent', 'driver', 'custom'] as RecipientType[]).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.tab,
                { borderColor },
                recipientType === type && styles.tabActive,
              ]}
              onPress={() => {
                setRecipientType(type);
                setSelectedRecipientId(null);
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: recipientType === type ? '#007AFF' : subtextColor },
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recipient Selection */}
      {recipientType !== 'custom' ? (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: textColor }]}>Select Recipient *</Text>
          <TextInput
            style={[styles.searchInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Search by name, phone, or child..."
            placeholderTextColor={subtextColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={styles.recipientList} nestedScrollEnabled>
            {filteredRecipients.map((recipient) => (
              <Pressable
                key={recipient._id}
                style={[
                  styles.recipientItem,
                  { borderColor },
                  selectedRecipientId === recipient._id && styles.recipientSelected,
                ]}
                onPress={() => setSelectedRecipientId(recipient._id)}
              >
                <View style={styles.recipientInfo}>
                  <Text style={[styles.recipientName, { color: textColor }]}>{recipient.name}</Text>
                  <Text style={[styles.recipientPhone, { color: subtextColor }]}>{recipient.phone}</Text>
                  {recipient.childName && (
                    <Text style={[styles.recipientChild, { color: subtextColor }]}>
                      Child: {recipient.childName}
                    </Text>
                  )}
                </View>
                {selectedRecipientId === recipient._id && (
                  <FontAwesome name="check-circle" size={20} color="#007AFF" />
                )}
              </Pressable>
            ))}
            {filteredRecipients.length === 0 && (
              <Text style={[styles.emptyText, { color: subtextColor }]}>No recipients found</Text>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: textColor }]}>Custom Recipient</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Name"
            placeholderTextColor={subtextColor}
            value={customName}
            onChangeText={setCustomName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Phone (+1...)"
            placeholderTextColor={subtextColor}
            value={customPhone}
            onChangeText={setCustomPhone}
            keyboardType="phone-pad"
          />
        </View>
      )}

      {/* Template Selection */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.label, { color: textColor }]}>Use Template (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
          <Pressable
            style={[styles.templateCard, { borderColor }, !selectedTemplateId && styles.templateSelected]}
            onPress={() => {
              setSelectedTemplateId(null);
              setMessageContent('');
            }}
          >
            <Text style={[styles.templateName, { color: textColor }]}>None</Text>
          </Pressable>
          {templates?.map((template) => (
            <Pressable
              key={template._id}
              style={[
                styles.templateCard,
                { borderColor },
                selectedTemplateId === template._id && styles.templateSelected,
              ]}
              onPress={() => applyTemplate(template)}
            >
              <Text style={[styles.templateName, { color: textColor }]} numberOfLines={1}>
                {template.name}
              </Text>
              <Text style={[styles.templateCategory, { color: subtextColor }]}>{template.category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Message Content */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.label, { color: textColor }]}>Message *</Text>
        <TextInput
          style={[styles.messageInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
          placeholder="Type your message..."
          placeholderTextColor={subtextColor}
          value={messageContent}
          onChangeText={setMessageContent}
          multiline
          numberOfLines={4}
        />
        <View style={styles.charCount}>
          <Text style={[styles.charText, { color: subtextColor }]}>
            {messageContent.length} chars | {segmentCount} segment{segmentCount !== 1 ? 's' : ''} |{' '}
            {charsRemaining} chars until next segment
          </Text>
        </View>
      </View>

      {/* Preview */}
      {messageContent && (selectedRecipient || (recipientType === 'custom' && customName)) && (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: textColor }]}>Preview</Text>
          <View style={[styles.preview, { backgroundColor: inputBg, borderColor }]}>
            <Text style={[styles.previewTo, { color: subtextColor }]}>
              To: {recipientType === 'custom' ? customName : selectedRecipient?.name} (
              {recipientType === 'custom' ? customPhone : selectedRecipient?.phone})
            </Text>
            <Text style={[styles.previewText, { color: textColor }]}>{messageContent}</Text>
          </View>
        </View>
      )}

      {/* Send Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[
            styles.sendButton,
            (sending || !messageContent.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={sending || !messageContent.trim()}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="paper-plane" size={18} color="#fff" />
              <Text style={styles.sendButtonText}>Send Message</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 15,
  },
  recipientList: {
    maxHeight: 200,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  recipientSelected: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '500',
  },
  recipientPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  recipientChild: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 15,
  },
  templateScroll: {
    flexDirection: 'row',
  },
  templateCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 120,
  },
  templateSelected: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '500',
  },
  templateCategory: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  messageInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  charText: {
    fontSize: 12,
  },
  preview: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewTo: {
    fontSize: 12,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
});
