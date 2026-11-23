import React from 'react';
import { Tabs } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Layers,
  ScanLine,
  BarChart3,
  Settings,
  Building2,
} from 'lucide-react-native';

export default function TabsLayout() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');

  const isMD = user?.role === 'md';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.brand,
        tabBarInactiveTintColor: tokens.textSecondary,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isMD ? (t('overview') || 'Overview') : (t('home') || 'Home'),
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size || 22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: isMD ? (t('factories') || 'Factories') : (t('work') || 'Work'),
          tabBarIcon: ({ color, size }) =>
            isMD ? (
              <Building2 size={size || 22} color={color} strokeWidth={1.8} />
            ) : (
              <Layers size={size || 22} color={color} strokeWidth={1.8} />
            ),
          href: isMD ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('scan') || 'Scan',
          tabBarIcon: ({ color, size }) => (
            <ScanLine size={size || 22} color={color} strokeWidth={1.8} />
          ),
          // MD doesn't scan
          href: user?.role === 'md' ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('reports') || 'Reports',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size || 22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings') || 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size || 22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
