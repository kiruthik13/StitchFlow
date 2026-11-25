import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import { StitchFlowSymbol } from './StitchFlowSymbol';

const FULL_LOGO_LIGHT = require('../../../../assets/branding/stitchflow-logo.png');
const FULL_LOGO_DARK = require('../../../../assets/branding/stitchflow-logo-dark.png');

export interface StitchFlowLogoProps {
  size?: number;
  variant?: 'symbol' | 'full';
  color?: string;
  accentColor?: string;
  withBackground?: boolean;
  style?: ViewStyle;
}

/**
 * Official StitchFlow Brand Logo.
 * Defaults to the standalone symbol for compact/header usage, or renders the
 * full horizontal logo (with PRODUCTION INTELLIGENCE tagline) when variant="full".
 */
export function StitchFlowLogo({
  size = 36,
  variant = 'symbol',
  withBackground = false,
  style,
}: StitchFlowLogoProps) {
  const { mode } = useThemeStore();

  if (variant === 'full') {
    const width = Math.round(size * 3.15);
    const height = size;
    return (
      <View style={[styles.fullWrap, style]}>
        <Image
          source={mode === 'dark' ? FULL_LOGO_DARK : FULL_LOGO_LIGHT}
          style={{ width, height }}
          contentFit="contain"
          accessibilityLabel="StitchFlow Production Intelligence"
        />
      </View>
    );
  }

  return (
    <StitchFlowSymbol
      size={size}
      withBackground={withBackground}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  fullWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
