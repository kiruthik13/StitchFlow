import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge, jobStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { MetricCard } from '../../../src/design-system/components/MetricCard';
import { ShiftProgressCard } from '../../../src/design-system/components/ShiftProgressCard';
import { GarmentTicketCard } from '../../../src/design-system/components/GarmentTicketCard';
import { QuickOperationsGrid, QuickOperation } from '../../../src/design-system/components/QuickOperationsGrid';
import { BottomScanAction } from '../../../src/design-system/components/BottomScanAction';
import { LanguageSwitcher } from '../../../src/design-system/components/LanguageSwitcher';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import {
  TODAY_SHIFT,
  ALERTS,
  FACTORIES,
  JOBS,
  BUNDLES,
  PRODUCTION_STAGES,
  QC_INSPECTIONS,
  REWORK_TASKS,
  STOCK_ITEMS,
  CARTONS,
} from '../../../src/fixtures/mockData';
import { ROLE_DISPLAY_NAMES } from '../../../src/core/permissions';
import { UserRole } from '../../../src/core/types';

// ─────────────────────────────────────────────────────────────────────────────
// Root Dashboard — dispatches to role-specific dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeTabScreen() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  if (!user || !role) return null;

  switch (role) {
    case 'md':              return <MDDashboard />;
    case 'factory-manager': return <FMDashboard />;
    case 'supervisor':      return <SupervisorDashboard />;
    case 'operator':        return <OperatorDashboard />;
    case 'qc-inspector':    return <QCDashboard />;
    case 'store-dispatch':  return <StoreDashboard />;
    case 'packing-staff':   return <PackingDashboard />;
    default:                return <OperatorDashboard />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function DemoBanner() {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.demoBanner, { backgroundColor: tokens.warningLight }]}>
      <AppText variant="caption" style={{ color: tokens.warning }}>
        ⚠️ DEMO MODE — Showing realistic mock data. Not connected to any server.
      </AppText>
    </View>
  );
}

function DashHeader({ title, subtitle, rightEl }: { title: string; subtitle?: string; rightEl?: React.ReactNode }) {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.dashHeader, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + spacing[3] }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>{title}</AppText>
        {subtitle && <AppText variant="caption" color="secondary">{subtitle}</AppText>}
      </View>
      {rightEl}
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { tokens } = useThemeStore();
  return (
    <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[4] }}>
      {label}
    </AppText>
  );
}

function AlertRow({ alert, tokens }: { alert: any; tokens: any }) {
  const sevColor: Record<string, string> = {
    critical: tokens.danger,
    high: tokens.danger,
    medium: tokens.warning,
    low: tokens.textSecondary,
  };
  return (
    <View style={[styles.alertRow, { borderLeftColor: sevColor[alert.severity], backgroundColor: tokens.surfaceSecondary }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="label" bold style={{ color: tokens.textPrimary }}>{alert.title}</AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>{alert.message}</AppText>
      </View>
      <StatusBadge label={alert.severity} variant={alert.severity === 'critical' || alert.severity === 'high' ? 'danger' : 'warning'} size="sm" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MD DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function MDDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title="StitchFlow Manufacturing"
        subtitle="Executive Overview"
        rightEl={
          <View style={[styles.avatarCircle, { backgroundColor: tokens.brandLight }]}>
            <AppText variant="label" color="brand" bold>{user?.avatarInitials}</AppText>
          </View>
        }
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]} showsVerticalScrollIndicator={false}>

        {/* KPI Grid */}
        <SectionTitle label="Group Summary" />
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label="Factories" value="2" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Active Jobs" value="4" variant="brand" compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label="Overall Eff." value="77%" variant="warning" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Pending QC" value="380" variant="warning" compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label="Total Packed" value="1,476" variant="success" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Rework" value="77" variant="danger" compact /></View>
        </View>

        {/* Factory Comparison */}
        <SectionTitle label="Factory Performance" />
        {FACTORIES.map((factory) => {
          const eff = factory.id === 'factory-a' ? 82 : 68;
          const effVariant = eff >= 80 ? tokens.success : eff >= 70 ? tokens.warning : tokens.danger;
          return (
            <TouchableOpacity key={factory.id} onPress={() => {}} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
              <AppCard padding={spacing[4]}>
                <View style={styles.factoryRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{factory.name}</AppText>
                    <AppText variant="caption" color="secondary">{factory.location}</AppText>
                    <AppText variant="caption" color="secondary">{factory.activeLines}/{factory.totalLines} lines active</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText style={{ fontSize: 28, fontWeight: '800', color: effVariant, fontFamily: 'JetBrainsMono_700Bold' }}>{eff}%</AppText>
                    <AppText variant="caption" color="secondary">efficiency</AppText>
                  </View>
                </View>
                <View style={[styles.progressBg, { backgroundColor: tokens.surfaceSecondary, marginTop: spacing[2] }]}>
                  <View style={[styles.progressFill, { backgroundColor: effVariant, width: `${eff}%` as any }]} />
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        })}

        {/* Alerts */}
        <SectionTitle label="Critical Alerts" />
        {ALERTS.filter((a) => !a.isRead).map((alert) => (
          <AlertRow key={alert.id} alert={alert} tokens={tokens} />
        ))}

        {/* High-risk jobs */}
        <SectionTitle label="High-Risk Jobs" />
        <AppCard padding={spacing[4]}>
          <View style={styles.riskRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold mono>JOB-1003</AppText>
              <AppText variant="caption" color="secondary">Linen Shirt — Zara International</AppText>
              <AppText variant="caption" style={{ color: tokens.danger, marginTop: 2 }}>⚠ On Hold — Fabric shortage</AppText>
            </View>
            <StatusBadge label="ON HOLD" variant="warning" size="sm" />
          </View>
        </AppCard>

        {/* Dispatch summary */}
        <SectionTitle label="Dispatch Performance" />
        <AppCard padding={spacing[4]}>
          <View style={styles.dispatchRow}>
            <StatCell label="Sealed Cartons" value="2" color={tokens.textPrimary} />
            <StatCell label="Dispatched Today" value="0" color={tokens.textPrimary} />
            <StatCell label="Pending Dispatch" value="48" color={tokens.warning} />
          </View>
        </AppCard>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FACTORY MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function FMDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const ops: QuickOperation[] = [
    { id: 'create-job', icon: <AppText style={{ fontSize: 20 }}>＋</AppText>, label: 'Create Job', onPress: () => router.push('/(app)/jobs/') },
    { id: 'view-jobs', icon: <AppText style={{ fontSize: 20 }}>📋</AppText>, label: 'View Jobs', onPress: () => router.push('/(app)/jobs/') },
    { id: 'masters', icon: <AppText style={{ fontSize: 20 }}>🗂</AppText>, label: 'Masters', onPress: () => {} },
    { id: 'reports', icon: <AppText style={{ fontSize: 20 }}>📊</AppText>, label: 'Reports', onPress: () => {} },
    { id: 'users', icon: <AppText style={{ fontSize: 20 }}>👥</AppText>, label: 'Users', onPress: () => {} },
    { id: 'approvals', icon: <AppText style={{ fontSize: 20 }}>✅</AppText>, label: 'Approvals', badge: 2, onPress: () => {} },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title={user?.factoryName ?? 'Factory'}
        subtitle={`Factory Manager · ${TODAY_SHIFT.shiftType} shift`}
        rightEl={
          <View style={[styles.avatarCircle, { backgroundColor: tokens.brandLight }]}>
            <AppText variant="label" color="brand" bold>{user?.avatarInitials}</AppText>
          </View>
        }
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]} showsVerticalScrollIndicator={false}>

        <SectionTitle label="Shift Overview" />
        <ShiftProgressCard shift={TODAY_SHIFT} />

        <SectionTitle label="Quick Actions" />
        <QuickOperationsGrid operations={ops} columns={3} />

        <SectionTitle label="Active Jobs" />
        {jobs.filter((j) => j.status === 'active').map((job) => (
          <TouchableOpacity key={job.id} onPress={() => router.push(`/(app)/jobs/${job.id}`)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
            <AppCard padding={spacing[3]}>
              <View style={styles.jobCompact}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{job.jobCode}</AppText>
                  <AppText variant="bodySmall" color="secondary">{job.styleName} · {job.buyerName}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <StatusBadge label="ACTIVE" variant="success" size="sm" />
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>{job.efficiency}% eff</AppText>
                </View>
              </View>
              <View style={styles.jobStats}>
                <MiniStat label="Order" value={String(job.orderQuantity)} />
                <MiniStat label="Packed" value={String(job.packingQty)} />
                <MiniStat label="Rework" value={String(job.reworkQty)} color={tokens.danger} />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}

        <SectionTitle label="Alerts" />
        {ALERTS.slice(0, 2).map((a) => <AlertRow key={a.id} alert={a} tokens={tokens} />)}

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUPERVISOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function SupervisorDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const kpis = [
    { label: 'Total Jobs', value: '4', variant: 'default' as const },
    { label: 'Active', value: '3', variant: 'brand' as const },
    { label: 'WIP', value: '1,200', variant: 'default' as const },
    { label: 'Packed', value: '760', variant: 'success' as const },
    { label: 'Rework', value: '45', variant: 'danger' as const },
    { label: 'Efficiency', value: '77%', variant: 'warning' as const },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title="Production Dashboard"
        subtitle={`${user?.lineName ?? 'Line 1'} · ${user?.factoryName}`}
        rightEl={<LanguageSwitcher compact />}
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]} showsVerticalScrollIndicator={false}>

        {/* KPI horizontal scroll */}
        <SectionTitle label="Today's KPIs" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[2] }}>
          <View style={styles.kpiRow}>
            {kpis.map((k, i) => (
              <View key={i} style={[styles.kpiCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.5 }}>{k.label}</AppText>
                <MetricCard label="" value={k.value} variant={k.variant} compact />
              </View>
            ))}
          </View>
        </ScrollView>

        <SectionTitle label="Shift Progress" />
        <ShiftProgressCard shift={TODAY_SHIFT} />

        {/* Bottleneck alert */}
        <View style={[styles.bottleneckBanner, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
          <AppText variant="label" style={{ color: tokens.danger }}>⚠ Bottleneck: Ironing Stage</AppText>
          <AppText variant="caption" color="secondary">240 pcs queued · JOB-1001 · Expected delay 3h</AppText>
        </View>

        <SectionTitle label="Job Status" />
        {jobs.map((job) => (
          <TouchableOpacity key={job.id} onPress={() => router.push(`/(app)/jobs/${job.id}`)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
            <AppCard padding={spacing[3]}>
              <View style={styles.jobCompact}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{job.jobCode}</AppText>
                  <AppText variant="caption" color="secondary">{job.styleName}</AppText>
                </View>
                <StatusBadge label={job.status.replace('-', ' ').toUpperCase()} variant={jobStatusBadge(job.status)} size="sm" />
              </View>
              <View style={styles.jobStats}>
                <MiniStat label="Cut" value={String(job.cuttingQty)} />
                <MiniStat label="WIP" value={String(job.sewingOutQty)} />
                <MiniStat label="Packed" value={String(job.packingQty)} />
                <MiniStat label="Eff" value={`${job.efficiency}%`} color={job.efficiency >= 80 ? tokens.success : tokens.warning} />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}

        <SectionTitle label="Quick Links" />
        <View style={styles.quickLinks}>
          {['Work Assignment', 'SAM Monitor', 'Stage Matrix', 'Rework', 'Tag Reprint'].map((label) => (
            <TouchableOpacity key={label} style={[styles.quickChip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <AppText variant="label" color="brand">{label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. OPERATOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function OperatorDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles, recentScans } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const myBundle = bundles.find((b) => b.operatorId === user?.id) ?? bundles[0];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title={`Hi, ${user?.name?.split(' ')[0] ?? 'Operator'}!`}
        subtitle={`${user?.lineName ?? 'Line 1'} · Morning Shift`}
        rightEl={<LanguageSwitcher compact />}
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Output today */}
        <SectionTitle label="My Output Today" />
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label="Completed" value="267" variant="success" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Target" value="320" compact /></View>
        </View>

        {/* Current assignment */}
        {myBundle && (
          <>
            <SectionTitle label="Current Assignment" />
            <GarmentTicketCard bundle={myBundle} />
          </>
        )}

        {/* Rework tasks */}
        {REWORK_TASKS.filter((r) => r.assignedTo?.includes('Kavitha')).length > 0 && (
          <>
            <SectionTitle label="Rework Tasks" />
            {REWORK_TASKS.filter((r) => r.assignedTo?.includes('Kavitha')).map((rw) => (
              <AppCard key={rw.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.riskRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" bold mono>{rw.bundleCode}</AppText>
                    <AppText variant="caption" color="secondary">{rw.defectDescription}</AppText>
                    <AppText variant="caption" color="secondary">Qty: {rw.quantity} pcs · Due: {rw.dueDate}</AppText>
                  </View>
                  <StatusBadge label={rw.status} variant={rw.status === 'in-progress' ? 'warning' : 'neutral'} size="sm" />
                </View>
              </AppCard>
            ))}
          </>
        )}

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <>
            <SectionTitle label="Recent Scans" />
            {recentScans.slice(0, 3).map((code, i) => (
              <View key={i} style={[styles.scanRow, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <AppText variant="code" mono style={{ color: tokens.textPrimary }}>{code}</AppText>
                <AppText variant="caption" color="secondary">Just now</AppText>
              </View>
            ))}
          </>
        )}

      </ScrollView>

      {/* Fixed bottom scan CTA */}
      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label="Scan Barcode / QR to Work"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QC INSPECTOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function QCDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pendingBundles = bundles.filter((b) => b.status === 'qc-pending');
  const completedInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title="QC Dashboard"
        subtitle={`${user?.factoryName} · Inspector: ${user?.name}`}
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Pending queue */}
        <SectionTitle label="Inspection Queue" />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.qcQueueHeader}>
            <View>
              <AppText style={{ fontSize: 48, fontWeight: '800', color: pendingBundles.length > 0 ? tokens.warning : tokens.success, fontFamily: 'JetBrainsMono_700Bold' }}>
                {pendingBundles.length}
              </AppText>
              <AppText variant="caption" color="secondary">Bundles pending inspection</AppText>
            </View>
            <AppButton title="Start Inspection" size="sm" onPress={() => router.push('/(app)/(tabs)/scan')} />
          </View>
        </AppCard>

        {pendingBundles.map((b) => (
          <AppCard key={b.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.jobCompact}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                <AppText variant="caption" color="secondary">{b.styleName} · {b.color} · {b.size}</AppText>
                <AppText variant="caption" color="secondary">Qty: {b.quantity} pcs</AppText>
              </View>
              <StatusBadge label="QC PENDING" variant="warning" size="sm" />
            </View>
          </AppCard>
        ))}

        {/* Today's QC stats */}
        <SectionTitle label="Today's QC Summary" />
        <AppCard padding={spacing[4]}>
          <View style={styles.qcStats}>
            <QCStat label="Inspected" value={completedInspection?.inspectedQty ?? 200} color={tokens.textPrimary} />
            <QCStat label="Passed" value={completedInspection?.passedQty ?? 180} color={tokens.success} />
            <QCStat label="Rework" value={completedInspection?.reworkQty ?? 15} color={tokens.warning} />
            <QCStat label="Rejected" value={completedInspection?.rejectedQty ?? 5} color={tokens.danger} />
          </View>
          <View style={[styles.releaseNote, { backgroundColor: tokens.brandLight, borderColor: tokens.brand }]}>
            <AppText variant="caption" style={{ color: tokens.brand }}>
              ✓ Released: {completedInspection?.releasedQty ?? 180} pcs
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              Note: Only QC-passed pieces are released. 20 pcs (rework+rejected) are NOT released.
            </AppText>
          </View>
        </AppCard>

        {/* Rework management */}
        <SectionTitle label="Rework Tracking" />
        {REWORK_TASKS.map((rw) => (
          <AppCard key={rw.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.riskRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" bold mono>{rw.bundleCode}</AppText>
                <AppText variant="caption" color="secondary">{rw.defectDescription}</AppText>
                <AppText variant="caption" color="secondary">Qty: {rw.quantity} · Assigned: {rw.assignedTo ?? 'Unassigned'}</AppText>
              </View>
              <StatusBadge label={rw.status} variant={rw.status === 'in-progress' ? 'warning' : rw.status === 'completed' ? 'success' : 'neutral'} size="sm" />
            </View>
          </AppCard>
        ))}

      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label="Scan Bundle for Inspection"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STORE / DISPATCH DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function StoreDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const lowStock = STOCK_ITEMS.filter((s) => s.currentStock < s.minimumStock);

  const ops: QuickOperation[] = [
    { id: 'input-in', icon: <AppText style={{ fontSize: 18 }}>📥</AppText>, label: 'Input In', onPress: () => {} },
    { id: 'input-out', icon: <AppText style={{ fontSize: 18 }}>📤</AppText>, label: 'Input Out', onPress: () => {} },
    { id: 'output-in', icon: <AppText style={{ fontSize: 18 }}>📦</AppText>, label: 'Output In', onPress: () => {} },
    { id: 'output-out', icon: <AppText style={{ fontSize: 18 }}>🚚</AppText>, label: 'Output Out', onPress: () => {} },
    { id: 'transfer', icon: <AppText style={{ fontSize: 18 }}>🔄</AppText>, label: 'Transfer', onPress: () => {} },
    { id: 'dispatch', icon: <AppText style={{ fontSize: 18 }}>✈️</AppText>, label: 'Dispatch', onPress: () => {} },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title="Store & Dispatch"
        subtitle={user?.factoryName ?? 'Factory A'}
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Low stock alert */}
        {lowStock.map((s) => (
          <View key={s.id} style={[styles.stockAlert, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
            <AppText variant="label" bold style={{ color: tokens.danger }}>⚠ LOW STOCK: {s.name}</AppText>
            <AppText variant="caption" color="secondary">Current: {s.currentStock} {s.unit} / Min: {s.minimumStock} {s.unit} · {s.locationName}</AppText>
          </View>
        ))}

        {/* Stats */}
        <SectionTitle label="Movement Summary (Today)" />
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label="Input In" value="3" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Output Out" value="2" compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label="FG Cartons" value="48" variant="brand" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Pending Dispatch" value="48" variant="warning" compact /></View>
        </View>

        <SectionTitle label="Quick Operations" />
        <QuickOperationsGrid operations={ops} columns={3} />

        {/* Finished goods summary */}
        <SectionTitle label="Finished Goods Store" />
        {CARTONS.map((c) => (
          <AppCard key={c.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.jobCompact}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · {c.size}</AppText>
                <AppText variant="caption" color="secondary">Qty: {c.quantity} pcs · Packed by: {c.packedBy}</AppText>
              </View>
              <StatusBadge label={c.status.toUpperCase()} variant={c.status === 'sealed' ? 'success' : c.status === 'open' ? 'warning' : 'neutral'} size="sm" />
            </View>
          </AppCard>
        ))}

      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label="Scan for Stock Movement"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PACKING DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function PackingDashboard() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedSize, setSelectedSize] = React.useState('L');

  const packingBundle = bundles.find((b) => b.status === 'packing') ?? bundles[2];
  const packingQCInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashHeader
        title="Packing Dashboard"
        subtitle={`${user?.lineName ?? 'Line 1'} · ${user?.name}`}
      />
      <DemoBanner />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <SectionTitle label="Today's Packing" />
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label="Packed" value="196" variant="success" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="QC Released" value="180" variant="brand" compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label="Cartons" value="3" compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Sealed" value="2" variant="success" compact /></View>
        </View>

        {/* QC release note */}
        <View style={[styles.releaseNote, { marginTop: spacing[3], backgroundColor: tokens.brandLight, borderColor: tokens.brand }]}>
          <AppText variant="label" bold style={{ color: tokens.brand }}>QC Release Verification</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Max packable qty: {packingQCInspection?.releasedQty ?? 180} pcs (QC Released)
          </AppText>
          <AppText variant="caption" color="secondary">
            Do NOT pack rework ({packingQCInspection?.reworkQty ?? 15}) or rejected ({packingQCInspection?.rejectedQty ?? 5}) pieces.
          </AppText>
        </View>

        {/* Garment hang-tag ticket */}
        {packingBundle && (
          <>
            <SectionTitle label="Current Bundle" />
            <GarmentTicketCard
              bundle={packingBundle}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              showPackAction
              onPackAction={() => {}}
            />
          </>
        )}

        {/* Cartons */}
        <SectionTitle label="Cartons" />
        {CARTONS.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => router.push(`/(app)/cartons/${c.id}`)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
            <AppCard padding={spacing[3]}>
              <View style={styles.jobCompact}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                  <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · {c.size} · {c.quantity} pcs</AppText>
                </View>
                <StatusBadge label={c.status.toUpperCase()} variant={c.status === 'sealed' ? 'success' : 'warning'} size="sm" />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}

      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label="Scan Bundle to Pack"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro helpers
// ─────────────────────────────────────────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: color ?? tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText style={{ fontSize: 20, fontWeight: '700', color, fontFamily: 'JetBrainsMono_700Bold' }}>{value}</AppText>
    </View>
  );
}

function QCStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText style={{ fontSize: 22, fontWeight: '800', color, fontFamily: 'JetBrainsMono_700Bold' }}>{value}</AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
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
  demoBanner: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1.5],
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid2: { flexDirection: 'row' },
  factoryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dispatchRow: { flexDirection: 'row' },
  kpiRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[1] },
  kpiCard: {
    width: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[2],
  },
  bottleneckBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  jobCompact: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  jobStats: { flexDirection: 'row', marginTop: spacing[2], paddingTop: spacing[2] },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  quickChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: 20, borderWidth: 1 },
  qcQueueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qcStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing[3] },
  releaseNote: { borderWidth: 1, borderRadius: 6, padding: spacing[2] },
  stockAlert: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[2] },
  scanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[2.5], borderRadius: 6, borderWidth: 1, marginBottom: spacing[1.5] },
});
