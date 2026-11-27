import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import { OfflineSyncBanner } from '../../features/operations/OfflineSyncBanner';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
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
  PriorityActionCard,
  WorkOrderPreview,
  ActivityTimeline,
  ShiftIndicator,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { FilterBar } from '../../design-system/components/FilterBar';
import { EmptyState } from '../../design-system/components/EmptyState';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { REWORK_TASKS } from '../../fixtures/mockData';
import {
  Scissors,
  Cpu,
  CircleDot,
  Flame,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react-native';

export function OperatorDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { bundles: demoBundles, recentScans } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality']);

  const live = useLiveDashboardData({ includeBundles: true });
  const activeBundles = isDemoMode ? demoBundles : (live.bundles.data ?? []);
  const myBundle = isDemoMode
    ? demoBundles.find((b) => b.operatorId === user?.id) ?? demoBundles[0]
    : activeBundles[0];

  const m = isDemoMode
    ? {
        activeJobs: 3,
        ordered: 320,
        cut: 267,
        rework: REWORK_TASKS.length,
      }
    : live.metrics.data;

  const operatorOps: QuickOperation[] = [
    { id: 'cutting', icon: <Scissors size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:cuttingEntry'), onPress: () => router.push('/(app)/operations/cutting-entry') },
    { id: 'sewing', icon: <Cpu size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:sewingEntry'), onPress: () => router.push('/(app)/operations/sewing-entry') },
    { id: 'kaja', icon: <CircleDot size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:kajaEntry'), onPress: () => router.push('/(app)/operations/kaja-entry') },
    { id: 'ironing', icon: <Flame size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:ironingEntry'), onPress: () => router.push('/(app)/operations/ironing-entry') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${t('common:roles.operator')} · ${user?.lineName ?? 'Line 1'}`}
        unreadCount={m?.rework ?? 0}
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
                void live.bundles.refetch();
              }}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        {!isDemoMode && <OfflineSyncBanner />}
        <ShiftIndicator label={t('common:morning') + ' ' + t('common:shift')} lineName={user?.lineName ?? 'Line 1'} />

        {!isDemoMode && live.metrics.isLoading ? (
          <DashboardSkeleton />
        ) : m ? (
          <>
            <DashboardSection title={t('production:myOutputToday')} />
            <ProductionProgressCard
              title={t('production:myOutputToday')}
              subtitle={t('production:shiftTarget')}
              actual={m.cut}
              target={m.ordered}
            />

            <View style={styles.grid}>
              <CompactMetricCard
                label={t('production:activeJobs')}
                value={m.activeJobs}
                tone="brand"
                icon={<CheckCircle2 size={15} color={tokens.brand} />}
                onPress={() => router.push('/(app)/jobs')}
              />
              <CompactMetricCard
                label={t('production:myReworkTasks')}
                value={m.rework}
                tone={m.rework > 0 ? 'warning' : 'success'}
                icon={<RotateCcw size={15} color={m.rework > 0 ? tokens.warningText : tokens.successText} />}
              />
            </View>

            {myBundle && (
              <>
                <DashboardSection title={t('production:currentAssignment')} />
                <WorkOrderPreview
                  code={myBundle.bundleCode}
                  title={myBundle.styleName || myBundle.jobCode}
                  subtitle={`${myBundle.color || ''} ${myBundle.size || ''} · ${myBundle.quantity} ${t('common:pieces')}`}
                  statusLabel={(myBundle.currentStage || myBundle.status).toUpperCase()}
                  statusVariant="info"
                  progressPct={myBundle.quantity > 0 ? Math.round((myBundle.completedQty / myBundle.quantity) * 100) : 0}
                  onPress={() => router.push(`/(app)/bundles/${myBundle.id}`)}
                />
              </>
            )}

            <DashboardSection title={t('production:stationOperations')} />
            <QuickOperationsGrid operations={operatorOps} columns={2} />

            <View style={{ marginTop: spacing[3] }}>
              <PriorityActionCard
                title={t('production:reportMachineStoppage')}
                subtitle={t('production:alertSupervisorImmediately')}
                tone="danger"
                onPress={() => router.push('/(app)/operations/report-issue')}
              />
            </View>

            {recentScans.length > 0 && (
              <>
                <DashboardSection title={t('common:scanBarcode')} count={recentScans.length} />
                <ActivityTimeline
                  items={recentScans.slice(0, 4).map((code, i) => ({
                    id: `scan-${i}`,
                    title: code,
                    subtitle: t('common:completed'),
                    tone: 'success',
                  }))}
                />
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label={t('common:scanBarcode')}
      />
    </View>
  );
}

export function OperatorWork() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');

  if (!isDemoMode) return <LiveWorkPanel mode="operator" />;

  const BUNDLE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  const myBundles = bundles.filter((b) => b.operatorId === user?.id || b.lineId === 'line-1');
  const filtered =
    filter === 'all'
      ? myBundles
      : filter === 'in-progress'
      ? myBundles.filter((b) => ['sewing', 'kaja', 'ironing', 'cutting'].includes(b.status))
      : myBundles.filter((b) => ['packed', 'qc-passed', 'packing'].includes(b.status));

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
          My Assigned Work
        </AppText>
      </View>
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] }}>
        <FilterBar options={BUNDLE_FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[styles.scroll, { paddingTop: 0 }]}
        ListEmptyComponent={<EmptyState title="No bundles assigned" message="Scan a barcode to get started." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        renderItem={({ item: b }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/bundles/${b.id}`)} activeOpacity={0.8}>
            <AppCard padding={spacing[3.5]}>
              <View style={styles.jobCompact}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>
                    {b.bundleCode}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {b.jobCode} · {b.color} · Size {b.size} · {b.quantity} pcs
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    Stage: {b.currentStage}
                  </AppText>
                </View>
                <StatusBadge
                  label={b.status.replace('-', ' ').toUpperCase()}
                  variant={
                    b.status === 'rework'
                      ? 'danger'
                      : b.status === 'packed' || b.status === 'qc-passed'
                      ? 'success'
                      : 'info'
                  }
                  size="sm"
                  dot
                />
              </View>
            </AppCard>
          </TouchableOpacity>
        )}
      />
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
  grid2: {
    flexDirection: 'row',
  },
  opHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  pacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  opTrack: {
    height: 7,
    borderRadius: radii.full,
    backgroundColor: 'rgba(252, 251, 248, 0.16)',
    overflow: 'hidden',
    marginBottom: spacing[2.5],
  },
  opFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  opMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  scanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing[1.5],
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
