import { View, Text } from 'react-native';
import { Slot } from 'expo-router';
import { ConvexProvider } from 'convex/react';
import { convex } from '@/lib/convex';
import { useColorScheme } from '@/components/useColorScheme';
import WebSidebar from '@/components/WebSidebar';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ConvexProvider client={convex}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <WebSidebar />
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    </ConvexProvider>
  );
}
