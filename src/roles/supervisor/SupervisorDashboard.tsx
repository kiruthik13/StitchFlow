import { LiveDashboardPanel } from '../../features/operations/LiveDashboardPanels';
import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { MetricCard } from '../../design-system/components/MetricCard';
import { ShiftProgressCard } from '../../design-system/components/ShiftProgressCard';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { JobTicketCard } from '../../design-system/components/JobTicketCard';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { TODAY_SHIFT } from '../../fixtures/mockData';
import {
  ClipboardList,
  Users,
  Timer,
  Tag,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';

export function SupervisorDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality']);

  const supervisorOps: QuickOperation[] = [
    {
      id: 'assignment',
      icon: <ClipboardList size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:workAssignment'),
      onPress: () => router.push('/(app)/operations/work-assignment'),
    },
    {
      id: 'tailor-map',
      icon: <Users size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:tailorMapping'),
      onPress: () => router.push('/(app)/operations/tailor-mapping'),
    },
    {
      id: 'sam-monitor',
      icon: <Timer size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:samMonitor'),
      onPress: () => router.push('/(app)/operations/sam-monitor'),
    },
    {
      id: 'tag-reprint',
      icon: <Tag size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:tagReprints'),
      onPress: () => router.push('/(app)/operations/tag-reprint'),
    },
  ];

  const liveDashboard = !useAuthStore(state => state.isDemoMode);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={liveDashboard ? user?.name : `${user?.lineName ?? 'Line 1'} · ${user?.factoryName ?? 'Tirupur Unit 1'}`}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {liveDashboard ? <LiveDashboardPanel /> : <>
        {/* Shift KPIs 2x2 Bento Grid */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:lineKPIs')}
        </AppText>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCol}>
            <MetricCard
              label={t('production:lineEfficiency')}
              value="77%"
              trend={{ value: '+2.1%', isPositive: true }}
              icon={<TrendingUp size={14} color={tokens.warning} strokeWidth={2.4} />}
              variant="warning"
            />
            <MetricCard
              label={t('production:wipPieces')}
              value="1,200"
              unit="pcs"
              icon={<Layers size={14} color={tokens.info} strokeWidth={2.4} />}
              variant="default"
            />
          </View>
          <View style={styles.kpiCol}>
            <MetricCard
              label={t('production:packedOutput')}
              value="760"
              unit="pcs"
              icon={<ClipboardList size={14} color={tokens.success} strokeWidth={2.4} />}
              variant="success"
            />
            <MetricCard
              label={t('quality:reworkQueue')}
              value="45"
              unit="pcs"
              trend={{ value: '-5 pcs', isPositive: true }}
              icon={<AlertTriangle size={14} color={tokens.danger} strokeWidth={2.4} />}
              variant="danger"
            />
          </View>
        </View>

        {/* Shift Progress */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:shiftScheduleProgress')}
        </AppText>
        <ShiftProgressCard shift={TODAY_SHIFT} />

        {/* Bottleneck Alert Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/operations/sam-monitor')}
          activeOpacity={0.8}
          style={{ marginTop: spacing[3], marginBottom: spacing[1] }}
        >
          <View
            style={[
              styles.bottleneckBanner,
              {
                backgroundColor: tokens.dangerLight,
                borderColor: tokens.danger,
              },
            ]}
          >
            <View style={styles.alertIconWrap}>
              <AlertTriangle size={18} color={tokens.danger} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold style={{ color: tokens.danger }}>
                {t('production:bottleneckAlertIroning')}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {t('production:bottleneckAlertSub')}
              </AppText>
            </View>
            <ArrowRight size={16} color={tokens.danger} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        {/* Quick Operations Links */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:supervisorActions')}
        </AppText>
        <QuickOperationsGrid operations={supervisorOps} columns={2} />

        {/* Line Job Status */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:lineJobsAndOrders')}
        </AppText>
        {jobs.map((job) => (
          <JobTicketCard
            key={job.id}
            job={job}
            onPress={() => router.push(`/(app)/jobs/${job.id}`)}
          />
        ))}
        </>}
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
});
