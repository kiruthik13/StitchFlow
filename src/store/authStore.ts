import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../core/types';
import { DEMO_USERS } from '../fixtures/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;

  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const AUTH_STORAGE_KEY = '@stitchflow_auth';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isDemoMode: false,
  isLoading: true,

  demoLogin: async (role: UserRole) => {
    const demoUser = DEMO_USERS.find((u) => u.role === role);
    if (!demoUser) return;

    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: demoUser, isDemoMode: true })
    );

    set({ user: demoUser, isAuthenticated: true, isDemoMode: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, isAuthenticated: false, isDemoMode: false });
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { user, isDemoMode } = JSON.parse(stored);
        set({ user, isAuthenticated: true, isDemoMode, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
