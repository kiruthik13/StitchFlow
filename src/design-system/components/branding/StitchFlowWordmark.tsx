import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import { AppText } from '../AppText';

export interface StitchFlowWordmarkProps {
  fontSize?: number;
  color?: string;
  showTagline?: boolean;
  style?: ViewStyle;
}

/**
 * Official StitchFlow wordmark ("Stitch" in deep navy / crisp white + "Flow" in Corporate Blue)
 * with optional "PRODUCTION INTELLIGENCE" tagline (no colored bars below).
 */
export function StitchFlowWordmark({
  fontSize = 20,
  color,
  showTagline = false,
  style,
}: StitchFlowWordmarkProps) {
  const { tokens, mode } = useThemeStore();
  const stitchColor = color || (mode === 'dark' ? tokens.textPrimary : '#0C234B');
  const flowColor = mode === 'dark' ? tokens.brand : '#0B5EC7';

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <AppText
          bold
          style={[
            styles.text,
            {
              fontSize,
              color: stitchColor,
              lineHeight: Math.round(fontSize * 1.2),
              includeFontPadding: false,
            },
          ]}
        >
          Stitch
          <AppText bold style={{ color: flowColor, fontStyle: 'italic' }}>
            Flow
          </AppText>
        </AppText>
        <AppText
          style={{
            fontSize: Math.max(8, Math.round(fontSize * 0.34)),
            lineHeight: Math.max(10, Math.round(fontSize * 0.4)),
            fontWeight: '700',
            color: stitchColor,
            marginLeft: 2,
            marginTop: 1,
            includeFontPadding: false,
          }}
        >
          TM
        </AppText>
      </View>

      {showTagline && (
        <AppText
          style={[
            styles.tagline,
            {
              color: tokens.textSecondary,
              fontSize: Math.max(8.5, Math.round(fontSize * 0.36)),
              lineHeight: Math.max(12, Math.round(fontSize * 0.48)),
              includeFontPadding: false,
            },
          ]}
        >
          PRODUCTION INTELLIGENCE
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    letterSpacing: -0.5,
    fontStyle: 'italic',
    fontFamily: 'sans-serif-bold',
  },
  tagline: {
    fontWeight: '600',
    letterSpacing: 1.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
