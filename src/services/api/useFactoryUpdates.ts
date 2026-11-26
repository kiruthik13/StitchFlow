import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getStoredSession } from './apiClient';

interface ChannelFrame {
  topic: string;
  event: string;
  ref?: string;
  payload?: { status?: string; event?: string };
}

const syncedKeys = new Set(['jobs', 'job', 'job-approvals', 'job-route', 'job-queues', 'job-allocation', 'live-dashboard', 'live-reports', 'raw-stock', 'raw-counts', 'raw-transfers', 'shipment-manifests', 'cut-stock', 'dispatch-cartons', 'bundle-duty']);
const realtimeRoles = new Set(['md', 'factory-manager', 'store-dispatch']);

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

export function useFactoryUpdates() {
  const user = useAuthStore(state => state.user);
  const demo = useAuthStore(state => state.isDemoMode);
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = realtimeUrl();
    if (!url || !user?.factoryId || demo || !realtimeRoles.has(user.role)) return;
    const topic = `realtime:stitchflow:factory:${user.factoryId}`;
    const joinedRef = '1';
    const userId = user.id;
    let context = 0;
    let stopped = false;
    let socket: WebSocket | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let joinTimeout: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let invalidate: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const refresh = () => {
      if (invalidate) return;
      invalidate = setTimeout(() => {
        invalidate = undefined;
        if (!stopped && AppState.currentState === 'active') {
          void queryClient.invalidateQueries({
            predicate: ({ queryKey }) => queryKey[1] === userId && syncedKeys.has(queryKey[0] as string),
          });
        }
      }, 300);
    };

    const close = () => {
      context++;
      clearInterval(heartbeat);
      clearTimeout(joinTimeout);
      clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = undefined;
      }
    };

    const connect = async () => {
      if (stopped || AppState.currentState !== 'active') return;
      const current = ++context;
      const session = await getStoredSession();
      if (stopped || current !== context || AppState.currentState !== 'active') return;
      if (!session?.accessToken || (session.expiresAt && session.expiresAt <= Date.now() / 1000)) {
        refresh();
        retry = setTimeout(() => void connect(), 20000);
        return;
      }
      const ws = new WebSocket(url);
      socket = ws;
      let ref = 1;
      let pendingHeartbeat: string | undefined;
      let joined = false;
      let token = session.accessToken;

      const send = (frame: Record<string, unknown>) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
      };

      joinTimeout = setTimeout(() => ws.close(), 12000);
      ws.onopen = () => send({
        topic, event: 'phx_join', ref: joinedRef, join_ref: joinedRef,
        payload: { access_token: token, config: { private: true, broadcast: { ack: false, self: false },
          presence: { enabled: false }, postgres_changes: [] } },
      });
      ws.onmessage = ({ data }) => {
        if (typeof data !== 'string' || stopped || current !== context) return;
        let frame: ChannelFrame;
        try {
          frame = JSON.parse(data) as ChannelFrame;
        } catch {
          return;
        }
        if (frame.topic === 'phoenix' && frame.ref === pendingHeartbeat) pendingHeartbeat = undefined;
        if (frame.topic !== topic) return;
        if (frame.event === 'phx_error' || frame.event === 'phx_close') ws.close();
        if (frame.event === 'phx_reply' && frame.ref === joinedRef) {
          if (frame.payload?.status !== 'ok') {
            ws.close();
            return;
          }
          clearTimeout(joinTimeout);
          attempts = 0;
          joined = true;
          refresh();
          heartbeat = setInterval(async () => {
            if (pendingHeartbeat) { ws.close(); return; }
            pendingHeartbeat = String(++ref);
            send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: pendingHeartbeat });
            const latest = await getStoredSession();
            if (!latest?.accessToken) { ws.close(); return; }
            if (latest.accessToken !== token) {
              token = latest.accessToken;
              send({ topic, event: 'access_token', payload: { access_token: token }, ref: String(++ref), join_ref: joinedRef });
            }
          }, 25000);
        } else if (joined && frame.event === 'broadcast' && frame.payload?.event === 'factory_changed') {
          refresh();
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        clearTimeout(joinTimeout);
        clearInterval(heartbeat);
        if (socket === ws) socket = undefined;
        if (!stopped && current === context && AppState.currentState === 'active') {
          retry = setTimeout(() => void connect(), Math.min(60000, 1000 * 2 ** Math.min(++attempts, 6)));
        }
      };
    };

    const state = AppState.addEventListener('change', status => {
      close();
      if (status === 'active') void connect();
    });
    void connect();
    return () => {
      stopped = true;
      state.remove();
      clearTimeout(invalidate);
      close();
    };
  }, [user?.id, user?.factoryId, user?.role, demo, queryClient]);
}
