import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../services/api/apiClient';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { EmptyState } from '../../design-system/components/EmptyState';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';

const STAGE_SAM_STATS = [
  { stage: 'Cutting', targetSam: 4.5, actualSam: 4.2, eff: 107, buffer: '80 pcs', status: 'optimal' },
  { stage: 'Sewing Out', targetSam: 12.0, actualSam: 13.8, eff: 87, buffer: '180 pcs', status: 'normal' },
  { stage: 'Kaja / Button', targetSam: 2.5, actualSam: 2.4, eff: 104, buffer: '60 pcs', status: 'optimal' },
  { stage: 'Ironing', targetSam: 3.2, actualSam: 4.9, eff: 65, buffer: '240 pcs', status: 'bottleneck' },
  { stage: 'QC Gate', targetSam: 1.8, actualSam: 1.9, eff: 95, buffer: '40 pcs', status: 'normal' },
  { stage: 'Packing', targetSam: 2.0, actualSam: 1.9, eff: 105, buffer: '24 pcs', status: 'optimal' },
];

interface LiveSamPlan {
  id: string;
  styleName: string;
  styleCode: string;
  totalSam: number;
  targetPcsPerHour: number;
}

interface LiveBottleneck {
  id: string;
  stage: string;
  lineName: string;
  rootCause: string;
  severity: string;
}

export function SamMonitorView() {
  const { tokens } = useThemeStore();
  const { t } = useTranslation(['production', 'common']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;

  const samQuery = useQuery({
    queryKey: ['monitor-sam', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveSamPlan[]>(`/planning/sam?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const bottlenecksQuery = useQuery({
    queryKey: ['monitor-bottlenecks', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveBottleneck[]>(`/planning/bottlenecks?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  if (!isDemoMode) {
    const samPlans = samQuery.data ?? [];
    const bottlenecks = bottlenecksQuery.data ?? [];
    const avgTargetPace = samPlans.length
      ? Math.round(samPlans.reduce((sum, s) => sum + Number(s.targetPcsPerHour || 0), 0) / samPlans.length)
      : 0;

    return (
      <ScrollView contentContainerStyle={[styles.scroll, { gap: spacing[3] }]}>
        <SummaryStrip
          metrics={[
            { label: t('production:samPlan'), value: samPlans.length, tone: 'brand' },
            { label: 'Bottlenecks', value: bottlenecks.length, tone: bottlenecks.length > 0 ? 'danger' : 'success' },
            { label: 'Avg 100% Target', value: `${avgTargetPace} pcs/hr`, tone: 'default' },
          ]}
        />

        {bottlenecks.length > 0 && (
          <>
            <SectionHeader title="Active Line Bottlenecks" count={bottlenecks.length} />
            {bottlenecks.slice(0, 3).map((b) => (
              <StructuredRecordCard
                key={b.id}
                title={b.stage}
                subtitle={b.lineName}
                status={{
                  label: (b.severity || 'warning').toUpperCase(),
                  variant: b.severity === 'critical' ? 'danger' : 'warning',
                  dot: true,
                }}
                fields={[{ label: t('common:line'), value: b.lineName, fullWidth: true }]}
                highlight={{ label: 'Root Cause', value: b.rootCause, tone: b.severity === 'critical' ? 'danger' : 'warning' }}
              />
            ))}
          </>
        )}

        <SectionHeader title={t('production:samPlan')} count={samPlans.length} />
        {samQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {!samQuery.isLoading && samPlans.length === 0 && (
          <EmptyState title={t('common:noData')} message="No SAM plans configured for this factory yet." />
        )}
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
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.alertBanner, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
        <AppText variant="h4" bold style={{ color: tokens.danger }}>Ironing Station</AppText>
        <AppText variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
          4.9 SAM vs 3.2 SAM (+53%) · 240 pcs
        </AppText>
      </View>

      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        {t('production:samMonitor')}
      </AppText>

      {STAGE_SAM_STATS.map((item, idx) => (
        <AppCard key={idx} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText variant="h4" bold>{item.stage}</AppText>
              <AppText variant="caption" color="secondary">{item.buffer}</AppText>
            </View>
            <StatusBadge
              label={item.status.toUpperCase()}
              variant={item.status === 'bottleneck' ? 'danger' : item.status === 'optimal' ? 'success' : 'neutral'}
              size="sm"
            />
          </View>

          <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Target</AppText><AppText variant="label" bold>{item.targetSam}m</AppText></View>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Actual</AppText><AppText variant="label" bold style={{ color: item.status === 'bottleneck' ? tokens.danger : tokens.textPrimary }}>{item.actualSam}m</AppText></View>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Eff.</AppText><AppText variant="label" bold style={{ color: item.eff >= 100 ? tokens.success : item.eff >= 80 ? tokens.warning : tokens.danger }}>{item.eff}%</AppText></View>
          </View>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: spacing[4], marginBottom: spacing[3] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row' },
});
