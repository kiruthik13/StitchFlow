import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import React, { useState } from 'react';
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
  PriorityActionCard,
  DashboardQuickAction,
  WorkOrderPreview,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { GarmentTicketCard } from '../../design-system/components/GarmentTicketCard';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { QC_INSPECTIONS, CARTONS } from '../../fixtures/mockData';
import {
  PackagePlus,
  Truck,
  History,
  ShieldCheck,
  PackageCheck,
  Box,
  ScanLine,
} from 'lucide-react-native';

export function PackingDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);

  const live = useLiveDashboardData({ includeCartons: true, includeQuality: true });
  const packingQCInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');
  const cartonList = isDemoMode ? CARTONS : (live.cartons.data ?? []);

  const m = isDemoMode
    ? {
        released: packingQCInspection?.releasedQty ?? 180,
        packed: 140,
        dispatched: 80,
      }
    : live.metrics.data;

  const pendingToPack = m ? Math.max(0, m.released - m.packed) : 0;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${t('common:roles.packing-staff')} · ${user?.lineName ?? 'Packing Line'}`}
        rightEl={
          <AppButton
            title={t('packing:newCarton')}
            size="sm"
            onPress={() => router.push('/(app)/cartons/create')}
          />
        }
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
                void live.cartons.refetch();
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
            <DashboardSection title={t('packing:todayOutput')} />
            <ProductionProgressCard
              title={t('packing:packedTotal')}
              subtitle={t('packing:authorizedLimit')}
              actual={m.packed}
              target={m.released}
            />

            <View style={styles.grid}>
              <CompactMetricCard
                label={t('packing:qcReleased')}
                value={m.released}
                tone="brand"
                icon={<ShieldCheck size={15} color={tokens.brand} />}
              />
              <CompactMetricCard
                label={t('packing:packedTotal')}
                value={m.packed}
                tone="success"
                icon={<PackageCheck size={15} color={tokens.successText} />}
              />
              <CompactMetricCard
                label={t('packing:authorizedLimit')}
                value={pendingToPack}
                tone={pendingToPack > 0 ? 'warning' : 'success'}
                icon={<Box size={15} color={pendingToPack > 0 ? tokens.warningText : tokens.successText} />}
              />
              <CompactMetricCard
                label={t('packing:totalCartons')}
                value={cartonList.length}
                tone="default"
                icon={<Truck size={15} color={tokens.textPrimary} />}
                onPress={() => router.push('/(app)/packing/handover')}
              />
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <PriorityActionCard
                title={t('packing:qcReleased')}
                subtitle={t('packing:maxPackableQty', { qty: m.released })}
                count={pendingToPack}
                tone="brand"
                onPress={() => router.push('/(app)/cartons/create')}
              />
            </View>

            <DashboardSection title={t('packing:packingWorkflows')} />
            <View style={styles.grid}>
              <DashboardQuickAction
                icon={<PackagePlus size={18} color={tokens.brand} />}
                label={t('packing:createCarton')}
                onPress={() => router.push('/(app)/cartons/create')}
              />
              <DashboardQuickAction
                icon={<Truck size={18} color={tokens.brand} />}
                label={t('packing:storeHandover')}
                onPress={() => router.push('/(app)/packing/handover')}
              />
              <DashboardQuickAction
                icon={<History size={18} color={tokens.brand} />}
                label={t('packing:packingHistory')}
                onPress={() => router.push('/(app)/packing/history')}
              />
              <DashboardQuickAction
                icon={<ScanLine size={18} color={tokens.brand} />}
                label={t('packing:scanBundleToPack')}
                onPress={() => router.push('/(app)/(tabs)/scan')}
              />
            </View>

            <DashboardSection title={t('packing:packedCartons')} count={cartonList.length} />
            <View style={{ gap: spacing[2] }}>
              {cartonList.slice(0, 4).map((c: any) => (
                <WorkOrderPreview
                  key={c.id}
                  code={c.cartonCode ?? c.barcode}
                  title={c.styleName || c.jobCode || 'Carton'}
                  subtitle={`${c.quantity} ${t('common:pieces')}`}
                  statusLabel={(c.status ?? (c.receivedAt ? 'HANDED OVER' : 'PACKED')).toUpperCase()}
                  statusVariant={c.receivedAt || c.status === 'sealed' ? 'success' : 'warning'}
                  onPress={() => router.push(`/(app)/cartons/${c.id}`)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label={t('packing:scanBundleToPack')}
      />
    </View>
  );
}

export function PackingWork() {
  const { tokens } = useThemeStore();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const [selectedSize, setSelectedSize] = useState('L');
  if (!isDemoMode) return <LiveWorkPanel mode="packing" />;
  const packBundles = bundles.filter((b) => ['packing', 'packed'].includes(b.status));

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
          {t('packing:assignedPacking')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}>
        {packBundles.map((b) => (
          <View key={b.id} style={{ marginBottom: spacing[3] }}>
            <GarmentTicketCard
              bundle={b}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              showPackAction={b.status === 'packing'}
              onPackAction={() => router.push(`/(app)/bundles/${b.id}`)}
            />
          </View>
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
  grid2: {
    flexDirection: 'row',
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
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.xl,
    borderWidth: 1,
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
