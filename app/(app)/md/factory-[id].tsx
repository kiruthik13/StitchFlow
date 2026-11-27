import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { MetricCard } from '../../../src/design-system/components/MetricCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { FACTORIES } from '../../../src/fixtures/mockData';

interface FactoryHierarchy {
  factory: { id: string; name: string; code: string; location?: string; capacity?: number };
  lines: Array<{ id: string; name: string; code: string; capacity: number; isActive: boolean }>;
}

export default function FactoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const { isDemoMode, user } = useAuthStore();

  const liveQuery = useQuery({
    queryKey: ['md-factory-detail', user?.id, id],
    enabled: !isDemoMode && typeof id === 'string',
    queryFn: () => apiRequest<FactoryHierarchy>(`/factories/${encodeURIComponent(id)}/hierarchy`),
  });

  if (!isDemoMode) {
    const f = liveQuery.data?.factory;
    const lines = liveQuery.data?.lines ?? [];
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader title={f?.name ?? t('production:factoriesAndUnits')} subtitle={f?.location ?? f?.code ?? ''} showBack onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
          {liveQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
          <View style={styles.grid2}>
            <View style={{ flex: 1 }}><MetricCard label={t('production:activeLines')} value={`${lines.filter((l) => l.isActive).length}/${lines.length}`} compact /></View>
            <View style={{ width: spacing[2] }} />
            <View style={{ flex: 1 }}><MetricCard label={t('production:capacity')} value={`${f?.capacity ?? 0}`} compact /></View>
          </View>
          <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
            {lines.map((line) => (
              <AppCard key={line.id} padding={spacing[4]}>
                <View style={styles.rowBetween}>
                  <View>
                    <AppText variant="h4" bold>{line.name}</AppText>
                    <AppText variant="code" color="secondary">{line.code} · {line.capacity}</AppText>
                  </View>
                  <StatusBadge label={line.isActive ? 'ACTIVE' : 'INACTIVE'} variant={line.isActive ? 'success' : 'neutral'} size="sm" />
                </View>
              </AppCard>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const factory = FACTORIES.find((f) => f.id === id) || FACTORIES[0];
  const eff = factory.id === 'factory-a' ? 82 : 68;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={factory.name} subtitle={factory.location} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label={t('production:activeLines')} value={`${factory.activeLines}/${factory.totalLines}`} compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label={t('production:capacity')} value={`${factory.capacity}`} compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label={t('production:overallEfficiency')} value={`${eff}%`} variant={eff >= 80 ? 'success' : 'warning'} compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label={t('common:efficiency')} value="94%" variant="brand" compact /></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  grid2: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
