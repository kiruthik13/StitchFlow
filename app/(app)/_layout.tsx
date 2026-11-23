import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const { tokens } = useThemeStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
