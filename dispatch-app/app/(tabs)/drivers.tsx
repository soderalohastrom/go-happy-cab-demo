import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DriversScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Management</Text>
      <Text style={styles.subtitle}>
        Here you can add new drivers and view or deactivate existing ones.
      </Text>
      {/* Driver list and add driver form will go here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
});
