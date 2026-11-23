import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../core/types';
import { lightTokens } from '../design-system/tokens/light';
import { darkTokens } from '../design-system/tokens/dark';
import { ThemeTokens } from '../design-system/tokens/light';

const THEME_KEY = '@stitchflow_theme';

interface ThemeState {
  mode: ThemeMode;
  tokens: ThemeTokens;
  setTheme: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  tokens: lightTokens,

  setTheme: async (mode: ThemeMode) => {
    await AsyncStorage.setItem(THEME_KEY, mode);
    set({ mode, tokens: mode === 'dark' ? darkTokens : lightTokens });
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'dark') {
        set({ mode: 'dark', tokens: darkTokens });
      }
    } catch {
      // keep default
    }
  },
}));
