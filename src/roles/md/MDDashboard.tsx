import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { masterRepository } from '../../services/repositories/masterRepository';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import {
  DashboardHeader,
  DashboardSection,
  PremiumKPICard,
  CompactMetricCard,
  StagePipeline,
  QualitySummaryCard,
  ProductionTrendChart,
  PriorityActionCard,
  DashboardQuickAction,
  FactorySelector,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppText } from '../../design-system/components/AppText';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { SearchField } from '../../design-system/components/SearchField';
import { EmptyState } from '../../design-system/components/EmptyState';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { FACTORIES, ALERTS } from '../../fixtures/mockData';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Scissors,
  PackageCheck,
  Truck,
  ClipboardList,
  BarChart3,
  Building2,
  ChevronRight,
} from 'lucide-react-native';

export function MDDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { jobs: demoJobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'reports', 'quality']);

  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('7d');

  const live = useLiveDashboardData({
    includeFactories: true,
    factoryId: selectedFactory === 'all' ? undefined : selectedFactory,
  });

  const factoryItems = isDemoMode
    ? [{ id: 'all', label: t('common:all') || 'All' }, ...FACTORIES.map((f) => ({ id: f.id, label: f.name }))]
    : [
        { id: 'all', label: t('common:all') || 'All' },
        ...(live.factories.data ?? []).map((f) => ({ id: f.id, label: f.name })),
      ];

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
        pendingShipments: 2,
        incomingTransfers: 1,
      }
    : live.metrics.data;

  const passedQty = m ? Math.max(0, m.inspected - m.rework - m.rejected) : 0;
  const completionPct = m && m.ordered > 0 ? Math.min(100, Math.round((m.packed / m.ordered) * 100)) : 0;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${t('production:executiveGroupOverview')} · ${t('common:roles.md')}`}
        unreadCount={m ? m.pastTarget + m.drafts : 0}
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
                void live.factories.refetch();
              }}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        {/* Factory & Date Range Controls */}
        <FactorySelector items={factoryItems} selectedId={selectedFactory} onSelect={setSelectedFactory} />
        <View style={styles.rangeRow}>
          {(['today', '7d', '30d'] as const).map((r) => {
            const active = dateRange === r;
            return (
              <AppCard
                key={r}
                padding={spacing[1.5]}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: active ? tokens.brandLight : tokens.surface,
                    borderColor: active ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  bold
                  onPress={() => setDateRange(r)}
                  style={{ color: active ? tokens.brand : tokens.textSecondary, textAlign: 'center' }}
                >
                  {r.toUpperCase()}
                </AppText>
              </AppCard>
            );
          })}
        </View>

        {!isDemoMode && live.metrics.isLoading ? (
          <DashboardSkeleton />
        ) : m ? (
          <>
            {/* Executive Hero KPI */}
            <DashboardSection title={t('production:manufacturingGroupSummary')} />
            <PremiumKPICard
              label={t('production:totalJobs')}
              value={m.jobs}
              unit={`${m.activeJobs} ${t('production:activeJobs')}`}
              subtitle={`${m.ordered.toLocaleString()} ${t('common:pieces')} · ${completionPct}% ${t('production:packingPieces')}`}
              badge={m.pastTarget > 0 ? `${m.pastTarget} ${t('production:highRiskOrders')}` : `${m.activeJobs} ACTIVE`}
              badgeVariant={m.pastTarget > 0 ? 'danger' : 'success'}
              progress={completionPct}
              accentColor={tokens.brand}
              onPress={() => router.push('/(app)/jobs')}
            />

            {/* Asymmetric 2x2 Operational KPIs */}
            <View style={styles.grid}>
              <CompactMetricCard
                label={t('production:highRiskOrders')}
                value={m.pastTarget}
                tone={m.pastTarget > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle size={15} color={m.pastTarget > 0 ? tokens.dangerText : tokens.successText} />}
                onPress={() => router.push('/(app)/jobs?filter=high-risk' as never)}
              />
              <CompactMetricCard
                label={t('production:cuttingPieces')}
                value={m.cut}
                tone="brand"
                icon={<Scissors size={15} color={tokens.brand} />}
                onPress={() => router.push('/(app)/jobs')}
              />
              <CompactMetricCard
                label={t('production:packingPieces')}
                value={m.packed}
                tone="success"
                icon={<PackageCheck size={15} color={tokens.successText} />}
                onPress={() => router.push('/(app)/(tabs)/reports')}
              />
              <CompactMetricCard
                label={t('production:actualDispatched')}
                value={m.dispatched}
                tone="default"
                icon={<Truck size={15} color={tokens.textPrimary} />}
                onPress={() => router.push('/(app)/store/dispatch')}
              />
            </View>

            {/* Stage-Wise Production Pipeline */}
            <DashboardSection title={t('production:activeStages')} />
            <StagePipeline
              maxTotal={Math.max(1, m.ordered)}
              stages={[
                { key: 'cut', label: t('production:cuttingPieces'), quantity: m.cut, tone: 'brand' },
                { key: 'insp', label: t('production:actualInspected'), quantity: m.inspected, tone: 'brand' },
                { key: 'rel', label: t('production:bundleWorkflow_release'), quantity: m.released, tone: 'success' },
                { key: 'pack', label: t('production:packingPieces'), quantity: m.packed, tone: 'success' },
                { key: 'disp', label: t('production:actualDispatched'), quantity: m.dispatched, tone: 'brand' },
              ]}
            />

            {/* Quality Distribution */}
            <DashboardSection title={t('quality:qcSummary') || 'Quality & Rework Summary'} />
            <QualitySummaryCard
              inspected={m.inspected}
              passed={passedQty}
              rework={m.rework}
              rejected={m.rejected}
              released={m.released}
              labels={{
                passed: t('quality:passed') || 'Passed',
                rework: t('quality:rework') || 'Rework',
                rejected: t('quality:rejected') || 'Rejected',
                released: t('production:bundleWorkflow_release'),
                passRate: t('quality:passRate') || 'Pass Rate',
              }}
            />

            {/* Stage Throughput Chart */}
            <DashboardSection title={t('production:executiveAnalytics')} />
            <ProductionTrendChart
              bars={[
                { label: 'Cut', value: m.cut, tone: 'brand' },
                { label: 'QC', value: m.inspected, tone: 'brand' },
                { label: 'Pass', value: passedQty, tone: 'success' },
                { label: 'Pack', value: m.packed, tone: 'success' },
                { label: 'Ship', value: m.dispatched, tone: 'warning' },
              ]}
            />

            {/* Critical Alerts & Insights */}
            {(m.pastTarget > 0 || m.pendingShipments > 0 || isDemoMode) && (
              <>
                <DashboardSection title={t('production:criticalAlerts')} />
                <View style={{ gap: spacing[2] }}>
                  {m.pastTarget > 0 && (
                    <PriorityActionCard
                      title={t('production:highRiskOrders')}
                      subtitle={t('production:delayBufferAlerts')}
                      count={m.pastTarget}
                      tone="danger"
                      onPress={() => router.push('/(app)/md/bottlenecks')}
                    />
                  )}
                  {m.pendingShipments > 0 && (
                    <PriorityActionCard
                      title={t('inventory:dispatchManifest') || 'Pending Shipments'}
                      subtitle={t('production:approvals')}
                      count={m.pendingShipments}
                      tone="warning"
                      onPress={() => router.push('/(app)/store/dispatch')}
                    />
                  )}
                  {isDemoMode &&
                    ALERTS.filter((a) => !a.isRead).slice(0, 1).map((a) => (
                      <PriorityActionCard
                        key={a.id}
                        title={a.title}
                        subtitle={a.message}
                        tone={a.severity === 'critical' ? 'danger' : 'warning'}
                        onPress={() => router.push('/(app)/md/bottlenecks')}
                      />
                    ))}
                </View>
              </>
            )}

            {/* Executive Shortcuts */}
            <DashboardSection title={t('production:factoryOperations')} />
            <View style={styles.grid}>
              <DashboardQuickAction
                icon={<Zap size={18} color={tokens.brand} />}
                label={t('production:bottleneckAnalytics')}
                onPress={() => router.push('/(app)/md/bottlenecks')}
              />
              <DashboardQuickAction
                icon={<TrendingUp size={18} color={tokens.brand} />}
                label={t('production:samEfficiency')}
                onPress={() => router.push('/(app)/md/sam-efficiency')}
              />
              <DashboardQuickAction
                icon={<BarChart3 size={18} color={tokens.brand} />}
                label={t('reports:reportsAndLogs')}
                onPress={() => router.push('/(app)/(tabs)/reports')}
              />
              <DashboardQuickAction
                icon={<ClipboardList size={18} color={tokens.brand} />}
                label={t('production:workOrders')}
                onPress={() => router.push('/(app)/jobs')}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function MDWork() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const [search, setSearch] = useState('');

  const factoriesQuery = useQuery({
    queryKey: ['md-factories', user?.id],
    queryFn: () => masterRepository.getFactories(),
    enabled: !isDemoMode && !!user?.id,
  });

  const allFactories = isDemoMode ? FACTORIES : (factoriesQuery.data ?? []);
  const q = search.trim().toLowerCase();
  const factories = q
    ? allFactories.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q),
      )
    : allFactories;

  const totalUnits = allFactories.reduce((s, f) => s + (f.unitsCount ?? 1), 0);
  const activeLinesTotal = allFactories.reduce((s, f) => s + (f.activeLines ?? 0), 0);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader subtitle={`${t('production:factoriesAndUnits')} · ${t('common:roles.md')}`} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemoMode ? (
            <RefreshControl
              refreshing={factoriesQuery.isRefetching}
              onRefresh={() => void factoriesQuery.refetch()}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        <View style={styles.grid}>
          <CompactMetricCard
            label={t('production:operatingPlants')}
            value={allFactories.length}
            tone="brand"
            icon={<Building2 size={15} color={tokens.brand} />}
          />
          <CompactMetricCard
            label={t('production:activeLines')}
            value={activeLinesTotal}
            subtitle={`${totalUnits} ${t('production:factoriesAndUnits')}`}
            tone="success"
            icon={<TrendingUp size={15} color={tokens.successText} />}
          />
        </View>

        <View style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder={t('production:factoriesAndUnits')}
          />
        </View>

        {!isDemoMode && factoriesQuery.isLoading ? (
          <DashboardSkeleton />
        ) : !isDemoMode && factoriesQuery.isError ? (
          <View style={{ gap: spacing[3] }}>
            <EmptyState title={t('errors:serverError')} />
            <AppButton title={t('common:refresh')} onPress={() => void factoriesQuery.refetch()} />
          </View>
        ) : factories.length === 0 ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <View style={{ gap: spacing[2.5] }}>
            {factories.map((f) => {
              const ordered = f.orderedQty ?? 0;
              const packed = f.packedQty ?? 0;
              const eff = isDemoMode
                ? f.id === 'factory-a'
                  ? 82
                  : 68
                : ordered > 0
                  ? Math.min(100, Math.round((packed / ordered) * 100))
                  : 0;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/md/factory/[id]' as never,
                      params: { id: f.id },
                    } as never)
                  }
                  activeOpacity={0.85}
                >
                  <AppCard padding={spacing[4]}>
                    <View style={styles.factoryRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
                          <AppText variant="caption" mono bold style={{ color: tokens.brand }}>
                            {f.code}
                          </AppText>
                          {(f.openIssuesCount ?? 0) > 0 && (
                            <StatusBadge label={`${f.openIssuesCount} ALERT`} variant="danger" size="sm" />
                          )}
                        </View>
                        <AppText variant="h4" bold style={{ color: tokens.textPrimary, marginTop: 2 }}>
                          {f.name}
                        </AppText>
                        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                          {f.location}
                        </AppText>
                      </View>
                      <ChevronRight size={18} color={tokens.textSecondary} />
                    </View>

                    <View style={[styles.rowStats, { borderTopColor: tokens.border, borderTopWidth: 1 }]}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" color="secondary">{t('production:lines')}</AppText>
                        <AppText variant="label" bold mono>{f.activeLines}/{f.totalLines}</AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" color="secondary">{t('production:capacity')}</AppText>
                        <AppText variant="label" bold mono>{f.capacity}</AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" color="secondary">{t('production:activeJobs')}</AppText>
                        <AppText variant="label" bold mono>{f.activeJobsCount ?? (isDemoMode ? 2 : 0)}</AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" color="secondary">{t('common:efficiency')}</AppText>
                        <AppText
                          variant="label"
                          bold
                          mono
                          style={{ color: eff >= 80 ? tokens.successText : tokens.warningText }}
                        >
                          {eff}%
                        </AppText>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            })}
          </View>
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
  grid2: {
    flexDirection: 'row',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  quickCard: {
    flex: 1,
    padding: spacing[3.5],
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  execIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  factoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowStats: {
    flexDirection: 'row',
    marginTop: spacing[3],
    paddingTop: spacing[2.5],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[2.5],
    marginTop: spacing[2.5],
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  rangeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
  },
});
