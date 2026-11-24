import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge, jobStatusBadge, bundleStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { ScannerActionCard } from '../../../src/design-system/components/ScannerActionCard';
import { ProductionStageStepper } from '../../../src/design-system/components/ProductionStageStepper';
import { QCGateCard } from '../../../src/design-system/components/QCGateCard';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import { PRODUCTION_STAGES } from '../../../src/fixtures/mockData';
import { getPermissions } from '../../../src/core/permissions';
import { Shirt, Tag, Calendar, Layers, Clock, ArrowRight } from 'lucide-react-native';

type JobAction = 'hold' | 'resume' | 'close' | null;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens, mode } = useThemeStore();
  const { jobs, bundles, updateJobStatus } = useDemoStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const [pendingAction, setPendingAction] = useState<JobAction>(null);

  const job = jobs.find((j) => j.id === id);
  if (!job) return <EmptyState title={t('errors:jobNotFound')} message={`ID: ${id}`} />;

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
  const balanceQty = Math.max(0, job.orderQuantity - job.packingQty);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={job.jobCode}
        subtitle={`${job.styleName} · ${job.buyerName}`}
        showBack
        rightEl={
          <StatusBadge
            label={job.status.replace('-', ' ').toUpperCase()}
            variant={jobStatusBadge(job.status)}
            size="sm"
            dot
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Prominent Signature Lime Scanner Action Card */}
        <ScannerActionCard
          title="Scan Bundle QR / Barcode"
          description={`Scan for ${job.jobCode} ticket reconciliation`}
          onPress={() => router.push('/(app)/(tabs)/scan')}
        />

        {/* 2. Work Order Details Card (Garment Product Hang-Tag Style) */}
        <AppCard variant="hero" padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.garmentHeaderRow}>
            <View style={[styles.garmentThumbnail, { backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD' }]}>
              <Shirt size={28} color={mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.6 }}>
                Work Order #{job.jobCode}
              </AppText>
              <AppText variant="h3" bold style={{ color: tokens.textPrimary, letterSpacing: -0.3 }}>
                {job.styleName}
              </AppText>
              <AppText variant="caption" color="secondary">
                Buyer: {job.buyerName} · {job.factoryName} ({job.lineName})
              </AppText>
            </View>
          </View>

          {/* Quantity Balance Strip */}
          <View style={[styles.balanceStrip, { backgroundColor: tokens.surfaceSecondary }]}>
            <View style={styles.balanceItem}>
              <AppText variant="caption" color="secondary">Planned</AppText>
              <AppText variant="label" bold mono>{job.orderQuantity.toLocaleString()}</AppText>
            </View>
            <View style={[styles.stripDivider, { backgroundColor: tokens.border }]} />
            <View style={styles.balanceItem}>
              <AppText variant="caption" color="secondary">Packed</AppText>
              <AppText variant="label" bold mono style={{ color: tokens.success }}>{job.packingQty.toLocaleString()}</AppText>
            </View>
            <View style={[styles.stripDivider, { backgroundColor: tokens.border }]} />
            <View style={styles.balanceItem}>
              <AppText variant="caption" color="secondary">Balance</AppText>
              <AppText variant="label" bold mono style={{ color: tokens.warning }}>{balanceQty.toLocaleString()}</AppText>
            </View>
          </View>

          {/* Key Attributes */}
          <View style={styles.attrList}>
            <DetailRow label="Colors" value={job.colors.join(', ')} />
            <DetailRow label="Sizes" value={job.sizes.join(', ')} />
            <DetailRow label="SAM" value={`${job.samValue} min / pc`} />
            <DetailRow label="Target Date" value={job.targetDate} isLast />
          </View>
        </AppCard>

        {/* 3. Production Stage Lifecycle Stepper */}
        <SectionLabel label="Production Lifecycle" />
        <AppCard padding={spacing[3]} style={{ marginBottom: spacing[3] }}>
          <ProductionStageStepper
            stages={[
              { id: 'cutting', name: 'Cutting', state: job.cuttingQty > 0 ? 'completed' : 'in_progress' },
              { id: 'sewing', name: 'Sewing', state: job.sewingOutQty > 0 ? 'in_progress' : 'pending' },
              { id: 'qc', name: 'QC Gate', state: job.pendingQcQty > 0 ? 'in_progress' : 'pending' },
              { id: 'packing', name: 'Packing', state: job.packingQty >= job.orderQuantity ? 'completed' : 'pending' },
            ]}
          />
        </AppCard>

        {/* 4. Dedicated QC Gate Verification Card */}
        <SectionLabel label="Quality Assurance & Release Gate" />
        <QCGateCard
          status={job.pendingQcQty > 0 ? 'pending' : 'passed'}
          inspectedQty={200}
          passedQty={Math.max(0, 200 - job.reworkQty - job.rejectedQty)}
          reworkQty={job.reworkQty}
          rejectedQty={job.rejectedQty}
          onActionPress={() => router.push('/(app)/inspections/endline')}
          actionTitle="Open QC Inspection Sheet"
        />

        {/* 5. Production Output & Stage Breakdown */}
        <SectionLabel label="Stage Output Breakdown" />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          {PRODUCTION_STAGES.map((s, i) => (
            <View
              key={s.stageCode}
              style={[
                styles.stageRow,
                i < PRODUCTION_STAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
              ]}
            >
              <AppText variant="label" bold style={{ width: 95 }}>{s.stageName}</AppText>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3] }}>
                <LabeledNum label="Total" value={s.quantity} />
                <LabeledNum label="WIP" value={s.wip} color={s.wip > 0 ? tokens.warning : undefined} />
                <LabeledNum label="Done" value={s.completed} color={tokens.success} />
              </View>
            </View>
          ))}
        </AppCard>

        {/* 6. Bundles List */}
        <SectionLabel label={`Active Bundles (${jobBundles.length})`} />
        {jobBundles.map((b) => (
          <TouchableOpacity
            key={b.id}
            onPress={() => router.push(`/(app)/bundles/${b.id}`)}
            activeOpacity={0.8}
            style={{ marginBottom: spacing[2] }}
          >
            <AppCard padding={spacing[3.5]}>
              <View style={styles.bundleRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>
                    {b.bundleCode}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {b.color} · Size {b.size} · {b.quantity} pcs
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    Current Station: {b.currentStage}
                  </AppText>
                </View>
                <StatusBadge
                  label={b.status.replace('-', ' ').toUpperCase()}
                  variant={bundleStatusBadge(b.status)}
                  size="sm"
                  dot
                />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}

        {/* 7. Primary Action: Full-Width Tactile Update Button */}
        <View style={{ marginTop: spacing[3], marginBottom: spacing[3] }}>
          <AppButton
            title="Update Production Stage"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(app)/(tabs)/scan')}
          />
        </View>

        {/* 8. Job Control Actions */}
        {perms.canEditJob && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="label" bold style={{ marginBottom: spacing[2], color: tokens.textPrimary }}>
              Manager Control Actions
            </AppText>
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
          </AppCard>
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

function DetailRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.detailRow, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={{ width: 100 }}>{label}</AppText>
      <AppText variant="bodySmall" bold style={{ flex: 1, color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText
      variant="caption"
      color="secondary"
      uppercase
      bold
      style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[3] }}
    >
      {label}
    </AppText>
  );
}

function LabeledNum({ label, value, color }: { label: string; value: number; color?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={{ alignItems: 'center', minWidth: 44 }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: color ?? tokens.textPrimary }}>
        {value.toLocaleString()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  garmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  garmentThumbnail: {
    width: 54,
    height: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStrip: {
    flexDirection: 'row',
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[2],
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  balanceItem: {
    alignItems: 'center',
  },
  stripDivider: {
    width: 1,
    height: '100%',
  },
  attrList: {
    marginTop: spacing[1],
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: spacing[2.5],
    alignItems: 'center',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
  },
  bundleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing[1],
  },
});
