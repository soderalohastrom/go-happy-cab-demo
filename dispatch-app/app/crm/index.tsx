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
        <View style={[styles.card, { borderColor: textColor, opacity: 0.1 }]} />
        <Text style={{ color: textColor, marginTop: 20 }}>CRM Features coming soon...</Text>
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
  card: {
    height: 200,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
});
