import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useThemeStore } from '../../store/themeStore';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Base screen container enforcing Atelier Industrial canvas background
 * and consistent flex structure without duplicating safe-area boilerplate.
 */
export function ScreenLayout({ children, header, style }: ScreenLayoutProps) {
  const { tokens } = useThemeStore();

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }, style]}>
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
