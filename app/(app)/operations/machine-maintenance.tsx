import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppText } from '../../../src/design-system/components/AppText';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface MachineRow {
  lineId: string;
  lineName: string;
  status: 'Available' | 'Stopped';
  openIssues: number;
  resolvedIssues: number;
  totalDowntimeHours: number;
  mttrHours: number | null;
}

export default function MachineMaintenanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['machine-maintenance', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<{ machines: MachineRow[] }>(`/analytics/machines?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:machineMaintenance', { defaultValue: 'Machine Maintenance' })} showBack onBack={() => router.back()} />
      <FlatList
        data={isDemoMode ? [] : (query.data?.machines ?? [])}
        keyExtractor={(item) => item.lineId}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        ListEmptyComponent={<EmptyState title={t('common:noData')} />}
        renderItem={({ item }) => (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.row}>
              <AppText variant="label" bold>{item.lineName}</AppText>
              <StatusBadge label={item.status.toUpperCase()} variant={item.status === 'Stopped' ? 'danger' : 'success'} size="sm" />
            </View>
            <AppText variant="bodySmall" color="secondary">
              {`Open: ${item.openIssues} · Resolved: ${item.resolvedIssues} · Downtime: ${item.totalDowntimeHours}h`}
            </AppText>
          </AppCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
});
