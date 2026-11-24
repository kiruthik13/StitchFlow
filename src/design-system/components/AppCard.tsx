import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { shadows } from '../tokens/shadows';

export interface AppCardProps extends ViewProps {
  children?: React.ReactNode;
  padding?: number;
  noBorder?: boolean;
  noBackground?: boolean;
  variant?: 'default' | 'hero' | 'secondary' | 'elevated' | 'lime';
}

export function AppCard({
  children,
  padding = spacing[4],
  noBorder = false,
  noBackground = false,
  variant = 'default',
  style,
  ...props
}: AppCardProps) {
  const { tokens, mode } = useThemeStore();

  const getBackgroundColor = () => {
    if (noBackground) return 'transparent';
    switch (variant) {
      case 'secondary':
        return tokens.surfaceSecondary;
      case 'elevated':
        return tokens.surfaceElevated || tokens.surface;
      case 'lime':
        return tokens.signatureLime;
      default:
        return tokens.surface;
    }
  };

  const borderRadius = variant === 'hero' ? radii.hero : radii.card;

  return (
    <View
      style={[
        styles.card,
        shadows.xs,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: noBorder || variant === 'lime' ? 'transparent' : tokens.border,
          borderWidth: noBorder ? 0 : 1,
          borderRadius,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
