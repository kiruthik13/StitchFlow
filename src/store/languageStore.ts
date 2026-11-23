import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '../core/types';
import i18n from '../i18n';

const LANGUAGE_KEY = '@stitchflow_language';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  setLanguage: async (lang: Language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
    set({ language: lang });
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (stored && ['en', 'ta', 'hi'].includes(stored)) {
        const lang = stored as Language;
        await i18n.changeLanguage(lang);
        set({ language: lang });
      }
    } catch {
      // keep default
    }
  },
}));
