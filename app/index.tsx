import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LoadingState } from '../src/design-system/components/LoadingState';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingState message="Starting StitchFlow..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/language-selection" />;
}
