import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { ScreenLayout } from './ScreenLayout';
import { spacing } from '../tokens/spacing';

export interface StickyActionLayoutProps {
  header?: React.ReactNode;
  stickyFooter: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Scrollable content body paired with a safe-area sticky footer CTA bar.
 */
export function StickyActionLayout({
  header,
  stickyFooter,
  children,
  contentContainerStyle,
}: StickyActionLayoutProps) {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <ScreenLayout header={header}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: spacing[6] },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              paddingBottom: Math.max(insets.bottom, spacing[3]),
            },
          ]}
        >
          {stickyFooter}
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    padding: spacing[4],
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
});
