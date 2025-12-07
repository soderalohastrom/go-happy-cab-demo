import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PastPeriodWarningModalProps {
  visible: boolean;
  periodLabel: string; // e.g., "AM on Dec 5" or "AM today"
  actionType: 'assign' | 'unassign' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PastPeriodWarningModal({
  visible,
  periodLabel,
  actionType,
  onConfirm,
  onCancel,
}: PastPeriodWarningModalProps) {
  const actionLabels = {
    assign: 'assign a child',
    unassign: 'unassign a child',
    delete: 'delete this route',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color="#ffc107" />
          </View>

          <Text style={styles.title}>Past Period Warning</Text>

          <Text style={styles.message}>
            You're trying to {actionLabels[actionType]} for{' '}
            <Text style={styles.bold}>{periodLabel}</Text>, which has already passed.
          </Text>

          <Text style={styles.subMessage}>
            This may affect driver records and billing accuracy.
            Are you sure you want to continue?
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>
                Yes, Override
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  subMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
