import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function CrmScreen() {
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme ?? 'light'].text;
  const bgColor = Colors[colorScheme ?? 'light'].background;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Global CRM</Text>
        <Text style={[styles.subtitle, { color: textColor }]}>Manage all your customer relationships in one place.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.dashedCard}>
          <Text style={styles.cardTitle}>Global CRM - Company Contacts</Text>
          <Text style={styles.comingSoon}>Coming soon...</Text>
        </View>

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            Please edit entities within each of the sidebar menu items (Children, Drivers, Schools). Only adds and edits within these areas will be reflected in the App with Child / Driver / School pairings.
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Quick Links</Text>
          <Text style={[styles.infoText, { color: textColor }]}>
            Use the sidebar navigation to access:
          </Text>
          <Text style={[styles.linkItem, { color: textColor }]}>• Children - Manage child records and school assignments</Text>
          <Text style={[styles.linkItem, { color: textColor }]}>• Drivers - Manage driver profiles and availability</Text>
          <Text style={[styles.linkItem, { color: textColor }]}>• Schools - Manage districts, schools, and schedules</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  dashedCard: {
    borderWidth: 2,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    marginBottom: 24,
  },
  disclaimerIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  linkItem: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    paddingLeft: 8,
  },
});
