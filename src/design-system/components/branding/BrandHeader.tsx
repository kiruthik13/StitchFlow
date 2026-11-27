import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { BrandMark } from './BrandMark';
import { AppText } from '../AppText';
import { StatusBadge } from '../StatusBadge';
import { spacing } from '../../tokens/spacing';
import { radii } from '../../tokens/radii';
import { Bell } from 'lucide-react-native';

export interface BrandHeaderProps {
  subtitle?: string;
  showNotification?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
  rightEl?: React.ReactNode;
}

export function BrandHeader({
  subtitle,
  showNotification = true,
  unreadCount,
  onNotificationPress,
  rightEl,
}: BrandHeaderProps) {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const storeUnread = useNotificationStore((s) => s.unreadCount);
  const badgeCount = unreadCount ?? storeUnread;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation('common');

  const handleNotifPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/(app)/notifications' as never);
    }
  };

  const roleLabel = user?.role
    ? t(`roles.${user.role}`) || user.role.toUpperCase().replace('-', ' ')
    : t('demoModeBadge');
  const factoryLabel = user?.factoryName ?? 'Factory Unit 1';
  const defaultSubtitle = `${factoryLabel} · ${roleLabel}`;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.border,
          paddingTop: insets.top + spacing[2.5],
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandCol}>
          <BrandMark logoSize={28} fontSize={20} />
          <View style={styles.metaRow}>
            <AppText
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={[styles.subtitleText, { flexShrink: 1 }]}
            >
              {subtitle || defaultSubtitle}
            </AppText>
            {isDemoMode && (
              <View style={styles.statusPill}>
                <StatusBadge label={t('demoModeBadge')} variant="brand" size="sm" dot />
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {showNotification && (
            <TouchableOpacity
              onPress={handleNotifPress}
              activeOpacity={0.7}
              accessibilityLabel={t('notifications')}
              style={[styles.iconButton, { backgroundColor: tokens.surfaceSecondary }]}
            >
              <Bell size={18} color={tokens.textPrimary} strokeWidth={2.2} />
              {badgeCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: tokens.danger }]} />
              )}
            </TouchableOpacity>
          )}

          {rightEl || (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(app)/(tabs)/settings')}
              accessibilityLabel={t('profile')}
              style={[
                styles.avatarCircle,
                { backgroundColor: tokens.brandLight },
              ]}
            >
              <AppText
                variant="label"
                bold
                style={{
                  color: tokens.brand,
                  fontSize: 13,
                }}
              >
                {user?.avatarInitials ?? 'SF'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandCol: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  subtitleText: {
    flexShrink: 1,
  },
  statusPill: {
    flexShrink: 0,
    marginLeft: spacing[1],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing[2],
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
