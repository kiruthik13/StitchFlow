import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiRequest } from '../api/apiClient';
import { useNotificationStore } from '../../store/notificationStore';

const DEVICE_ID_KEY = '@stitchflow_device_identifier_v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getOrCreateDeviceIdentifier(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = `sf-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function configureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('stitchflow-critical', {
      name: 'Critical Production Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#EC3327',
    }),
    Notifications.setNotificationChannelAsync('stitchflow-actions', {
      name: 'Action Required Tasks',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
      lightColor: '#4469B1',
    }),
    Notifications.setNotificationChannelAsync('stitchflow-updates', {
      name: 'Production Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4469B1',
    }),
  ]);
}

export async function registerDeviceForPushNotifications(
  preferredLanguage: 'en' | 'ta' | 'hi',
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    await configureAndroidNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenRes.data;
    if (!pushToken) return null;

    const deviceIdentifier = await getOrCreateDeviceIdentifier();
    const res = await apiRequest<{ id: string; registered: boolean }>('/notifications/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceIdentifier,
        pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        preferredLanguage,
      }),
    });

    useNotificationStore.getState().setActiveDeviceId(res.id);
    return res.id;
  } catch {
    // Physical push registration is unavailable on simulators/emulators without FCM
    return null;
  }
}

export async function unregisterCurrentDevice(): Promise<void> {
  const deviceId = useNotificationStore.getState().activeDeviceId;
  if (!deviceId) return;
  try {
    await apiRequest(`/notifications/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Non-blocking on logout
  } finally {
    useNotificationStore.getState().setActiveDeviceId(null);
  }
}

export function navigateFromNotification(
  router: { push: (href: never) => void },
  actionRoute?: string | null,
  actionParameters?: Record<string, unknown>,
): void {
  if (!actionRoute) {
    router.push('/(app)/notifications' as never);
    return;
  }
  const id = typeof actionParameters?.id === 'string' ? actionParameters.id : undefined;
  if (actionRoute.includes('[id]') && id) {
    router.push(actionRoute.replace('[id]', id) as never);
    return;
  }
  if (actionRoute.includes('[id]') && !id) {
    router.push('/(app)/notifications' as never);
    return;
  }
  router.push(actionRoute as never);
}
