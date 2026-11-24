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
import { MetricCard } from '../../design-system/components/MetricCard';
import { GarmentTicketCard } from '../../design-system/components/GarmentTicketCard';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { FilterBar } from '../../design-system/components/FilterBar';
import { EmptyState } from '../../design-system/components/EmptyState';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { REWORK_TASKS } from '../../fixtures/mockData';
import {
  Scissors,
  Cpu,
  CircleDot,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Barcode,
} from 'lucide-react-native';

export function OperatorDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles, recentScans } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'quality']);

  const myBundle = bundles.find((b) => b.operatorId === user?.id) ?? bundles[0];

  const operatorOps: QuickOperation[] = [
    {
      id: 'cutting',
      icon: <Scissors size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:cuttingEntry'),
      onPress: () => router.push('/(app)/operations/cutting-entry'),
    },
    {
      id: 'sewing',
      icon: <Cpu size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:sewingEntry'),
      onPress: () => router.push('/(app)/operations/sewing-entry'),
    },
    {
      id: 'kaja',
      icon: <CircleDot size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:kajaEntry'),
      onPress: () => router.push('/(app)/operations/kaja-entry'),
    },
    {
      id: 'ironing',
      icon: <Flame size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('production:ironingEntry'),
      onPress: () => router.push('/(app)/operations/ironing-entry'),
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={`${t('common:roles.operator')} · ${user?.lineName ?? 'Line 1'} (${t('common:morning')} ${t('common:shift')})`}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Output Today */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:myOutputToday')}
        </AppText>
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('common:completed')}
              value="267"
              unit="pcs"
              variant="lime"
              trend={{ value: '83% pace', isPositive: true }}
              icon={<CheckCircle2 size={14} color={tokens.success} strokeWidth={2.4} />}
              compact
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:shiftTarget')}
              value="320"
              unit="pcs"
              subLabel={t('production:pcsRemaining', { count: 53 })}
              icon={<Clock size={14} color={tokens.textSecondary} strokeWidth={2.4} />}
              compact
            />
          </View>
        </View>

        {/* Current Active Assignment */}
        {myBundle && (
          <>
            <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
              {t('production:currentAssignment')}
            </AppText>
            <GarmentTicketCard bundle={myBundle} />
          </>
        )}

        {/* Operator Quick Operations — Station Entries */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:stationOperations')}
        </AppText>
        <QuickOperationsGrid operations={operatorOps} columns={2} />

        {/* Report Issue Action */}
        <TouchableOpacity
          style={[styles.issueCard, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}
          onPress={() => router.push('/(app)/operations/report-issue')}
          activeOpacity={0.8}
        >
          <AlertTriangle size={18} color={tokens.danger} strokeWidth={2.2} />
          <View style={{ flex: 1, marginLeft: spacing[2] }}>
            <AppText variant="label" bold style={{ color: tokens.danger }}>
              {t('production:reportMachineStoppage')}
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 1 }}>
              {t('production:alertSupervisorImmediately')}
            </AppText>
          </View>
        </TouchableOpacity>

        {/* Rework Tasks */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:myReworkTasks')}
        </AppText>
        {REWORK_TASKS.slice(0, 2).map((rw) => (
          <AppCard key={rw.id} padding={spacing[3.5]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.riskRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" bold mono style={{ color: tokens.textPrimary }}>
                  {rw.bundleCode}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {rw.defectDescription}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {t('common:quantity')}: {rw.quantity} {t('common:pieces')} · {t('common:date')}: {rw.dueDate}
                </AppText>
              </View>
              <StatusBadge
                label={rw.status.toUpperCase()}
                variant={rw.status === 'in-progress' ? 'warning' : 'neutral'}
                size="sm"
                dot
              />
            </View>
          </AppCard>
        ))}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <>
            <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
              Recent Scans
            </AppText>
            {recentScans.slice(0, 3).map((code, i) => (
              <View
                key={i}
                style={[
                  styles.scanRow,
                  { borderColor: tokens.border, backgroundColor: tokens.surface },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Barcode size={14} color={tokens.textSecondary} />
                  <AppText variant="code" mono bold style={{ color: tokens.textPrimary, marginLeft: spacing[2] }}>
                    {code}
                  </AppText>
                </View>
                <AppText variant="caption" color="secondary">Logged</AppText>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label="Scan Barcode / QR to Work"
      />
    </View>
  );
}

export function OperatorWork() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');

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
});
