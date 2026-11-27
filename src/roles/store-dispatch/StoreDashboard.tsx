import { LiveWorkPanel } from '../../features/operations/LiveWorkPanels';
import { useLiveDashboardData } from '../../features/operations/useLiveDashboardData';
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import {
  DashboardHeader,
  DashboardSection,
  CompactMetricCard,
  StagePipeline,
  PriorityActionCard,
  WorkOrderPreview,
  DashboardSkeleton,
} from '../../design-system/components/dashboard';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { STOCK_ITEMS, CARTONS } from '../../fixtures/mockData';
import {
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  Truck,
  FileCheck2,
  ArrowLeftRight,
  Boxes,
  ClipboardList,
  Plane,
} from 'lucide-react-native';

export function StoreDashboard() {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common']);

  const live = useLiveDashboardData({ includeStock: true, includeCartons: true });
  const lowStock = isDemoMode ? STOCK_ITEMS.filter((s) => s.currentStock < s.minimumStock) : [];
  const cartonList = isDemoMode ? CARTONS : (live.cartons.data ?? []);

  const m = isDemoMode
    ? {
        incomingTransfers: 3,
        pendingShipments: CARTONS.filter((c) => c.status !== 'dispatched').length,
        packed: 48,
        dispatched: 12,
      }
    : live.metrics.data;

  const ops: QuickOperation[] = [
    { id: 'input-in', icon: <ArrowDownLeft size={20} color={tokens.successText} strokeWidth={2.2} />, label: t('inventory:inputIn'), onPress: () => router.push('/(app)/operations/input-in') },
    { id: 'input-out', icon: <ArrowUpRight size={20} color={tokens.warningText} strokeWidth={2.2} />, label: t('inventory:inputOut'), onPress: () => router.push('/(app)/operations/input-out') },
    { id: 'output-in', icon: <PackageCheck size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:outputIn'), onPress: () => router.push('/(app)/operations/output-in') },
    { id: 'output-out', icon: <Truck size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:outputOut'), onPress: () => router.push('/(app)/operations/output-out') },
    { id: 'grn', icon: <FileCheck2 size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:goodsReceipt'), onPress: () => router.push('/(app)/store/goods-receipt') },
    { id: 'transfer', icon: <ArrowLeftRight size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:transfer'), onPress: () => router.push('/(app)/store/inter-factory-transfer') },
    { id: 'locations', icon: <Boxes size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:rackManagement'), onPress: () => router.push('/(app)/store/locations') },
    { id: 'stock-count', icon: <ClipboardList size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:stockCount'), onPress: () => router.push('/(app)/store/stock-count') },
    { id: 'dispatch', icon: <Plane size={20} color={tokens.brand} strokeWidth={2.2} />, label: t('inventory:dispatchManifest'), onPress: () => router.push('/(app)/store/dispatch') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <DashboardHeader
        subtitle={`${t('common:roles.store-dispatch')} · ${user?.factoryName ?? 'Store'}`}
        unreadCount={(m?.pendingShipments ?? 0) + lowStock.length}
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
                void live.stock.refetch();
                void live.cartons.refetch();
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
            {lowStock.length > 0 && (
              <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
                {lowStock.map((s) => (
                  <PriorityActionCard
                    key={s.id}
                    title={t('inventory:lowStockAlertTitle', { name: s.name })}
                    subtitle={`${s.currentStock} / ${s.minimumStock} ${s.unit} · ${s.locationName}`}
                    tone="danger"
                    onPress={() => router.push('/(app)/store/goods-receipt')}
                  />
                ))}
              </View>
            )}

            <DashboardSection title={t('inventory:movementSummary')} />
            <View style={styles.grid}>
              <CompactMetricCard
                label={t('inventory:rawInputIn')}
                value={isDemoMode ? STOCK_ITEMS.length : (live.stock.data?.length ?? 0)}
                tone="success"
                icon={<ArrowDownLeft size={15} color={tokens.successText} />}
                onPress={() => router.push('/(app)/store/goods-receipt')}
              />
              <CompactMetricCard
                label={t('inventory:interFactoryTransfer')}
                value={m.incomingTransfers}
                tone="brand"
                icon={<ArrowLeftRight size={15} color={tokens.brand} />}
                onPress={() => router.push('/(app)/store/inter-factory-transfer')}
              />
              <CompactMetricCard
                label={t('inventory:pendingDispatch')}
                value={m.pendingShipments}
                tone={m.pendingShipments > 0 ? 'warning' : 'success'}
                icon={<Truck size={15} color={m.pendingShipments > 0 ? tokens.warningText : tokens.successText} />}
                onPress={() => router.push('/(app)/store/dispatch')}
              />
              <CompactMetricCard
                label={t('inventory:fgCartons')}
                value={m.packed}
                tone="default"
                icon={<PackageCheck size={15} color={tokens.textPrimary} />}
              />
            </View>

            <DashboardSection title={t('inventory:dispatchManifest')} />
            <StagePipeline
              maxTotal={Math.max(1, m.packed + m.dispatched)}
              stages={[
                { key: 'packed', label: t('inventory:fgCartons'), quantity: m.packed, tone: 'brand' },
                { key: 'disp', label: t('inventory:issuedToProd'), quantity: m.dispatched, tone: 'success' },
              ]}
            />

            <DashboardSection title={t('inventory:storeWorkflows')} />
            <QuickOperationsGrid operations={ops} columns={3} />

            <DashboardSection
              title={t('inventory:finishedGoodsCartons')}
              count={cartonList.length}
              actionLabel={t('common:viewAll')}
              onAction={() => router.push('/(app)/store/dispatch')}
            />
            <View style={{ gap: spacing[2] }}>
              {cartonList.slice(0, 4).map((c: any) => (
                <WorkOrderPreview
                  key={c.id}
                  code={c.cartonCode ?? c.barcode}
                  title={c.styleName || c.jobCode || 'Carton'}
                  subtitle={`${c.quantity} ${t('common:pieces')}`}
                  statusLabel={(c.status ?? (c.dispatchedAt ? 'DISPATCHED' : c.receivedAt ? 'RECEIVED' : 'PENDING')).toUpperCase()}
                  statusVariant={c.dispatchedAt || c.status === 'sealed' ? 'success' : 'warning'}
                  onPress={() => router.push(`/(app)/cartons/${c.id}`)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label={t('inventory:scanStockMovement')}
      />
    </View>
  );
}

export function StoreWork() {
  const { tokens } = useThemeStore();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common']);
  if (!isDemoMode) return <LiveWorkPanel mode="store" />;
  const lowStock = STOCK_ITEMS.filter((s) => s.currentStock < s.minimumStock);

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
          {t('inventory:stockInventoryItems')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {lowStock.map((s) => (
          <View
            key={s.id}
            style={[
              styles.stockAlert,
              { backgroundColor: tokens.dangerLight, borderColor: tokens.danger },
            ]}
          >
            <AppText variant="label" bold style={{ color: tokens.danger }}>
              LOW STOCK: {s.name}
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {s.currentStock} / {s.minimumStock} {s.unit} min · Rack: {s.locationName}
            </AppText>
          </View>
        ))}
        <AppText variant="caption" color="secondary" uppercase bold style={{ marginBottom: spacing[2] }}>
          {t('inventory:allTrackedInventory')}
        </AppText>
        {STOCK_ITEMS.map((s) => (
          <AppCard key={s.id} padding={spacing[3.5]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.jobCompact}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
                  {s.name}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {s.code} · Rack: {s.locationName}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText
                  variant="label"
                  mono
                  bold
                  style={{ color: s.currentStock < s.minimumStock ? tokens.danger : tokens.success }}
                >
                  {s.currentStock}
                </AppText>
                <AppText variant="caption" color="secondary">{s.unit}</AppText>
              </View>
            </View>
          </AppCard>
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
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[3],
    marginBottom: spacing[2],
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
