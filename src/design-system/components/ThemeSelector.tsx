import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { ThemeMode } from '../../core/types';

const THEMES: { key: ThemeMode; label: string; desc: string; preview: string }[] = [
  { key: 'light', label: 'Daylight Stone', desc: 'Default light theme', preview: '#F4F3EF' },
  { key: 'dark', label: 'Matte Obsidian', desc: 'Dark theme for low-light', preview: '#111215' },
];

export function ThemeSelector() {
  const { mode, setTheme, tokens } = useThemeStore();

  return (
    <View>
      {THEMES.map((theme) => (
        <TouchableOpacity
          key={theme.key}
          onPress={() => setTheme(theme.key)}
          style={[
            styles.row,
            {
              backgroundColor: theme.key === mode ? tokens.brandLight : 'transparent',
              borderRadius: 8,
              borderWidth: theme.key === mode ? 1 : 0,
              borderColor: tokens.brand,
            },
          ]}
        >
          <View style={[styles.preview, { backgroundColor: theme.preview, borderColor: tokens.border }]} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" bold>{theme.label}</AppText>
            <AppText variant="caption" color="secondary">{theme.desc}</AppText>
          </View>
          {theme.key === mode && (
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
    alignItems: 'center',
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  preview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
});
