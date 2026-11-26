import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@stitchflow_session';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000/api/v1').replace(/\/+$/, '');
}

export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: StoredSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function refreshAccessToken(refreshToken: string): Promise<StoredSession | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const next: StoredSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
    await saveStoredSession(next);
    return next;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { skipAuth = false, timeoutMs = 15000, headers, ...rest } = options;
  const session = skipAuth ? null : await getStoredSession();

  const execute = async (token?: string): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${getApiBaseUrl()}${path}`, {
        ...rest,
        signal: controller.signal,
        headers: {
          ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(headers as Record<string, string>),
        },
      });
    } catch (err) {
      throw new ApiError(0, 'ERR_NETWORK_UNAVAILABLE', 'Unable to reach StitchFlow server.');
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await execute(session?.accessToken);

  if (res.status === 401 && !skipAuth && session?.refreshToken) {
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (refreshed) {
      res = await execute(refreshed.accessToken);
    } else {
      await saveStoredSession(null);
    }
  }

  const text = await res.text();
  let body: any = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Request failed';
    throw new ApiError(res.status, body?.errorCode || 'ERR_REQUEST_FAILED', msg);
  }

  return body as T;
}
