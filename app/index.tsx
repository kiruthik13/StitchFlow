import React, { useState, useEffect, useRef } from 'react';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { AnimatedBrandSplash } from '../src/design-system/components/splash/AnimatedBrandSplash';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [splashFinished, setSplashFinished] = useState(false);
  const hiddenNativeRef = useRef(false);

  useEffect(() => {
    // Hide the native splash screen as soon as AnimatedBrandSplash has mounted
    if (!hiddenNativeRef.current) {
      hiddenNativeRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  if (!splashFinished) {
    return (
      <AnimatedBrandSplash
        isReady={!isLoading}
        onAnimationComplete={() => setSplashFinished(true)}
      />
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/language-selection" />;
}
