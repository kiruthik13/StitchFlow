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

interface LotRow {
  materialId: string;
  sku: string;
  name: string;
  baseUnit: string;
  receivedQty: number;
  issuedQty: number;
  jobCode?: string | null;
  lineageStatus: string;
}

export default function FabricTraceabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'inventory']);

  const query = useQuery({
    queryKey: ['fabric-traceability', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<{ lots: LotRow[] }>(`/analytics/fabric-traceability?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('inventory:fabricTraceability', { defaultValue: 'Fabric Lot Traceability' })} showBack onBack={() => router.back()} />
      <FlatList
        data={isDemoMode ? [] : (query.data?.lots ?? [])}
        keyExtractor={(item) => item.materialId}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        ListEmptyComponent={<EmptyState title={t('common:noData')} />}
        renderItem={({ item }) => (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.row}>
              <AppText variant="label" bold mono>{item.sku}</AppText>
              <StatusBadge label={item.lineageStatus.toUpperCase()} variant={item.jobCode ? 'success' : 'warning'} size="sm" />
            </View>
            <AppText variant="bodySmall" color="secondary">
              {`${item.name} · Recv: ${item.receivedQty} ${item.baseUnit} · Issued: ${item.issuedQty} ${item.baseUnit}`}
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
