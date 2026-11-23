import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

interface AppCardProps extends ViewProps {
  padding?: number;
  noBorder?: boolean;
  noBackground?: boolean;
}

export function AppCard({
  children,
  padding = spacing[4],
  noBorder = false,
  noBackground = false,
  style,
  ...props
}: AppCardProps) {
  const { tokens } = useThemeStore();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: noBackground ? 'transparent' : tokens.surface,
          borderColor: noBorder ? 'transparent' : tokens.border,
          borderWidth: noBorder ? 0 : 1,
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
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});
