import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { usePathname, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { AppNotification, useNotificationStore } from '../../store/notificationStore';
import { apiRequest, getStoredSession } from './apiClient';
import { invalidateOperationalFlow } from './useFactoryUpdates';
import {
  navigateFromNotification,
  registerDeviceForPushNotifications,
} from '../notifications/pushService';

function realtimeUrl(): string | undefined {
  const origin = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!origin || !key) return undefined;
  try {
    const url = new URL('/realtime/v1/websocket', origin);
    if (url.protocol !== 'https:') return undefined;
    url.protocol = 'wss:';
    url.searchParams.set('apikey', key);
    url.searchParams.set('vsn', '1.0.0');
    return url.toString();
  } catch {
    return undefined;
  }
}

export function useNotificationUpdates() {
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const language = useLanguageStore((s) => s.language);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  // Register device token + sync initial unread count
  useEffect(() => {
    if (!user) {
      useNotificationStore.getState().reset();
      return;
    }

    if (isDemoMode) {
      useNotificationStore.getState().seedDemoForRole(user.role);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiRequest<{ unreadCount: number; actionRequiredCount: number }>(
          '/notifications/unread-count',
        );
        if (!cancelled) {
          useNotificationStore.getState().setCounts(res.unreadCount, res.actionRequiredCount);
        }
      } catch {
        // Ignore transient startup failure
      }
      await registerDeviceForPushNotifications(language);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemoMode, language]);

  // Listen to Expo Notifications foreground & tap responses
  useEffect(() => {
    if (!user) return;

    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;
    try {
      receivedSub = Notifications.addNotificationReceivedListener((event) => {
        const data = (event.request.content.data ?? {}) as Record<string, unknown>;
        void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        invalidateOperationalFlow(queryClient);
        if (!isDemoMode) {
          void apiRequest<{ unreadCount: number; actionRequiredCount: number }>('/notifications/unread-count')
            .then((res) => useNotificationStore.getState().setCounts(res.unreadCount, res.actionRequiredCount))
            .catch(() => {});
        }
        if (data.notificationId && !pathname.includes('/scan')) {
          useNotificationStore.getState().showBanner({
            id: String(data.notificationId),
            category: 'production',
            priority: 'INFORMATION',
            titleKey: String(event.request.content.title ?? 'StitchFlow'),
            messageKey: String(event.request.content.body ?? ''),
            messageParameters: {},
            entityType: 'notification',
            actionRoute: typeof data.actionRoute === 'string' ? data.actionRoute : null,
            actionParameters: (data.actionParameters as Record<string, unknown>) ?? {},
            actionRequired: true,
            readAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      });

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
        const notifId = typeof data.notificationId === 'string' ? data.notificationId : null;
        if (notifId && !isDemoMode) {
          void apiRequest(`/notifications/${encodeURIComponent(notifId)}/read`, { method: 'PATCH' }).catch(() => {});
        }
        navigateFromNotification(
          router,
          typeof data.actionRoute === 'string' ? data.actionRoute : null,
          (data.actionParameters as Record<string, unknown>) ?? {},
        );
      });
    } catch {
      // Safe fallback when native notification listeners are unavailable
    }

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [user?.id, isDemoMode, pathname, queryClient, router]);

  // Single managed Supabase Realtime user inbox subscription
  useEffect(() => {
    const url = realtimeUrl();
    if (!url || !user?.id || isDemoMode) return;

    const topic = `realtime:stitchflow:user:${user.id}`;
    const joinedRef = '1';
    let stopped = false;
    let socket: WebSocket | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const close = () => {
      clearInterval(heartbeat);
      clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = undefined;
      }
    };

    const connect = async () => {
      if (stopped || AppState.currentState !== 'active') return;
      const session = await getStoredSession();
      if (stopped || !session?.accessToken) return;

      const ws = new WebSocket(url);
      socket = ws;
      let ref = 1;

      ws.onopen = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic,
            event: 'phx_join',
            ref: joinedRef,
            join_ref: joinedRef,
            payload: {
              access_token: session.accessToken,
              config: { private: true, broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [] },
            },
          }));
        }
      };

      ws.onmessage = ({ data }) => {
        if (typeof data !== 'string' || stopped) return;
        try {
          const frame = JSON.parse(data) as { topic: string; event: string; payload?: Record<string, unknown> };
          if (frame.topic !== topic) return;
          if (frame.event === 'phx_reply') {
            attempts = 0;
            heartbeat = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }));
              }
            }, 25000);
          } else if (frame.event === 'broadcast' && frame.payload) {
            const p = frame.payload as unknown as AppNotification;
            void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            invalidateOperationalFlow(queryClient);
            const st = useNotificationStore.getState();
            st.setCounts(st.unreadCount + 1, p.actionRequired ? st.actionRequiredCount + 1 : st.actionRequiredCount);
            if (!pathname.includes('/scan')) {
              st.showBanner(p);
            }
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        clearInterval(heartbeat);
        if (socket === ws) socket = undefined;
        if (!stopped && AppState.currentState === 'active') {
          retry = setTimeout(() => void connect(), Math.min(60000, 1000 * 2 ** Math.min(++attempts, 6)));
        }
      };
    };

    const appSub = AppState.addEventListener('change', (state) => {
      close();
      if (state === 'active') {
        invalidateOperationalFlow(queryClient);
        void connect();
      }
    });

    void connect();

    return () => {
      stopped = true;
      appSub.remove();
      close();
    };
  }, [user?.id, isDemoMode, pathname, queryClient]);
}
