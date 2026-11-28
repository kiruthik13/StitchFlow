import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { masterRepository } from '../../../src/services/repositories/masterRepository';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { FactorySelector } from '../../../src/design-system/components/dashboard';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_SAM_BENCHMARKS = [
  { style: 'Polo T-Shirt (PTS-001)', targetSam: 14.5, actualSam: 15.2, eff: 95, factory: 'Factory A' },
  { style: 'Chino Trousers (CT-002)', targetSam: 22.3, actualSam: 24.8, eff: 90, factory: 'Factory A' },
];

interface LiveSamPlan {
  id: string;
  styleName: string;
  styleCode: string;
  totalSam: number;
  targetPcsPerHour: number;
}

export default function SamEfficiencyScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const { isDemoMode, user } = useAuthStore();

  const factoriesQuery = useQuery({
    queryKey: ['md-sam-factories', user?.id],
    enabled: !isDemoMode && !!user,
    queryFn: () => masterRepository.getFactories(),
  });

  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const activeFactoryId = selectedFactory || user?.factoryId || factoriesQuery.data?.[0]?.id || '';

  const samQuery = useQuery({
    queryKey: ['md-sam-plans', user?.id, activeFactoryId],
    enabled: !isDemoMode && !!activeFactoryId,
    queryFn: () => apiRequest<LiveSamPlan[]>(`/planning/sam?factoryId=${encodeURIComponent(activeFactoryId)}`),
  });

  const samPlans = samQuery.data ?? [];
  const avgSam = samPlans.length
    ? (samPlans.reduce((sum, s) => sum + Number(s.totalSam || 0), 0) / samPlans.length).toFixed(1)
    : '0.0';
  const avgTarget = samPlans.length
    ? Math.round(samPlans.reduce((sum, s) => sum + Number(s.targetPcsPerHour || 0), 0) / samPlans.length)
    : 0;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('production:samEfficiency')}
        subtitle={t('production:executiveAnalytics')}
        showBack
        onBack={() => router.back()}
        rightEl={
          !isDemoMode ? (
            <AppButton
              title={t('common:refresh')}
              size="sm"
              variant="outline"
              loading={samQuery.isRefetching}
              onPress={() => void samQuery.refetch()}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
        {isDemoMode ? (
          <>
            <SummaryStrip
              metrics={[
                { label: t('production:samPlan'), value: DEMO_SAM_BENCHMARKS.length, tone: 'brand' },
                { label: 'Avg Efficiency', value: '93%', tone: 'success' },
              ]}
            />
            {DEMO_SAM_BENCHMARKS.map((item, idx) => (
              <StructuredRecordCard
                key={idx}
                title={item.style}
                subtitle={item.factory}
                status={{ label: `${item.eff}% EFF`, variant: item.eff >= 90 ? 'success' : 'warning', dot: true }}
                fields={[
                  { label: 'Target SAM', value: `${item.targetSam} min`, mono: true },
                  { label: 'Actual SAM', value: `${item.actualSam} min`, mono: true },
                ]}
              />
            ))}
          </>
        ) : (
          <>
            {factoriesQuery.data && factoriesQuery.data.length > 1 && (
              <FactorySelector
                items={factoriesQuery.data.map((f) => ({ id: f.id, label: f.name }))}
                selectedId={activeFactoryId}
                onSelect={setSelectedFactory}
              />
            )}

            <SummaryStrip
              metrics={[
                { label: t('production:samPlan'), value: samPlans.length, tone: 'brand' },
                { label: 'Avg SAM', value: `${avgSam} min`, tone: 'default' },
                { label: 'Avg 100% Pace', value: `${avgTarget} pcs/hr`, tone: 'brand' },
                { label: '85% Floor Target', value: `${Math.round(avgTarget * 0.85)} pcs/hr`, tone: 'success' },
              ]}
            />

            {samQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!samQuery.isLoading && samPlans.length === 0 && (
              <EmptyState title={t('common:noData')} message="No SAM efficiency plans configured for this factory." />
            )}

            {samPlans.length > 0 && <SectionHeader title={t('production:samPlan')} count={samPlans.length} />}
            {samPlans.map((item) => {
              const target85 = Math.round(Number(item.targetPcsPerHour || 0) * 0.85);
              return (
                <StructuredRecordCard
                  key={item.id}
                  code={item.styleCode}
                  title={item.styleName}
                  status={{ label: `${item.totalSam} SAM`, variant: 'brand', dot: true }}
                  fields={[
                    { label: 'Total SAM', value: `${item.totalSam} min`, mono: true },
                    { label: '100% Target', value: `${item.targetPcsPerHour} pcs/hr`, mono: true, tone: 'brand' },
                    { label: '85% Floor Target', value: `${target85} pcs/hr`, mono: true, tone: 'success' },
                    { label: 'Cycle Time', value: `${item.totalSam} min/pc`, mono: true },
                  ]}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
});
