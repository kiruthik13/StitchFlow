import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiJobs } from '../../services/repositories/jobRepository';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
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
  DashboardQuickAction,
  ShiftIndicator,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { AppText } from '../../design-system/components/AppText';
import { AppButton } from '../../design-system/components/AppButton';
import { FilterBar } from '../../design-system/components/FilterBar';
import { EmptyState } from '../../design-system/components/EmptyState';
import { JobTicketCard } from '../../design-system/components/JobTicketCard';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import {
  Plus,
  ClipboardList,
  FolderKanban,
  Timer,
  Users,
  CheckCircle2,
  UserCheck,
  Tag,
  BarChart3,
  Scissors,
  RotateCcw,
  Truck,
} from 'lucide-react-native';

export function FMDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { jobs: demoJobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality', 'reports', 'inventory']);

  const live = useLiveDashboardData({ includeJobs: true });
  const activeJobsList = isDemoMode ? demoJobs : (live.jobs.data ?? []);

  const m = isDemoMode
    ? {
        jobs: demoJobs.length,
        activeJobs: demoJobs.filter((j) => j.status === 'active').length,
        drafts: demoJobs.filter((j) => j.status === 'draft').length,
        pastTarget: demoJobs.filter((j) => j.status === 'on-hold').length,
        ordered: demoJobs.reduce((s, j) => s + j.orderQuantity, 0),
        cut: demoJobs.reduce((s, j) => s + j.cuttingQty, 0),
        inspected: demoJobs.reduce((s, j) => s + j.packingQty + j.reworkQty + j.rejectedQty, 0),
        rework: demoJobs.reduce((s, j) => s + j.reworkQty, 0),
        rejected: demoJobs.reduce((s, j) => s + j.rejectedQty, 0),
        released: demoJobs.reduce((s, j) => s + j.packingQty, 0),
        packed: demoJobs.reduce((s, j) => s + j.packingQty, 0),
        dispatched: demoJobs.reduce((s, j) => s + Math.floor(j.packingQty * 0.6), 0),
        pendingShipments: 1,
        incomingTransfers: 0,
      }
    : live.metrics.data;

  const ops: QuickOperation[] = [
    { id: 'create-job', icon: <Plus size={20} color={tokens.brand} strokeWidth={2.4} />, label: t('production:createJob'), onPress: () => router.push('/(app)/jobs/create') },
    { id: 'view-jobs', icon: <ClipboardList size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:workOrders'), onPress: () => router.push('/(app)/jobs') },
    { id: 'approvals', icon: <CheckCircle2 size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:approvals'), badge: m?.drafts, onPress: () => router.push('/(app)/approvals') },
    { id: 'masters', icon: <FolderKanban size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:masters'), onPress: () => router.push('/(app)/masters') },
    { id: 'planning', icon: <Timer size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:samPlan'), onPress: () => router.push('/(app)/planning/sam-entry') },
    { id: 'workforce', icon: <Users size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:lineStrength'), onPress: () => router.push('/(app)/planning/workforce') },
    { id: 'users', icon: <UserCheck size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:floorAccess'), onPress: () => router.push('/(app)/management/users') },
    { id: 'tags', icon: <Tag size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('production:tagReprints'), onPress: () => router.push('/(app)/management/tags') },
    { id: 'reports', icon: <BarChart3 size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('reports:reports'), onPress: () => router.push('/(app)/(tabs)/reports') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${user?.factoryName ?? 'Factory'} · ${t('common:roles.factory-manager')}`}
        unreadCount={(m?.drafts ?? 0) + (m?.pastTarget ?? 0)}
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
        <ShiftIndicator label={`${user?.factoryName ?? 'Factory Unit 1'}`} lineName={t('common:shift') + ' A'} />

        {!isDemoMode && live.metrics.isLoading ? (
          <DashboardSkeleton />
        ) : m ? (
          <>
            {/* Priority Action Center */}
            {(m.drafts > 0 || m.pastTarget > 0) && (
              <>
                <DashboardSection title={t('production:approvals')} />
                <View style={{ gap: spacing[2] }}>
                  {m.drafts > 0 && (
                    <PriorityActionCard
                      title={t('production:approvals')}
                      subtitle={t('production:scheduledJobs')}
                      count={m.drafts}
                      tone="warning"
                      onPress={() => router.push('/(app)/approvals')}
                    />
                  )}
                  {m.pastTarget > 0 && (
                    <PriorityActionCard
                      title={t('production:highRiskOrders')}
                      subtitle={t('production:delayBufferAlerts')}
                      count={m.pastTarget}
                      tone="danger"
                      onPress={() => router.push('/(app)/jobs')}
                    />
                  )}
                </View>
              </>
            )}

            {/* Target vs Actual Output */}
            <DashboardSection title={t('production:productionOutput')} />
            <ProductionProgressCard
              title={t('production:floorOutputProgress')}
              subtitle={t('production:shiftOutputVsTarget')}
              actual={m.packed}
              target={m.ordered}
            />

            {/* 2x2 Factory Metrics */}
            <View style={styles.grid}>
              <CompactMetricCard
                label={t('production:activeJobs')}
                value={m.activeJobs}
                tone="brand"
                icon={<ClipboardList size={15} color={tokens.brand} />}
                onPress={() => router.push('/(app)/jobs')}
              />
              <CompactMetricCard
                label={t('production:cuttingPieces')}
                value={m.cut}
                tone="default"
                icon={<Scissors size={15} color={tokens.textPrimary} />}
              />
              <CompactMetricCard
                label={t('quality:reworkQueue')}
                value={m.rework}
                tone={m.rework > 0 ? 'warning' : 'success'}
                icon={<RotateCcw size={15} color={m.rework > 0 ? tokens.warningText : tokens.successText} />}
              />
              <CompactMetricCard
                label={t('production:actualDispatched')}
                value={m.dispatched}
                tone="success"
                icon={<Truck size={15} color={tokens.successText} />}
                onPress={() => router.push('/(app)/store/dispatch')}
              />
            </View>

            {/* Stage Pipeline */}
            <DashboardSection title={t('production:activeStages')} />
            <StagePipeline
              maxTotal={Math.max(1, m.ordered)}
              stages={[
                { key: 'cut', label: t('production:cuttingPieces'), quantity: m.cut, tone: 'brand' },
                { key: 'qc', label: t('production:actualInspected'), quantity: m.inspected, tone: 'brand' },
                { key: 'rel', label: t('production:bundleWorkflow_release'), quantity: m.released, tone: 'success' },
                { key: 'pack', label: t('production:packingPieces'), quantity: m.packed, tone: 'success' },
                { key: 'disp', label: t('production:actualDispatched'), quantity: m.dispatched, tone: 'brand' },
              ]}
            />

            {/* Active Work Orders */}
            <DashboardSection
              title={t('production:activeWorkOrders')}
              count={activeJobsList.length}
              actionLabel={t('common:viewAll')}
              onAction={() => router.push('/(app)/jobs')}
            />
            <View style={{ gap: spacing[2] }}>
              {activeJobsList.slice(0, 3).map((job) => (
                <WorkOrderPreview
                  key={job.id}
                  code={job.jobCode}
                  title={job.styleName || job.buyerName}
                  subtitle={`${job.lineName || 'Line'} · ${job.orderQuantity.toLocaleString()} ${t('common:pieces')}`}
                  statusLabel={job.status.toUpperCase()}
                  statusVariant={job.status === 'active' ? 'success' : job.status === 'on-hold' ? 'danger' : 'warning'}
                  progressPct={job.orderQuantity > 0 ? Math.round((job.packingQty / job.orderQuantity) * 100) : 0}
                  onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                />
              ))}
            </View>

            {/* Quick Management Grid */}
            <DashboardSection title={t('production:factoryOperations')} />
            <QuickOperationsGrid operations={ops} columns={3} />

            {/* Dispatch Shortcut */}
            <View style={[styles.grid, { marginTop: spacing[2] }]}>
              <DashboardQuickAction
                icon={<Truck size={18} color={tokens.brand} />}
                label={t('inventory:dispatchManifest')}
                badge={m.pendingShipments}
                onPress={() => router.push('/(app)/store/dispatch')}
              />
              <DashboardQuickAction
                icon={<Plus size={18} color={tokens.brand} />}
                label={t('production:createJob')}
                onPress={() => router.push('/(app)/jobs/create')}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function FMWork() {
  const { tokens } = useThemeStore();
  const { jobs: demoJobs } = useDemoStore();
  const { user, isDemoMode } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const [filter, setFilter] = useState('all');

  const liveJobsQuery = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: () => apiJobs.getJobs(),
    enabled: !isDemoMode && !!user?.id,
  });

  const jobs = isDemoMode ? demoJobs : (liveJobsQuery.data ?? []);

  const JOB_FILTERS = [
    { key: 'all', label: t('common:all') },
    { key: 'active', label: t('common:active') },
    { key: 'on-hold', label: t('common:onHold') },
    { key: 'completed', label: t('common:completed') },
  ];

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <View
        style={[
          styles.workHeader,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <AppText variant="h3" bold style={{ flex: 1, color: tokens.textPrimary }}>
          {t('production:workOrdersAndJobs')}
        </AppText>
        <AppButton
          title={'+ ' + t('common:create')}
          size="sm"
          onPress={() => router.push('/(app)/jobs/create')}
        />
      </View>
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] }}>
        <FilterBar options={JOB_FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[styles.scroll, { paddingTop: 0 }]}
        refreshing={!isDemoMode && liveJobsQuery.isRefetching}
        onRefresh={!isDemoMode ? () => void liveJobsQuery.refetch() : undefined}
        ListEmptyComponent={<EmptyState title={!isDemoMode && liveJobsQuery.isLoading ? t('common:loading') : t('production:noJobsFound')} />}
        renderItem={({ item: job }) => (
          <JobTicketCard
            job={job}
            onPress={() => router.push(`/(app)/jobs/${job.id}`)}
          />
        )}
      />
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: spacing[3], marginBottom: spacing[1.5] }}>
      <AppText
        variant="caption"
        color="secondary"
        uppercase
        bold
        style={{ letterSpacing: 0.8 }}
      >
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="caption" color="secondary" style={{ fontSize: 11, marginTop: 1 }}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  welcomeSection: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  bentoCol: {
    flex: 1,
    gap: spacing[2],
  },
  healthTile: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing[3.5],
    minHeight: 108,
    justifyContent: 'space-between',
  },
  healthTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[1],
  },
  healthLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  healthValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthValue: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  healthPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  workHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[2.5],
    marginTop: spacing[2.5],
  },
});
