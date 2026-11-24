import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { useThemeStore } from '../../../store/themeStore';
import { radii } from '../../tokens/radii';

export interface StitchFlowLogoProps {
  size?: number;
  color?: string;
  accentColor?: string;
  withBackground?: boolean;
}

export function StitchFlowLogo({
  size = 36,
  color,
  accentColor,
  withBackground = false,
}: StitchFlowLogoProps) {
  const { tokens, mode } = useThemeStore();

  const primaryColor =
    color || (mode === 'dark' ? tokens.signatureLime : tokens.brand);
  const stitchAccent = accentColor || tokens.signatureLime;
  const bgColor = mode === 'dark' ? tokens.surface : '#E6F7AD';

  const svgContent = (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Garment Seam Inspired Geometric Stitch S */}
      {/* Top horizontal stitch with rounded terminal */}
      <Path
        d="M14 12H34C37.3137 12 40 14.6863 40 18C40 21.3137 37.3137 24 34 24H20C16.6863 24 14 26.6863 14 30C14 33.3137 16.6863 36 20 36H34"
        stroke={primaryColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diagonal needle-thread cross stitch accent */}
      <Path
        d="M28 8L36 16"
        stroke={stitchAccent}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Path
        d="M12 32L20 40"
        stroke={stitchAccent}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Center thread lock dot */}
      <Circle cx="24" cy="24" r="2.5" fill={primaryColor} />
    </Svg>
  );

  if (withBackground) {
    const containerSize = size * 1.35;
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: radii.xl,
            backgroundColor: bgColor,
            borderColor: tokens.border,
            borderWidth: 1,
          },
        ]}
      >
        {svgContent}
      </View>
    );
  }

  return svgContent;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
