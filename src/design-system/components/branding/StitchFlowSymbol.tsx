import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import { radii } from '../../tokens/radii';

const SYMBOL_ASSET = require('../../../../assets/branding/stitchflow-symbol.png');

export interface StitchFlowSymbolProps {
  size?: number;
  withBackground?: boolean;
  style?: ViewStyle;
}

/**
 * Official standalone StitchFlow brand symbol (S-shaped stitched ribbon,
 * red/amber/green production bars, silver folds, and upward blue growth arrow).
 */
export function StitchFlowSymbol({
  size = 36,
  withBackground = false,
  style,
}: StitchFlowSymbolProps) {
  const { tokens, mode } = useThemeStore();

  const image = (
    <Image
      source={SYMBOL_ASSET}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="StitchFlow brand symbol"
    />
  );

  if (withBackground) {
    const containerSize = Math.round(size * 1.38);
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: radii.xl,
            backgroundColor: mode === 'dark' ? tokens.surfaceSecondary : '#FFFFFF',
            borderColor: tokens.border,
            borderWidth: 1,
          },
          style,
        ]}
      >
        {image}
      </View>
    );
  }

  return <View style={style}>{image}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
