import React from 'react';
import { ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLayout } from './ScreenLayout';
import { spacing } from '../tokens/spacing';

export interface DashboardLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  hasFloatingAction?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Standard role dashboard layout with 16dp horizontal gutters
 * and automatic safe-area / floating-scanner bottom clearance.
 */
export function DashboardLayout({
  header,
  footer,
  children,
  hasFloatingAction = false,
  contentContainerStyle,
}: DashboardLayoutProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (hasFloatingAction ? 100 : spacing[8]);

  return (
    <ScreenLayout header={header}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
});
