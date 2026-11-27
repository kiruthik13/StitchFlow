import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import {
  DashboardHeader,
  DashboardSection,
  ProductionProgressCard,
  CompactMetricCard,
  StagePipeline,
  PriorityActionCard,
  WorkOrderPreview,
  ShiftIndicator,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import {
  ClipboardList,
  Users,
  Timer,
  Tag,
  AlertTriangle,
  Layers,
  Scissors,
  ScanLine,
} from 'lucide-react-native';

export function SupervisorDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { jobs: demoJobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality']);

  const live = useLiveDashboardData({ includeJobs: true });
  const activeJobsList = isDemoMode ? demoJobs : (live.jobs.data ?? []);

  const m = isDemoMode
    ? {
        activeJobs: demoJobs.filter((j) => j.status === 'active').length,
        ordered: demoJobs.reduce((s, j) => s + j.orderQuantity, 0),
        cut: demoJobs.reduce((s, j) => s + j.cuttingQty, 0),
        inspected: demoJobs.reduce((s, j) => s + j.packingQty + j.reworkQty, 0),
        rework: demoJobs.reduce((s, j) => s + j.reworkQty, 0),
        released: demoJobs.reduce((s, j) => s + j.packingQty, 0),
        packed: demoJobs.reduce((s, j) => s + j.packingQty, 0),
      }
    : live.metrics.data;

  const supervisorOps: QuickOperation[] = [
    { id: 'assignment', icon: <ClipboardList size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:workAssignment'), onPress: () => router.push('/(app)/operations/work-assignment') },
    { id: 'tailor-map', icon: <Users size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:tailorMapping'), onPress: () => router.push('/(app)/operations/tailor-mapping') },
    { id: 'sam-monitor', icon: <Timer size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:samMonitor'), onPress: () => router.push('/(app)/operations/sam-monitor') },
    { id: 'tag-reprint', icon: <Tag size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:tagReprints'), onPress: () => router.push('/(app)/operations/tag-reprint') },
    { id: 'report-issue', icon: <AlertTriangle size={20} color={tokens.warningText} strokeWidth={2.2} />, label: t('production:reportMachineStoppage') || 'Report Issue', onPress: () => router.push('/(app)/operations/report-issue') },
    { id: 'scan-floor', icon: <ScanLine size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('common:scanBarcode'), onPress: () => router.push('/(app)/(tabs)/scan') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${user?.lineName ?? 'Line 1'} · ${user?.factoryName ?? 'Factory'}`}
        unreadCount={m?.rework ?? 0}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemoMode ? (
            <RefreshControl
              refreshing={live.metrics.isRefetching}
              onRefresh={() => {
                void live.metrics.refetch();
                void live.jobs.refetch();
              }}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        <ShiftIndicator label={`${t('common:roles.supervisor')}`} lineName={user?.lineName ?? 'Line 1'} />

        {!isDemoMode && live.metrics.isLoading ? (
          <DashboardSkeleton />
        ) : m ? (
          <>
            <DashboardSection title={t('production:lineKPIs')} />
            <ProductionProgressCard
              title={t('production:floorOutputProgress')}
              subtitle={t('production:shiftOutputVsTarget')}
              actual={m.cut}
              target={m.ordered}
            />

            <View style={styles.grid}>
              <CompactMetricCard
                label={t('production:activeJobs')}
                value={m.activeJobs}
                tone="brand"
                icon={<Layers size={15} color={tokens.brand} />}
                onPress={() => router.push('/(app)/jobs')}
              />
              <CompactMetricCard
                label={t('production:cuttingPieces')}
                value={m.cut}
                tone="default"
                icon={<Scissors size={15} color={tokens.textPrimary} />}
              />
              <CompactMetricCard
                label={t('production:actualInspected')}
                value={m.inspected}
                tone="success"
                icon={<ClipboardList size={15} color={tokens.successText} />}
              />
              <CompactMetricCard
                label={t('quality:reworkQueue')}
                value={m.rework}
                tone={m.rework > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle size={15} color={m.rework > 0 ? tokens.dangerText : tokens.successText} />}
              />
            </View>

            <DashboardSection title={t('production:activeStages')} />
            <StagePipeline
              maxTotal={Math.max(1, m.ordered)}
              stages={[
                { key: 'cut', label: t('production:cuttingPieces'), quantity: m.cut, tone: 'brand' },
                { key: 'insp', label: t('production:actualInspected'), quantity: m.inspected, tone: 'brand' },
                { key: 'rel', label: t('production:bundleWorkflow_release'), quantity: m.released, tone: 'success' },
                { key: 'pack', label: t('production:packingPieces'), quantity: m.packed, tone: 'success' },
              ]}
            />

            {m.rework > 0 && (
              <>
                <DashboardSection title={t('production:bottleneckAlertIroning') || 'Floor Attention'} />
                <PriorityActionCard
                  title={t('quality:reworkQueue')}
                  subtitle={t('production:bottleneckAlertSub')}
                  count={m.rework}
                  tone="danger"
                  onPress={() => router.push('/(app)/operations/sam-monitor')}
                />
              </>
            )}

            <DashboardSection title={t('production:supervisorActions')} />
            <QuickOperationsGrid operations={supervisorOps} columns={3} />

            <DashboardSection
              title={t('production:lineJobsAndOrders')}
              count={activeJobsList.length}
              actionLabel={t('common:viewAll')}
              onAction={() => router.push('/(app)/jobs')}
            />
            <View style={{ gap: spacing[2] }}>
              {activeJobsList.slice(0, 4).map((job) => (
                <WorkOrderPreview
                  key={job.id}
                  code={job.jobCode}
                  title={job.styleName || job.buyerName}
                  subtitle={`${job.lineName || 'Line'} · ${job.orderQuantity.toLocaleString()} ${t('common:pieces')}`}
                  statusLabel={job.status.toUpperCase()}
                  statusVariant={job.status === 'active' ? 'success' : 'warning'}
                  progressPct={job.orderQuantity > 0 ? Math.round((job.cuttingQty / job.orderQuantity) * 100) : 0}
                  onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function SupervisorWork() {
  const { tokens } = useThemeStore();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  if (!isDemoMode) return <LiveWorkPanel mode="supervisor" />;

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
          {t('production:lineBundlesWIP')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase bold style={{ marginBottom: spacing[2] }}>
          {t('production:line1Bundles')}
        </AppText>
        {bundles
          .filter((b) => b.lineId === 'line-1')
          .map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/(app)/bundles/${b.id}`)}
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
                      {b.jobCode} · {b.styleName} · {b.color} · Size {b.size}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {t('production:stage')}: {b.currentStage} · {t('common:quantity')}: {b.quantity} {t('common:pieces')}
                    </AppText>
                  </View>
                  <StatusBadge
                    label={b.status.replace('-', ' ').toUpperCase()}
                    variant={
                      b.status === 'qc-pending'
                        ? 'warning'
                        : b.status === 'packed'
                        ? 'success'
                        : b.status === 'rework'
                        ? 'danger'
                        : 'info'
                    }
                    size="sm"
                    dot
                  />
                </View>
              </AppCard>
            </TouchableOpacity>
          ))}
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
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing[2.5],
    marginBottom: spacing[1],
  },
  kpiCol: {
    flex: 1,
    gap: spacing[2.5],
  },
  bottleneckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[3],
    gap: spacing[2.5],
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: 'rgba(184, 59, 54, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[2.5],
    marginTop: spacing[2.5],
  },
});
