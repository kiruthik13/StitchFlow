import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { Language } from '../../core/types';

const LANGUAGES: { key: Language; label: string; native: string }[] = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { tokens } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();

  if (compact) {
    // Inline toggle
    return (
      <View style={styles.row}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.key}
            onPress={() => setLanguage(lang.key)}
            style={[
              styles.chip,
              {
                backgroundColor: lang.key === language ? tokens.brand : tokens.surface,
                borderColor: lang.key === language ? tokens.brand : tokens.border,
              },
            ]}
          >
            <AppText
              variant="label"
              style={{ color: lang.key === language ? tokens.textInverse : tokens.textSecondary }}
            >
              {lang.native}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.key}
          onPress={() => setLanguage(lang.key)}
          style={[
            styles.row,
            styles.fullRow,
            {
              backgroundColor: lang.key === language ? tokens.brandLight : 'transparent',
              borderRadius: 8,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="body">{lang.native}</AppText>
            <AppText variant="caption" color="secondary">{lang.label}</AppText>
          </View>
          {lang.key === language && (
            <AppText variant="body" color="brand">✓</AppText>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[1.5],
  },
  chip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: 20,
    borderWidth: 1,
  },
  fullRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[1],
    alignItems: 'center',
  },
});
