import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { ProductionOutputCard } from '../../design-system/components/ProductionOutputCard';
import { MetricCard } from '../../design-system/components/MetricCard';
import { ProductionLineRow } from '../../design-system/components/ProductionLineRow';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { JobTicketCard } from '../../design-system/components/JobTicketCard';
import { FilterBar } from '../../design-system/components/FilterBar';
import { EmptyState } from '../../design-system/components/EmptyState';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { TODAY_SHIFT, ALERTS } from '../../fixtures/mockData';
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
  TrendingUp,
  AlertCircle,
  Layers,
  RotateCcw,
} from 'lucide-react-native';

export function FMDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality', 'reports']);

  const ops: QuickOperation[] = [
    {
      id: 'create-job',
      icon: <Plus size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.4} />,
      label: t('production:createJob'),
      onPress: () => router.push('/(app)/jobs/create'),
    },
    {
      id: 'view-jobs',
      icon: <ClipboardList size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:workOrders'),
      onPress: () => router.push('/(app)/jobs'),
    },
    {
      id: 'masters',
      icon: <FolderKanban size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:masters'),
      onPress: () => router.push('/(app)/masters'),
    },
    {
      id: 'planning',
      icon: <Timer size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:samPlan'),
      onPress: () => router.push('/(app)/planning/sam-entry'),
    },
    {
      id: 'workforce',
      icon: <Users size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:lineStrength'),
      onPress: () => router.push('/(app)/planning/workforce'),
    },
    {
      id: 'approvals',
      icon: <CheckCircle2 size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:approvals'),
      badge: 2,
      onPress: () => router.push('/(app)/approvals'),
    },
    {
      id: 'users',
      icon: <UserCheck size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:floorAccess'),
      onPress: () => router.push('/(app)/management/users'),
    },
    {
      id: 'tags',
      icon: <Tag size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:tagReprints'),
      onPress: () => router.push('/(app)/management/tags'),
    },
    {
      id: 'reports',
      icon: <BarChart3 size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('reports:reports'),
      onPress: () => router.push('/(app)/(tabs)/reports'),
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      {/* 1. Premium StitchFlow Brand Header with Logo, Subtitle & Demo Status */}
      <BrandHeader subtitle={`${user?.factoryName ?? 'Factory Unit 1'} · ${t('common:shift')} A`} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Personalized Greeting & Shift Context */}
        <View style={styles.welcomeSection}>
          <AppText variant="h2" bold style={{ color: tokens.textPrimary, letterSpacing: -0.4 }}>
            {t('common:goodMorning', { name: user?.name?.split(' ')[0] ?? 'Manager' })}
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {t('production:shiftAActiveLines')}
          </AppText>
        </View>

        {/* 3. Production Output Hero Card */}
        <SectionTitle title={t('production:productionOutput')} subtitle={t('production:shiftOutputVsTarget')} />
        <ProductionOutputCard
          actualQty={TODAY_SHIFT.actualQty}
          targetQty={TODAY_SHIFT.targetQty}
          unit="pcs"
          title={t('production:floorOutputProgress')}
          subtitle={t('production:lineTargetSummary', { target: TODAY_SHIFT.targetQty.toLocaleString() })}
          pacePerHour={TODAY_SHIFT.pacePerHour}
        />

        {/* 4. Compact 2x2 Floor Health Bento Grid */}
        <SectionTitle title={t('production:floorHealthMetrics')} subtitle={t('production:realtimeBalance')} />
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCol}>
            <MetricCard
              label={t('production:lineEfficiency')}
              value={`${Math.round(jobs.reduce((s, j) => s + j.efficiency, 0) / (jobs.length || 1))}%`}
              trend={{ value: '+4.2%', isPositive: true }}
              icon={<TrendingUp size={14} color={tokens.success} strokeWidth={2.4} />}
              variant="brand"
              compact
            />
            <MetricCard
              label={t('production:defectRate')}
              value={`${((jobs.reduce((s, j) => s + j.rejectedQty, 0) / (jobs.reduce((s, j) => s + j.cuttingQty, 0) || 1)) * 100).toFixed(1)}%`}
              trend={{ value: '-0.4%', isPositive: true }}
              icon={<AlertCircle size={14} color={tokens.warning} strokeWidth={2.4} />}
              variant="default"
              compact
            />
          </View>
          <View style={styles.bentoCol}>
            <MetricCard
              label={t('production:workInProgress')}
              value={jobs.reduce((s, j) => s + Math.max(0, j.cuttingQty - j.packingQty), 0).toLocaleString()}
              unit="pcs"
              subLabel={t('common:activeJobsCount', { count: jobs.filter((j) => j.status === 'active').length })}
              icon={<Layers size={14} color={tokens.info} strokeWidth={2.4} />}
              variant="default"
              compact
            />
            <MetricCard
              label={t('quality:reworkQueue')}
              value={jobs.reduce((s, j) => s + j.reworkQty, 0).toLocaleString()}
              unit="pcs"
              trend={{ value: `-${TODAY_SHIFT.reworkQty} shift`, isPositive: true }}
              icon={<RotateCcw size={14} color={tokens.danger} strokeWidth={2.4} />}
              variant="warning"
              compact
            />
          </View>
        </View>

        {/* 5. Production Line Status */}
        <View style={styles.titleRow}>
          <SectionTitle title={t('production:linePerformance')} subtitle={t('production:activeStages')} />
          <TouchableOpacity onPress={() => router.push('/(app)/planning/workforce')}>
            <AppText variant="caption" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
              {t('common:viewAll')} ({jobs.length})
            </AppText>
          </TouchableOpacity>
        </View>
        {jobs.slice(0, 3).map((j) => (
          <ProductionLineRow
            key={j.id}
            lineId={j.lineId}
            lineName={`${j.lineName} — ${j.styleName}`}
            actualQty={j.sewingOutQty}
            targetQty={j.orderQuantity}
            status={j.efficiency >= 80 ? 'running' : 'delayed'}
            onPress={() => router.push(`/(app)/jobs/${j.id}`)}
          />
        ))}

        {/* 6. Quick Operations Grid — Compact Industrial Action Tiles */}
        <SectionTitle title={t('production:factoryOperations')} subtitle={t('production:managementControls')} />
        <QuickOperationsGrid operations={ops} columns={3} />

        {/* 7. Active Work Orders — Garment Hang-Tag Ticket Styling */}
        <View style={styles.titleRow}>
          <SectionTitle title={t('production:activeWorkOrders')} subtitle={t('production:scheduledJobs')} />
          <TouchableOpacity onPress={() => router.push('/(app)/jobs')}>
            <AppText variant="caption" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
              {t('common:viewAll')} ({jobs.length})
            </AppText>
          </TouchableOpacity>
        </View>

        {jobs
          .filter((j) => j.status === 'active')
          .slice(0, 3)
          .map((job) => (
            <JobTicketCard
              key={job.id}
              job={job}
              onPress={() => router.push(`/(app)/jobs/${job.id}`)}
            />
          ))}

        {/* 8. Plant Alerts */}
        <SectionTitle title={t('production:plantAlerts')} subtitle={t('production:floorExceptions')} />
        {ALERTS.slice(0, 2).map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertRow,
              {
                borderLeftColor: alert.severity === 'critical' ? tokens.danger : tokens.warning,
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
                {alert.title}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {alert.message}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function FMWork() {
  const { tokens } = useThemeStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const [filter, setFilter] = useState('all');

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
        ListEmptyComponent={<EmptyState title={t('production:noJobsFound')} />}
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
});
