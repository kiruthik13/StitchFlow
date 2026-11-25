import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { BrandLoadingIndicator } from './feedback/BrandLoadingIndicator';
import { spacing } from '../tokens/spacing';

interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  style,
  compact = false,
}: LoadingStateProps) {
  const { tokens, mode } = useThemeStore();
  const trackColor = mode === 'dark' ? '#25352E' : '#DDE2D8';
  const indicatorColor = tokens.brand || '#4469B1';

  if (compact) {
    return (
      <View style={[styles.compactWrapper, style]}>
        <BrandLoadingIndicator
          variant="stitch"
          size={24}
          trackColor={trackColor}
          indicatorColor={indicatorColor}
        />
        {message ? (
          <AppText variant="caption" color="secondary" style={styles.compactMsg}>
            {message}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <BrandLoadingIndicator
        variant="stitch"
        size={44}
        trackColor={trackColor}
        indicatorColor={indicatorColor}
      />
      {message ? (
        <AppText variant="body" color="secondary" style={styles.msg}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  compactWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
  },
  msg: {
    marginTop: spacing[4],
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  compactMsg: {
    marginLeft: spacing[2.5],
  },
});
