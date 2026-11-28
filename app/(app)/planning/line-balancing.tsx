import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

interface LineBalanceResponse {
  lines: Array<{
    lineId: string;
    lineName: string;
    effectiveOperators: number;
    effectiveCapacity: number;
    loadPercent: number;
    status: 'overloaded' | 'balanced' | 'spare_capacity';
  }>;
  recommendations: Array<{
    fromLineName: string;
    toLineName: string | null;
    reason: string;
  }>;
}

export default function LineBalancingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['line-balancing', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<LineBalanceResponse>(`/planning/line-balancing?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:lineBalancing', { defaultValue: 'Intelligent Line Balancing' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        {isDemoMode || !query.data ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <>
            {query.data.lines.map((line) => (
              <AppCard key={line.lineId} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
                <View style={styles.row}>
                  <AppText variant="label" bold>{line.lineName}</AppText>
                  <StatusBadge
                    label={`${line.loadPercent}%`}
                    variant={line.status === 'overloaded' ? 'danger' : line.status === 'spare_capacity' ? 'info' : 'success'}
                    size="sm"
                  />
                </View>
                <AppText variant="bodySmall" color="secondary">
                  {`Operators: ${line.effectiveOperators} · Effective Cap: ${line.effectiveCapacity} pcs`}
                </AppText>
              </AppCard>
            ))}
            {query.data.recommendations.map((rec, idx) => (
              <AppCard key={idx} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
                <AppText variant="label" bold>{t('production:recommendation', { defaultValue: 'Recommendation' })}</AppText>
                <AppText variant="bodySmall" color="secondary">{rec.reason}</AppText>
              </AppCard>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
});
