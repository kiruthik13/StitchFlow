import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import {
  DetailField,
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatDateOnly, formatQuantity } from '../../../src/utils/formatters';

const DEMO_BOTTLENECKS = [
  {
    id: 'bn-1',
    stage: 'Ironing & Thread Trimming',
    lineName: 'Factory A (Line 1)',
    jobCode: 'JOB-1001',
    piledPieces: 240,
    reworkBacklog: 0,
    paceGapPerHr: 0,
    severity: 'critical' as const,
    rootCause: 'Single operator bottleneck on manual steam press station.',
    recommendation: 'Reassign 1 reserve helper from cutting bay to pre-trim threads.',
  },
  {
    id: 'bn-2',
    stage: 'Front Placket Stitching',
    lineName: 'Factory B (Line 2)',
    jobCode: 'JOB-1003',
    piledPieces: 160,
    reworkBacklog: 15,
    paceGapPerHr: 0,
    severity: 'critical' as const,
    rootCause: 'Dense knit jersey fabric needle slippage.',
    recommendation: 'Switch needle to ball-point gauge 11/75.',
  },
];

interface LiveBottleneck {
  id: string;
  stage: string;
  lineName: string;
  jobCode: string;
  piledPieces: number;
  reworkBacklog: number;
  paceGapPerHr?: number;
  severity: 'critical' | 'warning';
  rootCause: string;
  recommendation: string;
}

interface DeliveryPrediction {
  jobId: string;
  jobCode: string;
  dailyCapacity: number;
  effectiveLoad: number;
  workingDaysNeeded: number;
  predictedDate: string;
  targetDate: string;
  daysDelta: number;
  riskLevel: 'on-track' | 'at-risk' | 'delayed';
}

export default function BottleneckAnalyticsScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;

  const bottlenecksQuery = useQuery({
    queryKey: ['planning-bottlenecks', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    queryFn: () => apiRequest<LiveBottleneck[]>(`/planning/bottlenecks?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const predictionsQuery = useQuery({
    queryKey: ['planning-predictions', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    queryFn: () => apiRequest<DeliveryPrediction[]>(`/planning/delivery-predictions?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const items = isDemoMode ? DEMO_BOTTLENECKS : (bottlenecksQuery.data ?? []);
  const criticalCount = items.filter((b) => b.severity === 'critical').length;
  const totalPiledWip = items.reduce((sum, b) => sum + Number(b.piledPieces || 0), 0);
  const totalRework = items.reduce((sum, b) => sum + Number(b.reworkBacklog || 0), 0);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('production:bottleneckAnalytics')}
        subtitle={t('production:manufacturingGroupSummary')}
        showBack
        onBack={() => router.back()}
        rightEl={
          !isDemoMode ? (
            <AppButton
              title={t('common:refresh')}
              size="sm"
              variant="outline"
              loading={bottlenecksQuery.isRefetching}
              onPress={() => {
                void bottlenecksQuery.refetch();
                void predictionsQuery.refetch();
              }}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <SummaryStrip
          style={{ marginBottom: spacing[3] }}
          metrics={[
            { label: t('production:bottleneckAnalytics'), value: items.length, tone: items.length > 0 ? 'danger' : 'success' },
            { label: 'Critical', value: criticalCount, tone: criticalCount > 0 ? 'danger' : 'default' },
            { label: 'WIP Queued', value: formatQuantity(totalPiledWip), tone: 'brand' },
            { label: 'Pending Rework', value: formatQuantity(totalRework), tone: totalRework > 0 ? 'warning' : 'default' },
          ]}
        />

        {!isDemoMode && bottlenecksQuery.isLoading && <AppText>{t('common:loading')}</AppText>}

        {!bottlenecksQuery.isLoading && items.length === 0 && (
          <EmptyState
            title="No Active Bottlenecks"
            message="All production stages, rework queues, and station paces are running within target thresholds."
          />
        )}

        {items.length > 0 && <SectionHeader title={t('production:bottleneckAnalytics')} count={items.length} />}

        <View style={{ gap: spacing[3] }}>
          {items.map((b) => {
            const fields: DetailField[] = [
              { label: t('common:line'), value: b.lineName },
              { label: t('common:job'), value: b.jobCode, mono: true },
              { label: 'WIP Queued', value: formatQuantity(b.piledPieces), mono: true, tone: b.piledPieces > 0 ? 'danger' : 'default' },
              {
                label: (b.paceGapPerHr ?? 0) > 0 ? 'Pace Gap' : 'Pending Rework',
                value: (b.paceGapPerHr ?? 0) > 0 ? `-${b.paceGapPerHr} pcs/hr` : formatQuantity(b.reworkBacklog),
                mono: true,
                tone: (b.paceGapPerHr ?? 0) > 0 || b.reworkBacklog > 0 ? 'warning' : 'default',
              },
            ];

            return (
              <StructuredRecordCard
                key={b.id}
                title={b.stage}
                subtitle={b.lineName}
                status={{
                  label: b.severity.toUpperCase(),
                  variant: b.severity === 'critical' ? 'danger' : 'warning',
                  dot: true,
                }}
                fields={fields}
                highlight={{
                  label: 'Root Cause & Action',
                  value: `${b.rootCause} ${b.recommendation}`,
                  tone: b.severity === 'critical' ? 'danger' : 'warning',
                }}
              >
                <AppButton
                  title={t('production:rebalanceStation')}
                  size="sm"
                  onPress={() => Alert.alert(b.stage, b.recommendation)}
                />
              </StructuredRecordCard>
            );
          })}
        </View>

        {!isDemoMode && predictionsQuery.data && predictionsQuery.data.length > 0 && (
          <View style={{ marginTop: spacing[4], gap: spacing[2.5] }}>
            <SectionHeader title="Calendar Delivery Predictions" count={predictionsQuery.data.length} />
            {predictionsQuery.data.map((p) => (
              <StructuredRecordCard
                key={p.jobId}
                code={p.jobCode}
                title={`Predicted: ${formatDateOnly(p.predictedDate)}`}
                status={{
                  label: p.riskLevel.toUpperCase(),
                  variant: p.riskLevel === 'delayed' ? 'danger' : p.riskLevel === 'at-risk' ? 'warning' : 'success',
                  dot: true,
                }}
                fields={[
                  { label: 'Target Date', value: formatDateOnly(p.targetDate) },
                  { label: 'Daily Capacity', value: `${p.dailyCapacity} pcs/day`, mono: true },
                  { label: 'Remaining Load', value: formatQuantity(p.effectiveLoad), mono: true },
                  {
                    label: 'Schedule Delta',
                    value: `${p.daysDelta > 0 ? '+' : ''}${p.daysDelta} days`,
                    mono: true,
                    tone: p.daysDelta > 0 ? 'danger' : 'success',
                  },
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
});
