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
import { AppButton } from '../../design-system/components/AppButton';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { BottomScanAction } from '../../design-system/components/BottomScanAction';
import { EmptyState } from '../../design-system/components/EmptyState';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { QuickOperationsGrid, QuickOperation } from '../../design-system/components/QuickOperationsGrid';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { QC_INSPECTIONS, REWORK_TASKS } from '../../fixtures/mockData';
import {
  Search,
  Target,
  Ruler,
  Camera,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
} from 'lucide-react-native';

export function QCDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);

  const pendingBundles = bundles.filter((b) => b.status === 'qc-pending');
  const completedInspection = QC_INSPECTIONS.find((q) => q.status === 'passed');

  const inspectedQty = completedInspection?.inspectedQty ?? 200;
  const passedQty = completedInspection?.passedQty ?? 180;
  const reworkQty = completedInspection?.reworkQty ?? 15;
  const rejectedQty = completedInspection?.rejectedQty ?? 5;
  const releasedQty = completedInspection?.releasedQty ?? 180;

  const passedPct = (passedQty / inspectedQty) * 100;
  const reworkPct = (reworkQty / inspectedQty) * 100;
  const rejectedPct = (rejectedQty / inspectedQty) * 100;

  const qcOps: QuickOperation[] = [
    {
      id: 'inline',
      icon: <Search size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('quality:inlineQC'),
      onPress: () => router.push('/(app)/inspections/inline'),
    },
    {
      id: 'endline',
      icon: <Target size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('quality:endlineQC'),
      onPress: () => router.push('/(app)/inspections/endline'),
    },
    {
      id: 'measurement',
      icon: <Ruler size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('quality:measurementCheck'),
      onPress: () => router.push('/(app)/inspections/measurement'),
    },
    {
      id: 'evidence',
      icon: <Camera size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('quality:photoEvidence'),
      onPress: () => router.push('/(app)/inspections/photo-evidence'),
    },
    {
      id: 'reinspection',
      icon: <RefreshCw size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />,
      label: t('quality:reinspection'),
      onPress: () => router.push('/(app)/inspections/reinspection'),
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={`QC Hub · ${t('common:inspector')}: ${user?.name ?? 'QC Floor'}`}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* {t('quality:inspectionQueue')} Card */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          Inspection Queue
        </AppText>
        <AppCard variant="hero" padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.qcQueueHeader}>
            <View>
              <AppText
                style={{
                  fontSize: 40,
                  fontWeight: '800',
                  color: pendingBundles.length > 0 ? tokens.warning : tokens.success,
                  fontFamily: 'sans-serif-black',
                  lineHeight: 52,
                  letterSpacing: 0,
                  includeFontPadding: false,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {pendingBundles.length}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {t('quality:bundlesAwaitingVerification')}
              </AppText>
            </View>
            <AppButton
              title={t('quality:startScan')}
              size="md"
              variant="primary"
              onPress={() => router.push('/(app)/(tabs)/scan')}
            />
          </View>
        </AppCard>

        {/* Specialized QC Workflows */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('quality:specializedForms')}
        </AppText>
        <QuickOperationsGrid operations={qcOps} columns={3} />

        {/* Today's QC Stats with standard QC equation verification */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('quality:qualityBalanceEquation')}
        </AppText>
        <AppCard padding={spacing[4]}>
          <View style={styles.qcStats}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">{t('quality:inspected')}</AppText>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: tokens.textPrimary,
                  fontFamily: 'sans-serif-black',
                  lineHeight: 28,
                  letterSpacing: 0,
                  includeFontPadding: false,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {inspectedQty}
              </AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">{t('quality:passed')}</AppText>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: tokens.success,
                  fontFamily: 'sans-serif-black',
                  lineHeight: 28,
                  letterSpacing: 0,
                  includeFontPadding: false,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {passedQty}
              </AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">{t('quality:rework')}</AppText>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: tokens.warning,
                  fontFamily: 'sans-serif-black',
                  lineHeight: 28,
                  letterSpacing: 0,
                  includeFontPadding: false,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {reworkQty}
              </AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">{t('quality:rejected')}</AppText>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: tokens.danger,
                  fontFamily: 'sans-serif-black',
                  lineHeight: 28,
                  letterSpacing: 0,
                  includeFontPadding: false,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {rejectedQty}
              </AppText>
            </View>
          </View>

          {/* Segmented Quality Distribution Bar */}
          <View style={[styles.barContainer, { backgroundColor: tokens.surfaceSecondary }]}>
            <View style={[styles.barSegment, { width: `${passedPct}%` as any, backgroundColor: tokens.success }]} />
            <View style={[styles.barSegment, { width: `${reworkPct}%` as any, backgroundColor: tokens.warning }]} />
            <View style={[styles.barSegment, { width: `${rejectedPct}%` as any, backgroundColor: tokens.danger }]} />
          </View>

          <View
            style={[
              styles.releaseNote,
              {
                backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD',
                borderColor: tokens.border,
                marginTop: spacing[3],
              },
            ]}
          >
            <View style={styles.releaseHeader}>
              <CheckCircle2 size={16} color={mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep} strokeWidth={2.4} />
              <AppText
                variant="caption"
                bold
                style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep }}
              >
                {t('quality:releasedToPackingQty', { qty: releasedQty })}
              </AppText>
            </View>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2, fontSize: 11 }}>
              {t('quality:strictIndustrialRule')}
            </AppText>
          </View>
        </AppCard>

        {/* Rework Tracking */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('quality:activeReworkTracking')}
        </AppText>
        {REWORK_TASKS.map((rw) => (
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
                  Qty: {rw.quantity} pcs · Assigned: {rw.assignedTo ?? 'Unassigned'}
                </AppText>
              </View>
              <StatusBadge
                label={rw.status.toUpperCase()}
                variant={
                  rw.status === 'in-progress'
                    ? 'warning'
                    : rw.status === 'completed'
                      ? 'success'
                      : 'neutral'
                }
                size="sm"
                dot
              />
            </View>
          </AppCard>
        ))}
      </ScrollView>

      <BottomScanAction
        onPress={() => router.push('/(app)/(tabs)/scan')}
        label={t('quality:scanBundleInspection')}
      />
    </View>
  );
}

export function QCWork() {
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);
  const pending = bundles.filter((b) => b.status === 'qc-pending');

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
          {t('quality:pendingInspectionQueue')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {pending.length === 0 ? (
          <EmptyState title={t('quality:queueEmpty')} message={t('quality:allBundlesInspected')} />
        ) : (
          pending.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/(app)/inspections/${b.id}`)}
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
                      {b.styleName} · {b.color} · Size {b.size} · {b.quantity} pcs
                    </AppText>
                  </View>
                  <StatusBadge label="PENDING" variant="warning" size="sm" dot />
                </View>
              </AppCard>
            </TouchableOpacity>
          ))
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
  qcQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qcStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  barContainer: {
    height: 8,
    borderRadius: radii.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
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
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  jobCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
});
