import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
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
  unreadCount = 2,
  onNotificationPress,
  rightEl,
}: BrandHeaderProps) {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleNotifPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/(app)/approvals');
    }
  };

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
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {subtitle || `${user?.factoryName ?? 'Factory Unit 1'} · ${user?.role ? user.role.toUpperCase().replace('-', ' ') : 'DEMO'}`}
            </AppText>
            {/* Never display a fake LIVE status when in demo mode (Section 21) */}
            <View style={styles.statusPill}>
              <StatusBadge label="DEMO MODE" variant="brand" size="sm" dot />
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {showNotification && (
            <TouchableOpacity
              onPress={handleNotifPress}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
              style={[styles.iconButton, { backgroundColor: tokens.surfaceSecondary }]}
            >
              <Bell size={18} color={tokens.textPrimary} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: tokens.signatureLime }]} />
              )}
            </TouchableOpacity>
          )}

          {rightEl || (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(app)/(tabs)/settings')}
              style={[styles.avatarCircle, { backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD' }]}
            >
              <AppText
                variant="label"
                bold
                style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep, fontSize: 13 }}
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
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  statusPill: {
    marginLeft: spacing[1],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
