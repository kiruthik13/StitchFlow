import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../../src/store/themeStore';
import { useAuthStore } from '../../../../src/store/authStore';
import { useDemoStore } from '../../../../src/store/demoStore';
import { apiRequest } from '../../../../src/services/api/apiClient';
import { apiJobs } from '../../../../src/services/repositories/jobRepository';
import { AppHeader } from '../../../../src/design-system/components/AppHeader';
import { AppText } from '../../../../src/design-system/components/AppText';
import { AppCard } from '../../../../src/design-system/components/AppCard';
import { AppButton } from '../../../../src/design-system/components/AppButton';
import { FilterBar } from '../../../../src/design-system/components/FilterBar';
import { StatusBadge } from '../../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../../src/design-system/components/EmptyState';
import {
  DashboardSection,
  CompactMetricCard,
  ProductionProgressCard,
  StagePipeline,
  QualitySummaryCard,
  WorkOrderPreview,
  DashboardQuickAction,
  DashboardSkeleton,
} from '../../../../src/design-system/components/dashboard';
import { spacing } from '../../../../src/design-system/tokens/spacing';
import { FACTORIES, LINES, DEMO_USERS } from '../../../../src/fixtures/mockData';
import {
  Building2,
  Layers,
  Users,
  ClipboardList,
  BarChart3,
  Truck,
  AlertTriangle,
  Boxes,
} from 'lucide-react-native';

interface FactoryHierarchyResponse {
  factory: {
    id: string;
    code: string;
    name: string;
    location: string;
    totalLines: number;
    activeLines: number;
    capacity: number;
    managerName?: string | null;
  };
  units: Array<{ id: string; code: string; name: string; isActive: boolean; departmentsCount: number; linesCount: number }>;
  departments: Array<{ id: string; unitId: string; code: string; name: string; isActive: boolean }>;
  lines: Array<{
    id: string;
    departmentId: string;
    code: string;
    name: string;
    capacity: number;
    stages: string[];
    isActive: boolean;
    activeJobsCount: number;
    targetQty: number;
  }>;
  metrics: {
    jobs: number;
    activeJobs: number;
    ordered: number;
    cut: number;
    inspected: number;
    passed: number;
    rework: number;
    rejected: number;
    released: number;
    packed: number;
    dispatched: number;
    openIssues: number;
  };
  workforce: Array<{
    id: string;
    employeeId: string;
    name: string;
    roleCode: string;
    accountStatus: string;
    unitId: string | null;
    departmentId: string | null;
    lineId: string | null;
  }>;
}

const DEPARTMENT_STAGES = [
  'Cutting',
  'Input In / Out',
  'Sewing',
  'Output In / Out',
  'Kaja & Button',
  'Ironing',
  'Quality Control',
  'Packing',
  'Store & Dispatch',
];

export default function FactoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality', 'inventory', 'reports', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const { jobs: demoJobs } = useDemoStore();
  const [sectionTab, setSectionTab] = useState<'overview' | 'units' | 'lines' | 'orders' | 'workforce' | 'inventory'>('overview');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  const hierarchyQuery = useQuery({
    queryKey: ['md-factory-hierarchy', user?.id, id],
    enabled: !isDemoMode && !!id,
    queryFn: () => apiRequest<FactoryHierarchyResponse>(`/factories/${encodeURIComponent(id!)}/hierarchy`),
  });

  const jobsQuery = useQuery({
    queryKey: ['md-factory-jobs', user?.id, id],
    enabled: !isDemoMode && !!id,
    queryFn: () => apiJobs.getJobs(),
  });

  const stockQuery = useQuery({
    queryKey: ['md-factory-stock', user?.id, id],
    enabled: !isDemoMode && !!id && sectionTab === 'inventory',
    queryFn: () => apiRequest<Array<{ id: string; sku: string; name: string; baseUnit: string; quantity?: number }>>(`/inventory/raw/stock?factoryId=${encodeURIComponent(id!)}`),
  });

  const cartonsQuery = useQuery({
    queryKey: ['md-factory-cartons', user?.id, id],
    enabled: !isDemoMode && !!id && sectionTab === 'inventory',
    queryFn: () => apiRequest<Array<{ id: string; barcode: string; quantity: number; receivedAt?: string | null; dispatchedAt?: string | null }>>(`/dispatch/cartons?factoryId=${encodeURIComponent(id!)}`),
  });

  const demoFactory = FACTORIES.find((f) => f.id === id) ?? FACTORIES[0];
  const demoFactoryJobs = demoJobs.filter((j) => j.factoryId === demoFactory.id);
  const demoFactoryLines = LINES.filter((l) => l.factoryId === demoFactory.id);

  const data: FactoryHierarchyResponse | undefined = isDemoMode
    ? {
        factory: {
          id: demoFactory.id,
          code: demoFactory.code,
          name: demoFactory.name,
          location: demoFactory.location,
          totalLines: demoFactory.totalLines,
          activeLines: demoFactory.activeLines,
          capacity: demoFactory.capacity,
          managerName: 'Priya Subramaniam',
        },
        units: [
          {
            id: `${demoFactory.id}-unit-1`,
            code: `${demoFactory.code}-U1`,
            name: `${demoFactory.name} Main Block`,
            isActive: true,
            departmentsCount: 3,
            linesCount: demoFactoryLines.length,
          },
        ],
        departments: [
          { id: `${demoFactory.id}-dept-cut`, unitId: `${demoFactory.id}-unit-1`, code: 'CUT', name: 'Cutting & Store', isActive: true },
          { id: `${demoFactory.id}-dept-sew`, unitId: `${demoFactory.id}-unit-1`, code: 'SEW', name: 'Sewing & Finishing', isActive: true },
          { id: `${demoFactory.id}-dept-qc`, unitId: `${demoFactory.id}-unit-1`, code: 'QCP', name: 'QC & Packing', isActive: true },
        ],
        lines: demoFactoryLines.map((l) => ({
          id: l.id,
          departmentId: `${demoFactory.id}-dept-sew`,
          code: l.code,
          name: l.name,
          capacity: l.capacity,
          stages: ['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing'],
          isActive: true,
          activeJobsCount: demoFactoryJobs.filter((j) => j.lineId === l.id && j.status === 'active').length,
          targetQty: demoFactoryJobs.filter((j) => j.lineId === l.id).reduce((s, j) => s + j.orderQuantity, 0),
        })),
        metrics: {
          jobs: demoFactoryJobs.length,
          activeJobs: demoFactoryJobs.filter((j) => j.status === 'active').length,
          ordered: demoFactoryJobs.reduce((s, j) => s + j.orderQuantity, 0),
          cut: demoFactoryJobs.reduce((s, j) => s + j.cuttingQty, 0),
          inspected: demoFactoryJobs.reduce((s, j) => s + j.packingQty + j.reworkQty + j.rejectedQty, 0),
          passed: demoFactoryJobs.reduce((s, j) => s + j.packingQty, 0),
          rework: demoFactoryJobs.reduce((s, j) => s + j.reworkQty, 0),
          rejected: demoFactoryJobs.reduce((s, j) => s + j.rejectedQty, 0),
          released: demoFactoryJobs.reduce((s, j) => s + j.packingQty, 0),
          packed: demoFactoryJobs.reduce((s, j) => s + j.packingQty, 0),
          dispatched: demoFactoryJobs.reduce((s, j) => s + Math.floor(j.packingQty * 0.6), 0),
          openIssues: demoFactory.id === 'factory-a' ? 1 : 0,
        },
        workforce: DEMO_USERS.filter((u) => u.factoryId === demoFactory.id || u.role === 'md').map((u) => ({
          id: u.id,
          employeeId: u.id.toUpperCase(),
          name: u.name,
          roleCode: u.role,
          accountStatus: 'active',
          unitId: `${demoFactory.id}-unit-1`,
          departmentId: null,
          lineId: u.lineId ?? null,
        })),
      }
    : hierarchyQuery.data;

  const factoryJobs = isDemoMode
    ? demoFactoryJobs
    : (jobsQuery.data ?? []).filter((j) => j.factoryId === id);

  const visibleDepartments = (data?.departments ?? []).filter(
    (d) => selectedUnitId === 'all' || d.unitId === selectedUnitId,
  );
  const visibleDeptIds = new Set(visibleDepartments.map((d) => d.id));
  const visibleLines = (data?.lines ?? []).filter(
    (l) => selectedUnitId === 'all' || visibleDeptIds.has(l.departmentId),
  );

  const tabOptions = [
    { key: 'overview', label: t('common:overview') || 'Overview' },
    { key: 'units', label: t('production:factoriesAndUnits') || 'Units' },
    { key: 'lines', label: t('production:lines') || 'Lines' },
    { key: 'orders', label: t('production:workOrders') || 'Orders' },
    { key: 'workforce', label: t('production:lineStrength') || 'Workforce' },
    { key: 'inventory', label: t('inventory:storeWorkflows') || 'Store' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={data?.factory.name ?? t('production:factoriesAndUnits')}
        subtitle={
          data
            ? `${data.factory.code} · ${data.factory.location}${data.factory.managerName ? ` · ${data.factory.managerName}` : ''}`
            : ''
        }
        showBack
        onBack={() => router.back()}
      />

      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
        <FilterBar options={tabOptions} selected={sectionTab} onSelect={(k) => setSectionTab(k as typeof sectionTab)} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemoMode ? (
            <RefreshControl
              refreshing={hierarchyQuery.isRefetching}
              onRefresh={() => {
                void hierarchyQuery.refetch();
                void jobsQuery.refetch();
              }}
              tintColor={tokens.brand}
            />
          ) : undefined
        }
      >
        {!isDemoMode && hierarchyQuery.isLoading ? (
          <DashboardSkeleton />
        ) : !isDemoMode && hierarchyQuery.isError ? (
          <View style={{ gap: spacing[3] }}>
            <EmptyState
              title={t('errors:serverError')}
              message={hierarchyQuery.error instanceof Error ? hierarchyQuery.error.message : undefined}
            />
            <AppButton title={t('common:refresh')} onPress={() => void hierarchyQuery.refetch()} />
          </View>
        ) : data ? (
          <>
            {sectionTab === 'overview' && (
              <>
                <ProductionProgressCard
                  title={t('production:floorOutputProgress')}
                  subtitle={`${data.factory.code} · ${data.metrics.activeJobs} ${t('production:activeJobs')}`}
                  actual={data.metrics.packed}
                  target={data.metrics.ordered}
                />

                <View style={styles.grid}>
                  <CompactMetricCard
                    label={t('production:activeLines')}
                    value={`${data.factory.activeLines}/${data.factory.totalLines}`}
                    tone="brand"
                    icon={<Layers size={15} color={tokens.brand} />}
                    onPress={() => setSectionTab('lines')}
                  />
                  <CompactMetricCard
                    label={t('production:capacity')}
                    value={data.factory.capacity}
                    tone="default"
                    icon={<Building2 size={15} color={tokens.textPrimary} />}
                  />
                  <CompactMetricCard
                    label={t('production:activeJobs')}
                    value={data.metrics.activeJobs}
                    tone="success"
                    icon={<ClipboardList size={15} color={tokens.successText} />}
                    onPress={() => setSectionTab('orders')}
                  />
                  <CompactMetricCard
                    label={t('production:criticalAlerts')}
                    value={data.metrics.openIssues}
                    tone={data.metrics.openIssues > 0 ? 'danger' : 'success'}
                    icon={<AlertTriangle size={15} color={data.metrics.openIssues > 0 ? tokens.dangerText : tokens.successText} />}
                  />
                </View>

                <DashboardSection title={t('production:activeStages')} />
                <StagePipeline
                  maxTotal={Math.max(1, data.metrics.ordered)}
                  stages={[
                    { key: 'cut', label: t('production:cuttingPieces'), quantity: data.metrics.cut, tone: 'brand' },
                    { key: 'insp', label: t('production:actualInspected'), quantity: data.metrics.inspected, tone: 'brand' },
                    { key: 'rel', label: t('production:bundleWorkflow_release'), quantity: data.metrics.released, tone: 'success' },
                    { key: 'pack', label: t('production:packingPieces'), quantity: data.metrics.packed, tone: 'success' },
                    { key: 'disp', label: t('production:actualDispatched'), quantity: data.metrics.dispatched, tone: 'brand' },
                  ]}
                />

                <DashboardSection title={t('quality:qualityBalanceEquation')} />
                <QualitySummaryCard
                  inspected={data.metrics.inspected}
                  passed={data.metrics.passed}
                  rework={data.metrics.rework}
                  rejected={data.metrics.rejected}
                  released={data.metrics.released}
                  labels={{
                    passed: t('quality:passed'),
                    rework: t('quality:rework'),
                    rejected: t('quality:rejected'),
                    released: t('production:bundleWorkflow_release'),
                    passRate: t('quality:inspected'),
                  }}
                />

                <DashboardSection title={t('reports:reportsAndLogs')} />
                <View style={styles.grid}>
                  <DashboardQuickAction
                    icon={<BarChart3 size={18} color={tokens.brand} />}
                    label={t('reports:reportsAndLogs')}
                    onPress={() => router.push('/(app)/(tabs)/reports')}
                  />
                  <DashboardQuickAction
                    icon={<AlertTriangle size={18} color={tokens.warningText} />}
                    label={t('production:bottleneckAnalytics')}
                    onPress={() => router.push('/(app)/md/bottlenecks')}
                  />
                </View>
              </>
            )}

            {sectionTab === 'units' && (
              <>
                <DashboardSection title={t('production:factoriesAndUnits')} count={data.units.length} />
                <View style={{ gap: spacing[2] }}>
                  {data.units.map((u) => {
                    const active = selectedUnitId === u.id;
                    return (
                      <AppCard
                        key={u.id}
                        padding={spacing[3.5]}
                        style={{ borderColor: active ? tokens.brand : tokens.border, borderWidth: active ? 1.5 : 1 }}
                      >
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="label" bold>{u.name}</AppText>
                            <AppText variant="caption" color="secondary" mono>
                              {u.code} · {u.departmentsCount} Depts · {u.linesCount} Lines
                            </AppText>
                          </View>
                          <AppButton
                            title={active ? t('common:all') : t('common:viewAll')}
                            size="sm"
                            variant={active ? 'primary' : 'outline'}
                            onPress={() => setSelectedUnitId(active ? 'all' : u.id)}
                          />
                        </View>
                      </AppCard>
                    );
                  })}
                </View>

                <DashboardSection title={t('production:activeStages')} count={visibleDepartments.length} />
                <View style={{ gap: spacing[2] }}>
                  {visibleDepartments.map((d) => (
                    <AppCard key={d.id} padding={spacing[3]}>
                      <View style={styles.rowBetween}>
                        <View>
                          <AppText variant="label" bold>{d.name}</AppText>
                          <AppText variant="caption" color="secondary" mono>{d.code}</AppText>
                        </View>
                        <StatusBadge label="ACTIVE" variant="success" size="sm" />
                      </View>
                    </AppCard>
                  ))}
                </View>

                <DashboardSection title="Department Stage Flow" />
                <AppCard padding={spacing[3.5]}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
                    {DEPARTMENT_STAGES.map((stage) => (
                      <StatusBadge key={stage} label={stage} variant="info" size="sm" />
                    ))}
                  </View>
                </AppCard>
              </>
            )}

            {sectionTab === 'lines' && (
              <>
                <DashboardSection title={t('production:lines')} count={visibleLines.length} />
                {visibleLines.length === 0 ? (
                  <EmptyState title={t('common:noData')} />
                ) : (
                  <View style={{ gap: spacing[2] }}>
                    {visibleLines.map((line) => (
                      <WorkOrderPreview
                        key={line.id}
                        code={line.code}
                        title={line.name}
                        subtitle={`${t('production:capacity')}: ${line.capacity} · ${line.activeJobsCount} ${t('production:activeJobs')} · ${line.targetQty.toLocaleString()} ${t('common:pieces')}`}
                        statusLabel={line.isActive ? 'ACTIVE' : 'INACTIVE'}
                        statusVariant={line.isActive ? 'success' : 'neutral'}
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/md/line/[id]' as never,
                            params: { id: line.id, factoryId: data.factory.id },
                          } as never)
                        }
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {sectionTab === 'orders' && (
              <>
                <DashboardSection title={t('production:workOrders')} count={factoryJobs.length} />
                {factoryJobs.length === 0 ? (
                  <EmptyState title={t('common:noData')} />
                ) : (
                  <View style={{ gap: spacing[2] }}>
                    {factoryJobs.map((job) => (
                      <WorkOrderPreview
                        key={job.id}
                        code={job.jobCode}
                        title={`${job.styleName || ''} · ${job.buyerName || ''}`}
                        subtitle={`${job.lineName || 'Line'} · ${job.orderQuantity.toLocaleString()} ${t('common:pieces')}`}
                        statusLabel={job.status.toUpperCase()}
                        statusVariant={job.status === 'active' ? 'success' : job.status === 'on-hold' ? 'danger' : 'warning'}
                        progressPct={job.orderQuantity > 0 ? Math.round((job.packingQty / job.orderQuantity) * 100) : 0}
                        onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {sectionTab === 'workforce' && (
              <>
                <DashboardSection title={t('production:lineStrength')} count={data.workforce.length} />
                {data.workforce.length === 0 ? (
                  <EmptyState title={t('common:noData')} />
                ) : (
                  <View style={{ gap: spacing[2] }}>
                    {data.workforce.map((emp) => (
                      <AppCard key={emp.id} padding={spacing[3]}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="label" bold>{emp.name}</AppText>
                            <AppText variant="caption" color="secondary" mono>
                              {emp.employeeId} · {t(`common:roles.${emp.roleCode}`)}
                            </AppText>
                          </View>
                          <StatusBadge
                            label={emp.accountStatus.toUpperCase()}
                            variant={emp.accountStatus === 'active' ? 'success' : 'warning'}
                            size="sm"
                          />
                        </View>
                      </AppCard>
                    ))}
                  </View>
                )}
              </>
            )}

            {sectionTab === 'inventory' && (
              <>
                <DashboardSection title={t('inventory:storeWorkflows')} />
                <View style={styles.grid}>
                  <CompactMetricCard
                    label={t('inventory:rawInputIn')}
                    value={isDemoMode ? 4 : (stockQuery.data?.length ?? 0)}
                    tone="brand"
                    icon={<Boxes size={15} color={tokens.brand} />}
                  />
                  <CompactMetricCard
                    label={t('inventory:fgCartons')}
                    value={isDemoMode ? 3 : (cartonsQuery.data?.length ?? 0)}
                    tone="success"
                    icon={<Truck size={15} color={tokens.successText} />}
                  />
                </View>
                <View style={{ marginTop: spacing[3] }}>
                  <AppButton
                    title={t('inventory:dispatchManifest')}
                    variant="outline"
                    onPress={() => router.push('/(app)/store/dispatch')}
                  />
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[2] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[2.5],
    marginTop: spacing[2.5],
  },
});
