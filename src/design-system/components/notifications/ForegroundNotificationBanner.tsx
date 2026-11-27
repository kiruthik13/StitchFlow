import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react-native';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { AppText } from '../AppText';
import { spacing } from '../../tokens/spacing';
import { radii } from '../../tokens/radii';
import { navigateFromNotification } from '../../../services/notifications/pushService';

export function ForegroundNotificationBanner() {
  const { tokens } = useThemeStore();
  const banner = useNotificationStore((s) => s.banner);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation(['notifications', 'common']);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => dismissBanner(), 4500);
    return () => clearTimeout(timer);
  }, [banner, dismissBanner]);

  if (!banner) return null;

  const accent =
    banner.priority === 'CRITICAL'
      ? tokens.danger
      : banner.priority === 'WARNING'
        ? tokens.warning
        : banner.priority === 'SUCCESS'
          ? tokens.success
          : tokens.brand;

  const title = t(banner.titleKey, {
    defaultValue: banner.titleKey.split('.').slice(-2, -1)[0]?.replace(/_/g, ' ') ?? 'StitchFlow',
    ...(banner.messageParameters ?? {}),
  });
  const message = t(banner.messageKey, {
    defaultValue: banner.messageKey,
    ...(banner.messageParameters ?? {}),
  });

  return (
    <View style={[styles.wrap, { top: insets.top + spacing[2] }]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          dismissBanner();
          navigateFromNotification(router, banner.actionRoute, banner.actionParameters);
        }}
        style={[
          styles.card,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.borderStrong,
            borderLeftColor: accent,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: tokens.brandLight }]}>
          <Bell size={16} color={accent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" bold numberOfLines={1} style={{ color: tokens.textPrimary }}>
            {title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={2}>
            {message}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <X size={16} color={tokens.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.card,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
