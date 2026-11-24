import { Stack } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';

export default function PackingLayout() {
  const { tokens } = useThemeStore();
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
