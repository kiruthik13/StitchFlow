import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardCheck,
  Factory,
  Package,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react-native';
import { useThemeStore } from '../../../store/themeStore';
import { NotificationCategory, useNotificationStore } from '../../../store/notificationStore';
import { AppText } from '../AppText';
import { StatusBadge } from '../StatusBadge';
import { spacing } from '../../tokens/spacing';
import { radii } from '../../tokens/radii';
import { navigateFromNotification } from '../../../services/notifications/pushService';

function getBannerIcon(category: NotificationCategory | undefined, color: string) {
  switch (category) {
    case 'quality':
      return <ClipboardCheck size={16} color={color} strokeWidth={2.2} />;
    case 'packing_dispatch':
      return <Package size={16} color={color} strokeWidth={2.2} />;
    case 'intelligence':
      return <AlertTriangle size={16} color={color} strokeWidth={2.2} />;
    case 'production':
      return <Wrench size={16} color={color} strokeWidth={2.2} />;
    case 'inventory':
      return <Factory size={16} color={color} strokeWidth={2.2} />;
    case 'admin':
      return <ShieldAlert size={16} color={color} strokeWidth={2.2} />;
    default:
      return <Bell size={16} color={color} strokeWidth={2.2} />;
  }
}

export function ForegroundNotificationBanner() {
  const { tokens } = useThemeStore();
  const banner = useNotificationStore((s) => s.banner);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation(['notifications', 'common']);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => dismissBanner(), 5000);
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

  const badgeVariant =
    banner.priority === 'CRITICAL'
      ? 'danger'
      : banner.priority === 'WARNING'
        ? 'warning'
        : banner.priority === 'SUCCESS'
          ? 'success'
          : 'brand';

  const title = t(banner.titleKey, {
    defaultValue: banner.titleKey.split('.').slice(-2, -1)[0]?.replace(/_/g, ' ') ?? 'StitchFlow Update',
    ...(banner.messageParameters ?? {}),
  });
  const message = t(banner.messageKey, {
    defaultValue: banner.messageKey,
    ...(banner.messageParameters ?? {}),
  });
  const categoryLabel = banner.category
    ? t(`notifications:categories.${banner.category}`, { defaultValue: banner.category.replace('_', ' ') })
    : 'StitchFlow';

  return (
    <View style={[styles.wrap, { top: insets.top + spacing[2] }]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.92}
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
            shadowColor: tokens.textPrimary,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: tokens.surfaceSecondary }]}>
          {getBannerIcon(banner.category, accent)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.topMetaRow}>
            <AppText variant="caption" bold style={{ color: accent }} numberOfLines={1}>
              {categoryLabel.toUpperCase()}
            </AppText>
            <StatusBadge label={banner.priority} variant={badgeVariant} size="sm" />
          </View>
          <AppText variant="label" bold numberOfLines={1} style={{ color: tokens.textPrimary, marginTop: 2 }}>
            {title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {message}
          </AppText>
          {!!banner.actionRoute && (
            <View style={styles.tapHint}>
              <AppText variant="caption" bold style={{ color: tokens.brand }}>
                {t('common:details')}
              </AppText>
              <ArrowRight size={12} color={tokens.brand} />
            </View>
          )}
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
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.card,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[1],
  },
  closeBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
