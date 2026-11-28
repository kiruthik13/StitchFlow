import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatDateTime, formatQuantity } from '../../../src/utils/formatters';

const DEMO_LOGS = [
  { id: 'log-1', cartonCode: 'CTN-10045', job: 'JOB-1001', style: 'Polo T-Shirt', size: 'L', color: 'Navy', qty: 50, packedBy: 'Anitha Raj', time: '11:45 AM' },
  { id: 'log-2', cartonCode: 'CTN-10046', job: 'JOB-1001', style: 'Polo T-Shirt', size: 'M', color: 'White', qty: 50, packedBy: 'Anitha Raj', time: '10:20 AM' },
];

interface LiveCarton {
  id: string;
  barcode: string;
  jobCode?: string;
  styleName?: string;
  size?: string;
  color?: string;
  quantity?: number;
  receivedAt: string | null;
}

export default function PackingHistoryScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;

  const liveCartonsQuery = useQuery({
    queryKey: ['dispatch-cartons', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveCarton[]>(`/packing/cartons?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:packingHistory')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {isDemoMode ? (
          DEMO_LOGS.map((item) => (
            <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{item.cartonCode}</AppText>
                  <AppText variant="bodySmall" bold style={{ marginTop: 2 }}>{item.style} ({item.size}, {item.color})</AppText>
                  <AppText variant="caption" color="secondary">{item.job} · {item.qty}</AppText>
                </View>
                <StatusBadge label="VERIFIED" variant="success" size="sm" />
              </View>
            </AppCard>
          ))
        ) : (
          <View style={{ gap: spacing[2.5] }}>
            {liveCartonsQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!!(liveCartonsQuery.data ?? []).length && (
              <>
                <SummaryStrip
                  metrics={[
                    { label: t('packing:totalCartons'), value: (liveCartonsQuery.data ?? []).length, tone: 'brand' },
                    {
                      label: t('packing:piecesPacked'),
                      value: formatQuantity((liveCartonsQuery.data ?? []).reduce((sum, c) => sum + Number(c.quantity ?? 0), 0)),
                      tone: 'success',
                    },
                  ]}
                />
                <SectionHeader title={t('packing:packingHistory')} count={(liveCartonsQuery.data ?? []).length} />
              </>
            )}
            {(liveCartonsQuery.data ?? []).map((item) => (
              <StructuredRecordCard
                key={item.id}
                code={item.barcode}
                title={item.styleName || item.jobCode || item.barcode}
                status={{
                  label: item.receivedAt ? 'RECEIVED' : 'PACKED',
                  variant: item.receivedAt ? 'success' : 'brand',
                  dot: true,
                }}
                fields={[
                  { label: t('common:job'), value: item.jobCode || '—', mono: true },
                  { label: t('common:quantity'), value: formatQuantity(item.quantity ?? 0), mono: true, tone: 'brand' },
                  { label: t('common:size'), value: item.size || '—' },
                  { label: t('common:color'), value: item.color || '—' },
                  ...(item.receivedAt ? [{ label: t('common:date'), value: formatDateTime(item.receivedAt), fullWidth: true }] : []),
                ]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
