import '../src/i18n';
import React, { useEffect } from 'react';
import { useFactoryUpdates } from '../src/services/api/useFactoryUpdates';
import { useNotificationUpdates } from '../src/services/api/useNotificationUpdates';
import { ForegroundNotificationBanner } from '../src/design-system/components/notifications/ForegroundNotificationBanner';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';
import { useLanguageStore } from '../src/store/languageStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Prevent native splash screen from auto-hiding until AnimatedBrandSplash takes over
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function FactoryUpdates() {
  useFactoryUpdates();
  useNotificationUpdates();
  return null;
}

export default function RootLayout() {
  const initializeTheme = useThemeStore((s) => s.initialize);
  const mode = useThemeStore((s) => s.mode);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const initializeLang = useLanguageStore((s) => s.initialize);

  useEffect(() => {
    void Promise.all([initializeTheme(), initializeAuth(), initializeLang()]);
  }, [initializeTheme, initializeAuth, initializeLang]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <FactoryUpdates />
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <ForegroundNotificationBanner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
