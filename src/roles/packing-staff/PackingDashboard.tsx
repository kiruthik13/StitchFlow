import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { MetricCard } from '../../design-system/components/MetricCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { GarmentTicketCard } from '../../design-system/components/GarmentTicketCard';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { QC_INSPECTIONS, CARTONS } from '../../fixtures/mockData';
import {
  PackagePlus,
  Truck,
  History,
  ShieldCheck,
  CheckCircle2,
  Box,
} from 'lucide-react-native';

export function PackingDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const [selectedSize, setSelectedSize] = useState('L');

  const packingBundle = bundles.find((b) => b.status === 'packing') ?? bundles[2];
  const packingQCInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={`Packing Station · ${user?.lineName ?? 'Line 1'}`}
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
      >
        {/* Packing KPIs Bento Grid */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('packing:todayOutput')}
        </AppText>
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('packing:packedTotal')}
              value="196"
              unit="pcs"
              variant="lime"
              trend={{ value: '+16 pcs', isPositive: true }}
              icon={<CheckCircle2 size={14} color={tokens.success} strokeWidth={2.4} />}
              compact
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('packing:qcReleased')}
              value="180"
              unit="pcs"
              variant="brand"
              subLabel={t('packing:authorizedLimit')}
              icon={<ShieldCheck size={14} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.4} />}
              compact
            />
          </View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('packing:totalCartons')}
              value="3"
              unit="boxes"
              compact
              icon={<Box size={14} color={tokens.textSecondary} strokeWidth={2.4} />}
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('packing:sealedCartons')}
              value="2"
              unit="boxes"
              variant="success"
              subLabel={t('packing:readyForFGStore')}
              compact
            />
          </View>
        </View>

        {/* {t('packing:qcSafeguardTitle')} */}
        <View
          style={[
            styles.releaseNote,
            {
              marginTop: spacing[3],
              backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD',
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.releaseHeader}>
            <ShieldCheck size={18} color={mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep} strokeWidth={2.4} />
            <AppText variant="label" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep }}>
              QC Release Verification Safeguard
            </AppText>
          </View>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {t('packing:maxPackableQty', { qty: packingQCInspection?.releasedQty ?? 180 })}
          </AppText>
          <AppText variant="caption" bold style={{ color: tokens.danger, marginTop: 1, fontSize: 11 }}>
            {t('packing:doNotPackReworkWarning', { rework: packingQCInspection?.reworkQty ?? 15, rejected: packingQCInspection?.rejectedQty ?? 5 })}
          </AppText>
        </View>

        {/* Quick Operations for Packing */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('packing:packingWorkflows')}
        </AppText>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => router.push('/(app)/cartons/create')}
            activeOpacity={0.7}
          >
            <PackagePlus size={16} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
            <AppText variant="label" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
              {t('packing:createCarton')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => router.push('/(app)/packing/handover')}
            activeOpacity={0.7}
          >
            <Truck size={16} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
            <AppText variant="label" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
              {t('packing:storeHandover')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => router.push('/(app)/packing/history')}
            activeOpacity={0.7}
          >
            <History size={16} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
            <AppText variant="label" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
              {t('packing:packingHistory')}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Garment Hang-Tag Ticket */}
        {packingBundle && (
          <>
            <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
              {t('packing:readyTicket')}
            </AppText>
            <GarmentTicketCard
              bundle={packingBundle}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              showPackAction
              onPackAction={() => router.push(`/(app)/bundles/${packingBundle.id}`)}
            />
          </>
        )}

        {/* Cartons Created */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('packing:packedCartons')}
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
                  variant={c.status === 'sealed' ? 'success' : 'warning'}
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
        label={t('packing:scanBundleToPack')}
      />
    </View>
  );
}

export function PackingWork() {
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const [selectedSize, setSelectedSize] = useState('L');
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
});
