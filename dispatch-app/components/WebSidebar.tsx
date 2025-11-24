import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const SidebarItem = ({
  name,
  icon,
  href,
  isActive,
  indented = false,
}: {
  name: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  href: string;
  isActive: boolean;
  indented?: boolean;
}) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = isActive ? (colorScheme === 'dark' ? '#333' : '#e6f2ff') : 'transparent';

  return (
    // <Link href={href} asChild>
      <Pressable
        onPress={() => router.push(href)}
        style={[
          styles.item, 
          { backgroundColor },
          indented && styles.itemIndented,
        ]}
      >
        {({ hovered }) => (
          <View style={[styles.itemContent, hovered && styles.itemHovered]}>
            <FontAwesome 
              name={icon} 
              size={indented ? 16 : 20} 
              color={isActive ? activeColor : inactiveColor} 
              style={[styles.icon, indented && styles.iconSmall]}
            />
            <Text style={[
              styles.label, 
              { color: isActive ? activeColor : inactiveColor, fontWeight: isActive ? '600' : '400' },
              indented && styles.labelSmall,
            ]}>
              {name}
            </Text>
          </View>
        )}
      </Pressable>
    // </Link>
  );
};

export default function WebSidebar() {
  // const pathname = usePathname();
  const pathname = '/'; // Mock pathname
  const colorScheme = useColorScheme();
  
  const isDark = colorScheme === 'dark';
  const containerBg = isDark ? '#1a1a1a' : '#f8f9fa';
  const borderColor = isDark ? '#333' : '#e1e4e8';

  const routes = [
    { name: 'Dispatch', icon: 'calendar', href: '/' },
    { name: 'CRM', icon: 'address-book', href: '/crm' },
    { name: 'Drivers', icon: 'users', href: '/drivers', indented: true },
    { name: 'Children', icon: 'child', href: '/children', indented: true },
    { name: 'Schools', icon: 'building', href: '/schools', indented: true },
    { name: 'SMS', icon: 'comment', href: '/sms' },
    { name: 'Send SMS', icon: 'paper-plane', href: '/sms/send', indented: true },
    { name: 'Messages', icon: 'envelope', href: '/sms/messages', indented: true },
    { name: 'Reports', icon: 'bar-chart', href: '/reports' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: containerBg, borderRightColor: borderColor }]}>
      <View style={styles.header}>
        <FontAwesome name="taxi" size={32} color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Go Happy Cab</Text>
      </View>
      
      <View style={styles.nav}>
        {routes.map((route) => (
          <SidebarItem 
            key={route.href}
            name={route.name}
            icon={route.icon as any}
            href={route.href}
            isActive={pathname === route.href || (route.href !== '/' && pathname.startsWith(route.href) && !routes.some(r => r.href !== route.href && r.href.startsWith(route.href) && pathname.startsWith(r.href)))}
            indented={(route as any).indented}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: isDark ? '#888' : '#666' }]}>
          v1.0.0 Web Dashboard
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 5,
  },
  item: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemIndented: {
    marginLeft: 20,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  itemHovered: {
    opacity: 0.8,
  },
  icon: {
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  iconSmall: {
    width: 24,
    marginRight: 8,
  },
  label: {
    fontSize: 16,
  },
  labelSmall: {
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  footerText: {
    fontSize: 12,
  },
});
