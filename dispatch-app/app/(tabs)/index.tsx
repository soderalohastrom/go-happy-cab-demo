/**
 * Main Dispatch Screen
 * 
 * Combines DateNavigator and AssignmentScreen for route management
 */

import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import DateNavigator from '@/components/DateNavigator';
import AssignmentScreen from '@/components/AssignmentScreen';
import { getTodayString } from '@/hooks/useConvexRoutes';

export default function TabOneScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <DateNavigator
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </View>
      
      <AssignmentScreen date={selectedDate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
  },
});
