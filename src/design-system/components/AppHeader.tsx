import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  rightEl?: React.ReactNode;
  compact?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  rightEl,
  compact = false,
}: AppHeaderProps) {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const right = rightAction || rightEl;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.border,
          paddingTop: insets.top + (compact ? spacing[2] : spacing[3]),
          paddingBottom: compact ? spacing[2] : spacing[3],
        },
      ]}
    >
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <AppText variant="h3" color="brand">←</AppText>
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <AppText variant={compact ? 'h4' : 'h3'} color="primary">
            {title}
          </AppText>
          {subtitle && <AppText variant="caption" color="secondary">{subtitle}</AppText>}
        </View>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: spacing[3],
    padding: spacing[1],
  },
  titleBlock: {
    flex: 1,
  },
  right: {
    marginLeft: spacing[2],
  },
});
