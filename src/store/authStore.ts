import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../core/types';
import { DEMO_USERS } from '../fixtures/mockData';
import {
  apiRequest,
  ApiError,
  getStoredSession,
  saveStoredSession,
} from '../services/api/apiClient';

export interface RegisterPayload {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  organizationId: string;
  factoryId: string;
}

interface AuthMeResponse {
  id: string;
  email: string;
  employeeId: string;
  name: string;
  role: UserRole;
  accountStatus: 'pending' | 'active' | 'suspended' | 'rejected';
  organizationId: string;
  assignedFactoryIds: string[];
  primaryFactoryId?: string;
  primaryLineId?: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  serverPermissions: string[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ accountStatus: string; message: string }>;
  forgotPassword: (email: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const AUTH_STORAGE_KEY = '@stitchflow_auth';
const RECENT_LOGINS_KEY = '@stitchflow_recent_logins_v1';

export interface RecentLoginEntry {
  email: string;
  name: string;
  role: UserRole;
}

export async function getRecentLogins(): Promise<RecentLoginEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_LOGINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentLoginEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveRecentLogin(entry: RecentLoginEntry): Promise<void> {
  try {
    const existing = await getRecentLogins();
    const next = [entry, ...existing.filter((item) => item.email.toLowerCase() !== entry.email.toLowerCase())].slice(0, 7);
    await AsyncStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(next));
  } catch {
    // Non-critical cache write
  }
}

export const isDemoModeAvailable = (): boolean =>
  process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

function toUserModel(me: AuthMeResponse): User {
  const parts = me.name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : me.name.slice(0, 2).toUpperCase();

  return {
    id: me.id,
    employeeId: me.employeeId,
    name: me.name,
    role: me.role,
    factoryId: me.primaryFactoryId || me.assignedFactoryIds[0] || '',
    factoryName: 'Assigned Factory',
    lineId: me.primaryLineId,
    avatarInitials: initials || 'SF',
    shiftType: 'morning',
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  serverPermissions: [],
  isAuthenticated: false,
  isDemoMode: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const loginRes = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      expiresAt?: number;
    }>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email: email.trim(), password }),
    });

    await saveStoredSession({
      accessToken: loginRes.accessToken,
      refreshToken: loginRes.refreshToken,
      expiresAt: loginRes.expiresAt,
    });

    const me = await apiRequest<AuthMeResponse>('/auth/me');
    if (me.accountStatus !== 'active') {
      await saveStoredSession(null);
      throw new ApiError(403, 'ERR_ACCOUNT_INACTIVE', `Account is ${me.accountStatus}.`);
    }

    const user = toUserModel(me);
    await saveRecentLogin({ email: email.trim().toLowerCase(), name: user.name, role: user.role });
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user, serverPermissions: me.permissions, isDemoMode: false }),
    );
    set({
      user,
      serverPermissions: me.permissions,
      isAuthenticated: true,
      isDemoMode: false,
    });
  },

  register: async (payload: RegisterPayload) => {
    return apiRequest<{ accountStatus: string; message: string }>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
  },

  forgotPassword: async (email: string) => {
    await apiRequest('/auth/forgot-password', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  demoLogin: async (role: UserRole) => {
    if (!isDemoModeAvailable()) {
      throw new ApiError(403, 'ERR_DEMO_DISABLED', 'Demo mode is disabled in production configuration.');
    }
    const demoUser = DEMO_USERS.find((u) => u.role === role);
    if (!demoUser) return;

    await saveStoredSession(null);
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: demoUser, serverPermissions: [], isDemoMode: true }),
    );

    set({
      user: demoUser,
      serverPermissions: [],
      isAuthenticated: true,
      isDemoMode: true,
    });
  },

  logout: async () => {
    const { isDemoMode } = get();
    if (!isDemoMode) {
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    await saveStoredSession(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      user: null,
      serverPermissions: [],
      isAuthenticated: false,
      isDemoMode: false,
    });
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) {
        set({ isLoading: false });
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed.isDemoMode) {
        if (isDemoModeAvailable()) {
          set({
            user: parsed.user,
            serverPermissions: [],
            isAuthenticated: true,
            isDemoMode: true,
            isLoading: false,
          });
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          set({ isLoading: false });
        }
        return;
      }

      const session = await getStoredSession();
      if (!session) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        set({ isLoading: false });
        return;
      }

      try {
        const me = await apiRequest<AuthMeResponse>('/auth/me');
        if (me.accountStatus !== 'active') {
          await saveStoredSession(null);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          set({ isLoading: false });
          return;
        }
        const user = toUserModel(me);
        set({
          user,
          serverPermissions: me.permissions,
          isAuthenticated: true,
          isDemoMode: false,
          isLoading: false,
        });
      } catch (err) {
        // Only clear session on explicit auth/account rejection; keep offline error state distinct
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403)) {
          await saveStoredSession(null);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          set({ isLoading: false });
        } else if (parsed?.user) {
          set({
            user: parsed.user,
            serverPermissions: Array.isArray(parsed.serverPermissions) ? parsed.serverPermissions : [],
            isAuthenticated: true,
            isDemoMode: false,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
