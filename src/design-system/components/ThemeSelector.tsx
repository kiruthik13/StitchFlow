import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ThemeMode } from '../../core/types';

const THEMES: { key: ThemeMode; label: string; desc: string; preview: string; borderPreview: string }[] = [
  { key: 'light', label: 'Warm Ivory', desc: 'Garment floor high-contrast daylight theme', preview: '#F4F3EE', borderPreview: '#E2DEC9' },
  { key: 'dark', label: 'Matte Forest Obsidian', desc: 'Industrial low-glare deep obsidian theme', preview: '#101514', borderPreview: '#1E2B25' },
];

export function ThemeSelector() {
  const { mode, setTheme, tokens } = useThemeStore();

  return (
    <View style={styles.container}>
      {THEMES.map((theme) => {
        const isSelected = theme.key === mode;
        return (
          <TouchableOpacity
            key={theme.key}
            onPress={() => setTheme(theme.key)}
            activeOpacity={0.8}
            style={[
              styles.row,
              {
                backgroundColor: isSelected ? tokens.brandLight : tokens.surfaceSecondary,
                borderColor: isSelected ? tokens.brand : tokens.border,
                borderWidth: isSelected ? 1.5 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.preview,
                {
                  backgroundColor: theme.preview,
                  borderColor: theme.borderPreview,
                },
              ]}
            >
              {isSelected && (
                <View style={[styles.innerIndicator, { backgroundColor: tokens.brand }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" bold style={{ color: tokens.textPrimary }}>
                {theme.label}
              </AppText>
              <AppText variant="caption" color="secondary">
                {theme.desc}
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
  container: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.md,
    gap: spacing[3],
  },
  preview: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerIndicator: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
