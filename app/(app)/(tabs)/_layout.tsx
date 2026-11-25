import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import {
  LayoutDashboard,
  Layers,
  ScanLine,
  BarChart3,
  Settings,
  Building2,
} from 'lucide-react-native';

export default function TabsLayout() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');

  const isMD = user?.role === 'md';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mode === 'dark' ? tokens.signatureLime : tokens.brand,
        tabBarInactiveTintColor: tokens.textSecondary,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isMD ? t('overview') : t('home'),
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: isMD ? t('factories') : t('work'),
          tabBarIcon: ({ color }) =>
            isMD ? (
              <Building2 size={22} color={color} strokeWidth={2} />
            ) : (
              <Layers size={22} color={color} strokeWidth={2} />
            ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={
          isMD
            ? { href: null }
            : {
                title: t('scan'),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={(e) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      props.onPress?.(e);
                    }}
                    accessibilityLabel={t('scanBarcodeOrQR')}
                    accessibilityRole="button"
                    style={styles.scannerWrapper}
                  >
                    <View
                      style={[
                        styles.scannerCircle,
                        {
                          backgroundColor: tokens.brand,
                          shadowColor: tokens.primaryDeep,
                        },
                      ]}
                    >
                      <ScanLine
                        size={26}
                        color={mode === 'dark' ? '#11161E' : '#FFFFFF'}
                        strokeWidth={2.4}
                      />
                    </View>
                  </TouchableOpacity>
                ),
              }
        }
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('reports') || 'Reports',
          tabBarIcon: ({ color }) => (
            <BarChart3 size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings') || 'Settings',
          tabBarIcon: ({ color }) => (
            <Settings size={22} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scannerWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scannerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
