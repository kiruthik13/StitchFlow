import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { MetricCard } from '../../design-system/components/MetricCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
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
  AlertTriangle,
} from 'lucide-react-native';

export function StoreDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common']);

  const lowStock = STOCK_ITEMS.filter((s) => s.currentStock < s.minimumStock);

  const ops: QuickOperation[] = [
    {
      id: 'input-in',
      icon: <ArrowDownLeft size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:inputIn'),
      onPress: () => router.push('/(app)/operations/input-in'),
    },
    {
      id: 'input-out',
      icon: <ArrowUpRight size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:inputOut'),
      onPress: () => router.push('/(app)/operations/input-out'),
    },
    {
      id: 'output-in',
      icon: <PackageCheck size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:outputIn'),
      onPress: () => router.push('/(app)/operations/output-in'),
    },
    {
      id: 'output-out',
      icon: <Truck size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:outputOut'),
      onPress: () => router.push('/(app)/operations/output-out'),
    },
    {
      id: 'grn',
      icon: <FileCheck2 size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:goodsReceipt'),
      onPress: () => router.push('/(app)/store/goods-receipt'),
    },
    {
      id: 'transfer',
      icon: <ArrowLeftRight size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:transfer'),
      onPress: () => router.push('/(app)/store/inter-factory-transfer'),
    },
    {
      id: 'locations',
      icon: <Boxes size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:rackManagement'),
      onPress: () => router.push('/(app)/store/locations'),
    },
    {
      id: 'stock-count',
      icon: <ClipboardList size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:stockCount'),
      onPress: () => router.push('/(app)/store/stock-count'),
    },
    {
      id: 'dispatch',
      icon: <Plane size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('inventory:dispatchManifest'),
      onPress: () => router.push('/(app)/store/dispatch'),
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={`Store & Logistics · ${user?.factoryName ?? 'Tirupur Unit 1'}`}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Low Stock Alerts */}
        {lowStock.map((s) => (
          <View
            key={s.id}
            style={[
              styles.stockAlert,
              { backgroundColor: tokens.dangerLight, borderColor: tokens.danger },
            ]}
          >
            <View style={styles.alertIconWrap}>
              <AlertTriangle size={18} color={tokens.danger} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold style={{ color: tokens.danger }}>
                {t('inventory:lowStockAlertTitle', { name: s.name })}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Current: {s.currentStock} {s.unit} / Min: {s.minimumStock} {s.unit} · Location: {s.locationName}
              </AppText>
            </View>
          </View>
        ))}

        {/* Movement Summary — Deep Forest Logistics Strip */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('inventory:movementSummary')}
        </AppText>
        <AppCard variant="forest" padding={spacing[4]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.76)' }}>
                {t('inventory:fgCartons')}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <AppText style={{ color: '#FFFFFF', fontSize: 36, lineHeight: 46, fontWeight: '800', includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
                  48
                </AppText>
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.76)', marginLeft: 4 }}>
                  boxes
                </AppText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.76)' }}>
                {t('inventory:pendingDispatch')}
              </AppText>
              <AppText style={{ color: '#FBB315', fontSize: 28, lineHeight: 36, fontWeight: '800', includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
                48 boxes
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.16)', paddingTop: spacing[2.5] }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{t('inventory:rawInputIn')}</AppText>
              <AppText variant="label" bold style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>3 batches</AppText>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.16)' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{t('inventory:issuedToProd')}</AppText>
              <AppText variant="label" bold style={{ color: '#34C765', fontVariant: ['tabular-nums'] }}>2 orders</AppText>
            </View>
          </View>
        </AppCard>

        {/* Quick Operations Grid */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('inventory:storeWorkflows')}
        </AppText>
        <QuickOperationsGrid operations={ops} columns={3} />

        {/* Finished Goods Store */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('inventory:finishedGoodsCartons')}
        </AppText>
        {CARTONS.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => router.push(`/(app)/cartons/${c.id}`)}
            activeOpacity={0.8}
            style={{ marginBottom: spacing[2] }}
          >
            <AppCard padding={spacing[3.5]}>
              <View style={styles.jobCompact}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>
                    {c.cartonCode}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {c.styleName} · {c.color} · Size {c.size}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    Qty: {c.quantity} pcs · Packed by: {c.packedBy}
                  </AppText>
                </View>
                <StatusBadge
                  label={c.status.toUpperCase()}
                  variant={c.status === 'sealed' ? 'success' : c.status === 'open' ? 'warning' : 'neutral'}
                  size="sm"
                  dot
                />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common']);
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
});
