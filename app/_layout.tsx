import '../src/i18n';
import React, { useEffect } from 'react';
import { useFactoryUpdates } from '../src/services/api/useFactoryUpdates';
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
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function FactoryUpdates() {
  useFactoryUpdates();
  return null;
}

export default function RootLayout() {
  const { initialize: initTheme, mode } = useThemeStore();
  const { initialize: initAuth } = useAuthStore();
  const { initialize: initLang } = useLanguageStore();

  useEffect(() => {
    Promise.all([initTheme(), initAuth(), initLang()]);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
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
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
