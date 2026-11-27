import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import {
  DashboardHeader,
  DashboardSection,
  PremiumKPICard,
  QualitySummaryCard,
  PriorityActionCard,
  WorkOrderPreview,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { EmptyState } from '../../design-system/components/EmptyState';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { TouchableOpacity } from 'react-native';
import { QC_INSPECTIONS } from '../../fixtures/mockData';
import {
  Search,
  Target,
  Ruler,
  Camera,
  RefreshCw,
} from 'lucide-react-native';

export function QCDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { bundles: demoBundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);

  const live = useLiveDashboardData({ includeQuality: true });
  const pendingBundles = isDemoMode
    ? demoBundles.filter((b) => b.status === 'qc-pending')
    : (live.qualityBundles.data ?? []).filter((b) => (b.inspected ?? 0) < (b.quantity ?? 0));

  const completedInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');
  const m = isDemoMode
    ? {
        inspected: completedInspection?.inspectedQty ?? 200,
        passed: completedInspection?.passedQty ?? 180,
        rework: completedInspection?.reworkQty ?? 15,
        rejected: completedInspection?.rejectedQty ?? 5,
        released: completedInspection?.releasedQty ?? 180,
      }
    : live.metrics.data
      ? {
          inspected: live.metrics.data.inspected,
          passed: Math.max(0, live.metrics.data.inspected - live.metrics.data.rework - live.metrics.data.rejected),
          rework: live.metrics.data.rework,
          rejected: live.metrics.data.rejected,
          released: live.metrics.data.released,
        }
      : undefined;

  const qcOps: QuickOperation[] = [
    { id: 'inline', icon: <Search size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('quality:inlineQC'), onPress: () => router.push('/(app)/inspections/inline') },
    { id: 'endline', icon: <Target size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('quality:endlineQC'), onPress: () => router.push('/(app)/inspections/endline') },
    { id: 'measurement', icon: <Ruler size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('quality:measurementCheck'), onPress: () => router.push('/(app)/inspections/measurement') },
    { id: 'evidence', icon: <Camera size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('quality:photoEvidence'), onPress: () => router.push('/(app)/inspections/photo-evidence') },
    { id: 'reinspection', icon: <RefreshCw size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('quality:reinspection'), onPress: () => router.push('/(app)/inspections/reinspection') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${t('common:roles.qc-inspector')} · ${user?.factoryName ?? 'QC Floor'}`}
        unreadCount={pendingBundles.length}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemoMode ? (
            <RefreshControl
              refreshing={live.metrics.isRefetching}
              onRefresh={() => {
                void live.metrics.refetch();
                void live.qualityBundles.refetch();
              }}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        {!isDemoMode && live.metrics.isLoading ? (
          <DashboardSkeleton />
        ) : m ? (
          <>
            <DashboardSection title={t('quality:inspectionQueue') || 'Inspection Queue'} />
            <PremiumKPICard
              label={t('quality:bundlesAwaitingVerification')}
              value={pendingBundles.length}
              unit={t('common:bundles') || 'bundles'}
              subtitle={t('quality:strictIndustrialRule')}
              badge={pendingBundles.length > 0 ? t('quality:startScan') : 'CLEAR'}
              badgeVariant={pendingBundles.length > 0 ? 'warning' : 'success'}
              accentColor={pendingBundles.length > 0 ? tokens.warning : tokens.success}
              onPress={() => router.push('/(app)/(tabs)/scan')}
            />

            <DashboardSection title={t('quality:qualityBalanceEquation')} />
            <QualitySummaryCard
              inspected={m.inspected}
              passed={m.passed}
              rework={m.rework}
              rejected={m.rejected}
              released={m.released}
              labels={{
                passed: t('quality:passed'),
                rework: t('quality:rework'),
                rejected: t('quality:rejected'),
                released: t('quality:releasedToPackingQty', { qty: m.released }),
                passRate: t('quality:inspected'),
              }}
            />

            {m.rework > 0 && (
              <>
                <DashboardSection title={t('quality:activeReworkTracking')} />
                <PriorityActionCard
                  title={t('quality:reinspection')}
                  subtitle={t('quality:bundlesAwaitingVerification')}
                  count={m.rework}
                  tone="warning"
                  onPress={() => router.push('/(app)/inspections/reinspection')}
                />
              </>
            )}

            <DashboardSection title={t('quality:specializedForms')} />
            <QuickOperationsGrid operations={qcOps} columns={3} />

            {pendingBundles.length > 0 && (
              <>
                <DashboardSection title={t('quality:inspectionQueue') || 'Pending Bundles'} count={pendingBundles.length} />
                <View style={{ gap: spacing[2] }}>
                  {pendingBundles.slice(0, 4).map((b: any) => (
                    <WorkOrderPreview
                      key={b.id ?? b.bundleId}
                      code={b.bundleCode ?? 'BUNDLE'}
                      title={b.jobCode ?? b.styleName ?? ''}
                      subtitle={`${b.quantity ?? 0} ${t('common:pieces')}`}
                      statusLabel="QC PENDING"
                      statusVariant="warning"
                      onPress={() => router.push(`/(app)/inspections/${b.id ?? b.bundleId}`)}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label={t('quality:scanBundleInspection')}
      />
    </View>
  );
}

export function QCWork() {
  const { tokens } = useThemeStore();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);
  if (!isDemoMode) return <LiveWorkPanel mode="qc" />;
  const pending = bundles.filter((b) => b.status === 'qc-pending');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <View
        style={[
          styles.dashHeader,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
          {t('quality:pendingInspectionQueue')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {pending.length === 0 ? (
          <EmptyState title={t('quality:queueEmpty')} message={t('quality:allBundlesInspected')} />
        ) : (
          pending.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/(app)/inspections/${b.id}`)}
              activeOpacity={0.8}
              style={{ marginBottom: spacing[2] }}
            >
              <AppCard padding={spacing[3.5]}>
                <View style={styles.jobCompact}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>
                      {b.bundleCode}
                    </AppText>
                    <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                      {b.styleName} · {b.color} · Size {b.size} · {b.quantity} pcs
                    </AppText>
                  </View>
                  <StatusBadge label="PENDING" variant="warning" size="sm" dot />
                </View>
              </AppCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    marginBottom: spacing[2],
    marginTop: spacing[3.5],
  },
  qcQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qcStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  barContainer: {
    height: 8,
    borderRadius: radii.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  releaseNote: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
  },
  releaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  jobCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
});
