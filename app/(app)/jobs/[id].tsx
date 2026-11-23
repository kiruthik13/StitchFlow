import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge, jobStatusBadge, bundleStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { PRODUCTION_STAGES } from '../../../src/fixtures/mockData';
import { getPermissions } from '../../../src/core/permissions';
import { Job } from '../../../src/core/types';

type JobAction = 'hold' | 'resume' | 'close' | null;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { jobs, bundles, updateJobStatus } = useDemoStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [pendingAction, setPendingAction] = useState<JobAction>(null);

  const job = jobs.find((j) => j.id === id);
  if (!job) return <EmptyState title="Job not found" message={`ID: ${id}`} />;

  const jobBundles = bundles.filter((b) => b.jobId === id);
  const perms = getPermissions(user?.role ?? 'operator');

  const confirmAction = (action: JobAction) => {
    if (!action) return;
    if (action === 'hold') updateJobStatus(job.id, 'on-hold');
    if (action === 'resume') updateJobStatus(job.id, 'active');
    if (action === 'close') updateJobStatus(job.id, 'closed');
    setPendingAction(null);
  };

  const packingProgress = Math.round((job.packingQty / job.orderQuantity) * 100);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={job.jobCode}
        subtitle={`${job.styleName} · ${job.buyerName}`}
        showBack
        rightEl={<StatusBadge label={job.status.replace('-', ' ').toUpperCase()} variant={jobStatusBadge(job.status)} />}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>

        {/* Summary card */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <Row label="Style" value={job.styleName} />
          <Row label="Buyer" value={job.buyerName} />
          <Row label="Factory" value={job.factoryName} />
          <Row label="Line" value={job.lineName} />
          <Row label="Start Date" value={job.startDate} />
          <Row label="Target Date" value={job.targetDate} />
          <Row label="Colors" value={job.colors.join(', ')} />
          <Row label="Sizes" value={job.sizes.join(', ')} />
          <Row label="SAM" value={`${job.samValue} min`} isLast />
        </AppCard>

        {/* Production metrics */}
        <SectionLabel label="Production Quantities" />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.metricsGrid}>
            <MetricItem label="Order" value={String(job.orderQuantity)} />
            <MetricItem label="Cutting" value={String(job.cuttingQty)} />
            <MetricItem label="Sewing Out" value={String(job.sewingOutQty)} />
            <MetricItem label="Packing" value={String(job.packingQty)} color={tokens.success} />
            <MetricItem label="Rework" value={String(job.reworkQty)} color={tokens.warning} />
            <MetricItem label="Rejected" value={String(job.rejectedQty)} color={tokens.danger} />
            <MetricItem label="Pending QC" value={String(job.pendingQcQty)} color={tokens.warning} />
            <MetricItem label="Efficiency" value={`${job.efficiency}%`} color={job.efficiency >= 80 ? tokens.success : tokens.warning} />
          </View>

          {/* Packing progress bar */}
          <View style={{ marginTop: spacing[3] }}>
            <View style={styles.progressHeader}>
              <AppText variant="caption" color="secondary">Packing Progress</AppText>
              <AppText variant="label" mono bold style={{ color: tokens.brand }}>{packingProgress}%</AppText>
            </View>
            <View style={[styles.progressBg, { backgroundColor: tokens.surfaceSecondary }]}>
              <View style={[styles.progressFill, { width: `${packingProgress}%` as any, backgroundColor: tokens.brand }]} />
            </View>
          </View>
        </AppCard>

        {/* Stage summary */}
        <SectionLabel label="Production Stages" />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          {PRODUCTION_STAGES.map((s, i) => (
            <View key={s.stageCode} style={[styles.stageRow, i < PRODUCTION_STAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
              <AppText variant="label" style={{ width: 90 }}>{s.stageName}</AppText>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3] }}>
                <LabeledNum label="Total" value={s.quantity} />
                <LabeledNum label="WIP" value={s.wip} color={s.wip > 0 ? tokens.warning : undefined} />
                <LabeledNum label="Done" value={s.completed} color={tokens.success} />
              </View>
            </View>
          ))}
        </AppCard>

        {/* Bundles */}
        <SectionLabel label={`Bundles (${jobBundles.length})`} />
        {jobBundles.map((b) => (
          <AppCard key={b.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.bundleRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                <AppText variant="caption" color="secondary">{b.color} · {b.size} · {b.quantity} pcs</AppText>
                <AppText variant="caption" color="secondary">Stage: {b.currentStage}</AppText>
              </View>
              <StatusBadge label={b.status.replace('-', ' ').toUpperCase()} variant={bundleStatusBadge(b.status)} size="sm" />
            </View>
          </AppCard>
        ))}

        {/* Job control actions */}
        {perms.canEditJob && (
          <>
            <SectionLabel label="Job Control" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.actionRow}>
                {job.status === 'active' && (
                  <AppButton
                    title="Hold Job"
                    variant="outline"
                    style={{ flex: 1, marginRight: spacing[2] }}
                    onPress={() => setPendingAction('hold')}
                  />
                )}
                {job.status === 'on-hold' && (
                  <AppButton
                    title="Resume Job"
                    variant="secondary"
                    style={{ flex: 1, marginRight: spacing[2] }}
                    onPress={() => setPendingAction('resume')}
                  />
                )}
                {perms.canCloseJob && job.status !== 'closed' && (
                  <AppButton
                    title="Close Job"
                    variant="danger"
                    style={{ flex: 1 }}
                    onPress={() => setPendingAction('close')}
                  />
                )}
              </View>
              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
                FM controls: Hold, Resume, Close. Changes are recorded in demo state only.
              </AppText>
            </AppCard>
          </>
        )}

      </ScrollView>

      <ConfirmSheet
        visible={pendingAction !== null}
        title={pendingAction === 'hold' ? 'Hold Job' : pendingAction === 'resume' ? 'Resume Job' : 'Close Job'}
        message={
          pendingAction === 'hold'
            ? `Put ${job.jobCode} on hold? This will pause all production for this job.`
            : pendingAction === 'resume'
            ? `Resume ${job.jobCode}? Production will continue.`
            : `Close ${job.jobCode}? This action cannot be undone in production.`
        }
        confirmLabel={pendingAction === 'hold' ? 'Hold Job' : pendingAction === 'resume' ? 'Resume' : 'Close Job'}
        onConfirm={() => confirmAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
        variant={pendingAction === 'close' ? 'danger' : 'default'}
      />
    </View>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={{ width: 90 }}>{label}</AppText>
      <AppText variant="label" style={{ flex: 1, color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[2] }}>
      {label}
    </AppText>
  );
}

function MetricItem({ label, value, color }: { label: string; value: string; color?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={styles.metricItem}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: color ?? tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function LabeledNum({ label, value, color }: { label: string; value: number; color?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={{ alignItems: 'center', minWidth: 40 }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: color ?? tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metricItem: { width: '25%', alignItems: 'center', paddingVertical: spacing[2] },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[1] },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  stageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  bundleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  actionRow: { flexDirection: 'row' },
  row: { flexDirection: 'row', paddingVertical: spacing[2] },
});
