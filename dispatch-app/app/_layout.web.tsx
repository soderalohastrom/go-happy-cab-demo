import { View, Text } from 'react-native';
import { Slot, useSegments } from 'expo-router';
import { ConvexProvider } from 'convex/react';
import { convex } from '@/lib/convex';
import { useColorScheme } from '@/components/useColorScheme';
import WebSidebar from '@/components/WebSidebar';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();

  // Check if we are on a public route
  const isPublicRoute = segments[0] === 'public';

  return (
    <ConvexProvider client={convex}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {!isPublicRoute && <WebSidebar />}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    </ConvexProvider>
  );
}
