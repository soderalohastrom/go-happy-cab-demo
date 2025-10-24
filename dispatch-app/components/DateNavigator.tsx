/**
 * DateNavigator Component
 * 
 * Provides date navigation with prev/today/next buttons and calendar modal
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import MonthCalendar from './MonthCalendar';

interface DateNavigatorProps {
  currentDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
}

export default function DateNavigator({ currentDate, onDateChange }: DateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePrevDay = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  const handleCalendarDateSelect = (date: string) => {
    onDateChange(date);
    setShowCalendar(false);
  };

  // Format current date for display
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Check if current date is today
  const isToday = currentDate === new Date().toISOString().split('T')[0];

  return (
    <>
      <View style={styles.container}>
        {/* Prev Button */}
        <TouchableOpacity onPress={handlePrevDay} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        {/* Date Display / Calendar Trigger */}
        <TouchableOpacity 
          onPress={() => setShowCalendar(true)} 
          style={styles.dateButton}
        >
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>

        {/* Today Button (only show if not today) */}
        {!isToday && (
          <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        )}

        {/* Next Button */}
        <TouchableOpacity onPress={handleNextDay} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity 
                onPress={() => setShowCalendar(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <MonthCalendar
              selectedDate={currentDate}
              onDateSelect={handleCalendarDateSelect}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
  },
  navButtonText: {
    fontSize: 24,
    color: '#2196F3',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  calendarIcon: {
    fontSize: 18,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    marginRight: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
});

