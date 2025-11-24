import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

/**
 * SMS Section Layout
 * Stack navigator for SMS Switchboard screens
 */
export default function SMSLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'SMS Dashboard',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="send"
        options={{
          title: 'Send SMS',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="messages"
        options={{
          title: 'Message History',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="recipients"
        options={{
          title: 'Recipients',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="templates"
        options={{
          title: 'Templates',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
