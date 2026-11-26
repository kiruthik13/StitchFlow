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
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_BOTTLENECKS = [
  {
    id: 'bn-1',
    stage: 'Ironing & Thread Trimming',
    lineName: 'Factory A (Line 1)',
    jobCode: 'JOB-1001',
    piledPieces: 240,
    reworkBacklog: 0,
    severity: 'critical',
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
    severity: 'critical',
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
    queryFn: () => apiRequest<LiveBottleneck[]>(`/planning/bottlenecks?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const predictionsQuery = useQuery({
    queryKey: ['planning-predictions', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<DeliveryPrediction[]>(`/planning/delivery-predictions?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const items = isDemoMode ? DEMO_BOTTLENECKS : (bottlenecksQuery.data ?? []);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:bottleneckAnalytics')} subtitle={t('production:manufacturingGroupSummary')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={[styles.alertBanner, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
          <AppText variant="h4" bold style={{ color: tokens.danger }}>
            {t('production:bottleneckAnalytics')} ({items.length})
          </AppText>
        </View>

        {!isDemoMode && bottlenecksQuery.isLoading && <AppText>{t('common:loading')}</AppText>}

        {items.map((b) => (
          <AppCard key={b.id} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="h4" bold>{b.stage}</AppText>
                <AppText variant="caption" color="secondary">{b.lineName} · {b.jobCode}</AppText>
              </View>
              <StatusBadge label={b.severity.toUpperCase()} variant={b.severity === 'critical' ? 'danger' : 'warning'} size="sm" />
            </View>

            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="secondary">WIP</AppText>
                <AppText variant="label" bold style={{ color: tokens.danger }}>{b.piledPieces}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="secondary">Rework</AppText>
                <AppText variant="label" bold style={{ color: tokens.warning }}>{b.reworkBacklog}</AppText>
              </View>
            </View>

            <View style={[styles.recBox, { backgroundColor: tokens.surfaceSecondary }]}>
              <AppText variant="bodySmall">{b.rootCause}</AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>{b.recommendation}</AppText>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <AppButton
                title={t('production:rebalanceStation')}
                size="sm"
                onPress={() => Alert.alert(b.stage, b.recommendation)}
              />
            </View>
          </AppCard>
        ))}

        {!isDemoMode && predictionsQuery.data && predictionsQuery.data.length > 0 && (
          <View style={{ marginTop: spacing[2], gap: spacing[2] }}>
            <AppText variant="caption" color="secondary" uppercase>Calendar Delivery Predictions</AppText>
            {predictionsQuery.data.map((p) => (
              <AppCard key={p.jobId} padding={spacing[3]}>
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="code" mono bold>{p.jobCode}</AppText>
                    <AppText variant="caption" color="secondary">
                      {`Pred: ${p.predictedDate} · Target: ${p.targetDate} · ${p.dailyCapacity}/day`}
                    </AppText>
                  </View>
                  <StatusBadge
                    label={p.riskLevel.toUpperCase()}
                    variant={p.riskLevel === 'delayed' ? 'danger' : p.riskLevel === 'at-risk' ? 'warning' : 'success'}
                    size="sm"
                  />
                </View>
              </AppCard>
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
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: spacing[4], marginBottom: spacing[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', marginTop: spacing[3], marginBottom: spacing[3] },
  recBox: { borderRadius: 8, padding: spacing[3] },
});
