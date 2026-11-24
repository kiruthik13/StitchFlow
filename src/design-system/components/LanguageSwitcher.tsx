import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { Language } from '../../core/types';

const LANGUAGES: { key: Language; label: string; native: string; sub: string }[] = [
  { key: 'en', label: 'English', native: 'English', sub: 'Primary floor language' },
  { key: 'ta', label: 'Tamil', native: 'தமிழ்', sub: 'தமிழ்நாடு ஆடை உற்பத்தி' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी', sub: 'गारमेंट फ्लोर निर्देश' },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { tokens } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();

  if (compact) {
    return (
      <View style={styles.chipRow}>
        {LANGUAGES.map((lang) => {
          const isSelected = lang.key === language;
          return (
            <TouchableOpacity
              key={lang.key}
              onPress={() => setLanguage(lang.key)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? tokens.brand : tokens.surfaceSecondary,
                  borderColor: isSelected ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText
                variant="label"
                bold={isSelected}
                style={{ color: isSelected ? tokens.textInverse : tokens.textSecondary }}
              >
                {lang.native}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {LANGUAGES.map((lang) => {
        const isSelected = lang.key === language;
        return (
          <TouchableOpacity
            key={lang.key}
            onPress={() => setLanguage(lang.key)}
            activeOpacity={0.8}
            style={[
              styles.fullRow,
              {
                backgroundColor: isSelected ? tokens.brandLight : tokens.surfaceSecondary,
                borderColor: isSelected ? tokens.brand : tokens.border,
                borderWidth: isSelected ? 1.5 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <AppText variant="body" bold style={{ color: tokens.textPrimary }}>
                  {lang.native}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginLeft: spacing[2] }}>
                  ({lang.label})
                </AppText>
              </View>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {lang.sub}
              </AppText>
            </View>
            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: tokens.brand }]}>
                <Check size={14} color={tokens.textInverse} strokeWidth={2.5} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  container: {
    gap: spacing[2],
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3.5],
    borderRadius: radii.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
