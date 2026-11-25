import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import { AppText } from '../AppText';
import { BrandLoadingIndicator } from './BrandLoadingIndicator';
import { spacing } from '../../tokens/spacing';

export interface ScreenLoaderProps {
  message?: string;
  variant?: 'stitch' | 'bar' | 'pulse';
  style?: ViewStyle;
  compact?: boolean;
}

export function ScreenLoader({
  message = 'Loading...',
  variant = 'stitch',
  style,
  compact = false,
}: ScreenLoaderProps) {
  const { tokens, mode } = useThemeStore();
  const trackColor = mode === 'dark' ? '#25352E' : '#DDE2D8';
  const indicatorColor = tokens.brand || '#4469B1';

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <BrandLoadingIndicator
          variant="stitch"
          size={24}
          trackColor={trackColor}
          indicatorColor={indicatorColor}
        />
        {message ? (
          <AppText
            variant="caption"
            color="secondary"
            style={{ marginLeft: spacing[2.5] }}
          >
            {message}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.fullscreenContainer, { backgroundColor: tokens.background }, style]}>
      <View style={styles.card}>
        <BrandLoadingIndicator
          variant={variant}
          size={36}
          width={120}
          height={3.5}
          trackColor={trackColor}
          indicatorColor={indicatorColor}
        />
        {message ? (
          <AppText
            variant="body"
            color="secondary"
            style={[styles.messageText, { color: tokens.textSecondary }]}
          >
            {message}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    marginTop: spacing[4],
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
  },
});
