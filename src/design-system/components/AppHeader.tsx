import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ArrowLeft, Bell } from 'lucide-react-native';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  rightEl?: React.ReactNode;
  compact?: boolean;
  showNotification?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  rightEl,
  compact = false,
  showNotification = false,
  unreadCount = 0,
  onNotificationPress,
}: AppHeaderProps) {
  const { tokens, mode } = useThemeStore();
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
          paddingBottom: compact ? spacing[2.5] : spacing[3.5],
        },
      ]}
    >
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={[styles.backBtn, { backgroundColor: tokens.surfaceSecondary }]}
          >
            <ArrowLeft size={18} color={tokens.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <AppText
            variant={compact ? 'h4' : 'h3'}
            color="primary"
            bold
            numberOfLines={1}
            style={{ letterSpacing: -0.3 }}
          >
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
        </View>

        {showNotification && (
          <TouchableOpacity
            onPress={onNotificationPress}
            activeOpacity={0.7}
            style={[styles.iconBtn, { backgroundColor: tokens.surfaceSecondary }]}
          >
            <Bell size={18} color={tokens.textPrimary} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: tokens.signatureLime }]} />
            )}
          </TouchableOpacity>
        )}

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
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  titleBlock: {
    flex: 1,
  },
  right: {
    marginLeft: spacing[2],
  },
});
