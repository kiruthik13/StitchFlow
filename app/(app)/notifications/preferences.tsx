import React from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { NotificationCategory } from '../../../src/store/notificationStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppText } from '../../../src/design-system/components/AppText';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface PrefRow {
  category: NotificationCategory;
  inAppEnabled: boolean;
  pushEnabled: boolean;
}

const DEFAULT_PREFS: PrefRow[] = [
  { category: 'work_orders', inAppEnabled: true, pushEnabled: true },
  { category: 'production', inAppEnabled: true, pushEnabled: true },
  { category: 'quality', inAppEnabled: true, pushEnabled: true },
  { category: 'inventory', inAppEnabled: true, pushEnabled: true },
  { category: 'packing_dispatch', inAppEnabled: true, pushEnabled: true },
  { category: 'intelligence', inAppEnabled: true, pushEnabled: true },
  { category: 'admin', inAppEnabled: true, pushEnabled: true },
];

export default function NotificationPreferencesScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['notifications', 'common']);
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ['notification-preferences', user?.id],
    enabled: !isDemoMode && !!user,
    queryFn: () => apiRequest<PrefRow[]>('/notifications/preferences'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { category: NotificationCategory; inAppEnabled?: boolean; pushEnabled?: boolean }) =>
      apiRequest('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
  });

  const rows = isDemoMode ? DEFAULT_PREFS : (prefsQuery.data ?? DEFAULT_PREFS);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('notifications:preferences', { defaultValue: 'Notification Preferences' })}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}>
        {rows.map((row) => (
          <AppCard key={row.category} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="label" bold style={{ color: tokens.textPrimary, marginBottom: spacing[2] }}>
              {t(`notifications:categories.${row.category}`, { defaultValue: row.category.replace('_', ' ') })}
            </AppText>
            <View style={styles.switchRow}>
              <AppText variant="bodySmall" color="secondary">
                {t('notifications:inAppAlerts', { defaultValue: 'In-App Notifications' })}
              </AppText>
              <Switch
                value={row.inAppEnabled}
                disabled={isDemoMode}
                trackColor={{ true: tokens.brand, false: tokens.borderStrong }}
                onValueChange={(val) => updateMutation.mutate({ category: row.category, inAppEnabled: val })}
              />
            </View>
            <View style={[styles.switchRow, { marginTop: spacing[2] }]}>
              <AppText variant="bodySmall" color="secondary">
                {t('notifications:mobilePushAlerts', { defaultValue: 'Mobile Push Notifications' })}
              </AppText>
              <Switch
                value={row.pushEnabled}
                disabled={isDemoMode}
                trackColor={{ true: tokens.brand, false: tokens.borderStrong }}
                onValueChange={(val) => updateMutation.mutate({ category: row.category, pushEnabled: val })}
              />
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
});
