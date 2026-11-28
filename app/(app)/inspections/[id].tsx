import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiBundles } from '../../../src/services/repositories/bundleRepository';
import { ApiQCRepository } from '../../../src/services/repositories/qcRepository';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { QCDefect } from '../../../src/core/types';

type InspPhase = 'pending' | 'inspecting' | 'decision' | 'done';
const apiQC = new ApiQCRepository();

const DEFECT_CODES = [
  { code: 'D001', desc: 'Stitch skip', severity: 'major' as const },
  { code: 'D002', desc: 'Colour variation', severity: 'minor' as const },
  { code: 'D003', desc: 'Button hole misalignment', severity: 'major' as const },
  { code: 'D004', desc: 'Puckering', severity: 'minor' as const },
  { code: 'D005', desc: 'Broken stitch', severity: 'critical' as const },
  { code: 'D006', desc: 'Measurement out of spec', severity: 'critical' as const },
];

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const { isDemoMode } = useAuthStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common', 'errors']);

  const liveBundleQuery = useQuery({
    queryKey: ['inspection-bundle', id],
    enabled: !isDemoMode && !!id,
    queryFn: () => apiBundles.getBundleById(id),
  });

  const qualityStatusQuery = useQuery({
    queryKey: ['inspection-quality-status', id],
    enabled: !isDemoMode && !!id,
    queryFn: async () => {
      try {
        return await apiRequest<{
          ready: boolean;
          pendingStages?: string[];
          inspected: number;
          passed: number;
          released: number;
          rework: number;
          reworked: number;
          quantity: number;
        }>(`/quality/bundles/${encodeURIComponent(id)}`);
      } catch (err) {
        if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) return null;
        throw err;
      }
    },
  });

  const bundle = isDemoMode ? bundles.find((b) => b.id === id) : liveBundleQuery.data;
  const qualityStatus = isDemoMode ? null : qualityStatusQuery.data;
  const routeNotReady = !isDemoMode && !!qualityStatus && !qualityStatus.ready;
  const pendingReleaseOnly =
    !isDemoMode &&
    !!qualityStatus &&
    qualityStatus.ready &&
    qualityStatus.inspected >= qualityStatus.quantity &&
    qualityStatus.passed > qualityStatus.released;

  const [phase, setPhase] = useState<InspPhase>('pending');
  const [passedQty, setPassedQty] = useState(0);
  const [reworkQty, setReworkQty] = useState(0);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [defects, setDefects] = useState<QCDefect[]>([]);
  const [showRelease, setShowRelease] = useState(false);

  const qcMutation = useMutation({
    mutationFn: async () => {
      if (!bundle) throw new Error('Bundle not found');
      if (routeNotReady) {
        throw new Error('Production route has not reached the QC checkpoint');
      }
      if (pendingReleaseOnly) {
        const releasable = Math.max(0, (qualityStatus?.passed ?? 0) - (qualityStatus?.released ?? 0));
        if (releasable > 0) {
          await apiQC.releasePieces(bundle.id, releasable);
        }
        return;
      }
      await apiQC.updateInspection(bundle.id, { passedQty, reworkQty, rejectedQty });
      if (passedQty > 0) {
        await apiQC.releasePieces(bundle.id, passedQty);
      }
    },
    onSuccess: () => {
      setShowRelease(false);
      setPhase('done');
      queryClient.invalidateQueries({ queryKey: ['inspection-bundle', id] });
      queryClient.invalidateQueries({ queryKey: ['inspection-quality-status', id] });
      queryClient.invalidateQueries({ queryKey: ['quality-bundles'] });
    },
    onError: (err: Error) => {
      setShowRelease(false);
      const isConflictOrValidation = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(
        isConflictOrValidation ? t('errors:validationError') : t('errors:serverError'),
        err.message,
      );
    },
  });

  if (!isDemoMode && liveBundleQuery.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }
  if (!bundle) return <EmptyState title={t('errors:bundleNotFound')} />;

  const totalInspected = passedQty + reworkQty + rejectedQty;
  const isValid = totalInspected <= bundle.quantity && totalInspected > 0;

  const addDefect = (d: typeof DEFECT_CODES[0]) => {
    const existing = defects.find((x) => x.code === d.code);
    if (existing) {
      setDefects(defects.map((x) => x.code === d.code ? { ...x, count: x.count + 1 } : x));
    } else {
      setDefects([...defects, { id: `def-${Date.now()}`, code: d.code, description: d.desc, count: 1, severity: d.severity }]);
    }
  };

  const submitDecision = () => {
    if (isDemoMode) {
      setShowRelease(false);
      setPhase('done');
      return;
    }
    qcMutation.mutate();
  };

  const sevColor = (sev: string) => {
    if (sev === 'critical') return tokens.danger;
    if (sev === 'major') return tokens.warning;
    return tokens.textSecondary;
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title="QC Inspection"
        subtitle={bundle.bundleCode}
        showBack
        rightEl={
          <StatusBadge
            label={phase === 'done' ? 'DONE' : phase === 'inspecting' ? 'INSPECTING' : 'PENDING'}
            variant={phase === 'done' ? 'success' : phase === 'inspecting' ? 'info' : 'warning'}
            size="sm"
          />
        }
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>

        {/* Bundle summary */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <Row label="Bundle" value={bundle.bundleCode} mono />
          <Row label="Job" value={bundle.jobCode} mono />
          <Row label="Style" value={bundle.styleName} />
          <Row label="Color/Size" value={`${bundle.color} · ${bundle.size}`} />
          <Row label="Qty to inspect" value={String(bundle.quantity)} mono isLast />
        </AppCard>

        {/* Route Readiness Warning */}
        {routeNotReady && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3], borderColor: tokens.warning, backgroundColor: tokens.warningLight }}>
            <AppText variant="label" bold style={{ color: tokens.warningText }}>
              Production route has not reached the QC checkpoint
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              {qualityStatus?.pendingStages?.length
                ? `Complete upstream stage(s) first: ${qualityStatus.pendingStages.join(' → ')}`
                : 'Production route steps must be configured and completed before QC inspection & release.'}
            </AppText>
          </AppCard>
        )}

        {/* Phase: Pending */}
        {phase === 'pending' && (
          pendingReleaseOnly ? (
            <AppButton
              title={`Release ${Math.max(0, (qualityStatus?.passed ?? 0) - (qualityStatus?.released ?? 0))} Passed Pieces`}
              size="lg"
              fullWidth
              loading={qcMutation.isPending}
              onPress={() => {
                setPassedQty(Math.max(0, (qualityStatus?.passed ?? 0) - (qualityStatus?.released ?? 0)));
                setShowRelease(true);
              }}
              style={{ marginBottom: spacing[3] }}
            />
          ) : (
            <AppButton
              title="🔍 Start Inspection"
              size="lg"
              fullWidth
              disabled={routeNotReady}
              onPress={() => { setPassedQty(bundle.quantity); setPhase('inspecting'); }}
              style={{ marginBottom: spacing[3] }}
            />
          )
        )}

        {/* Phase: Inspecting */}
        {phase === 'inspecting' && (
          <>
            <SectionLabel label="Inspection Results" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="label" bold style={{ marginBottom: spacing[3] }}>
                Total bundle qty: {bundle.quantity} pcs
              </AppText>

              <RowStepper label="✓ Passed" value={passedQty} max={bundle.quantity} onChange={setPassedQty} color={tokens.success} />
              <RowStepper label="⟳ Rework" value={reworkQty} max={bundle.quantity} onChange={setReworkQty} color={tokens.warning} />
              <RowStepper label="✗ Rejected" value={rejectedQty} max={bundle.quantity} onChange={setRejectedQty} color={tokens.danger} />

              {totalInspected > bundle.quantity && (
                <AppText variant="caption" color="danger" style={{ marginTop: spacing[2] }}>
                  ⚠ Total ({totalInspected}) exceeds bundle qty ({bundle.quantity})
                </AppText>
              )}
              <View style={[styles.totalRow, { backgroundColor: tokens.surfaceSecondary }]}>
                <AppText variant="label">Total inspected:</AppText>
                <AppText variant="label" mono bold style={{ color: isValid ? tokens.success : tokens.danger }}>{totalInspected} / {bundle.quantity}</AppText>
              </View>
            </AppCard>

            <SectionLabel label="Defect Entry" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[2] }}>Tap to add defects found:</AppText>
              <View style={styles.defectChips}>
                {DEFECT_CODES.map((d) => (
                  <TouchableOpacity
                    key={d.code}
                    onPress={() => addDefect(d)}
                    style={[styles.defectChip, { borderColor: sevColor(d.severity), backgroundColor: tokens.surfaceSecondary }]}
                  >
                    <AppText variant="caption" mono style={{ color: sevColor(d.severity) }}>{d.code}</AppText>
                    <AppText variant="caption" color="secondary"> {d.desc}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
              {defects.length > 0 && (
                <View style={[styles.defectList, { borderTopColor: tokens.border }]}>
                  {defects.map((d) => (
                    <View key={d.id} style={styles.defectRow}>
                      <AppText variant="label" mono style={{ color: sevColor(d.severity), width: 50 }}>{d.code}</AppText>
                      <AppText variant="caption" style={{ flex: 1 }}>{d.description}</AppText>
                      <AppText variant="label" mono bold style={{ color: tokens.textPrimary }}>{d.count}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>

            <AppButton
              title="Record QC Decision"
              size="lg"
              fullWidth
              disabled={!isValid}
              onPress={() => setPhase('decision')}
            />
          </>
        )}

        {/* Phase: Decision */}
        {phase === 'decision' && (
          <>
            <SectionLabel label="QC Decision" />
            <AppCard padding={spacing[5]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="h4" bold style={{ marginBottom: spacing[4] }}>Review and Release</AppText>
              <View style={styles.decisionGrid}>
                <DecisionCell label="Passed" value={passedQty} color={tokens.success} />
                <DecisionCell label="Rework" value={reworkQty} color={tokens.warning} />
                <DecisionCell label="Rejected" value={rejectedQty} color={tokens.danger} />
              </View>
              <View style={[styles.releaseNote, { backgroundColor: tokens.brandLight, borderColor: tokens.brand }]}>
                <AppText variant="label" bold style={{ color: tokens.brand }}>Release Quantity: {passedQty} pcs</AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  Only {passedQty} QC-passed pieces will be released for packing.
                  {reworkQty > 0 && ` ${reworkQty} pcs go to rework.`}
                  {rejectedQty > 0 && ` ${rejectedQty} pcs are rejected.`}
                </AppText>
              </View>
              <AppButton
                title={`Release ${passedQty} Pieces`}
                size="lg"
                fullWidth
                style={{ marginTop: spacing[4] }}
                onPress={() => setShowRelease(true)}
              />
            </AppCard>
          </>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <AppCard padding={spacing[5]} style={{ alignItems: 'center', marginBottom: spacing[3] }}>
            <AppText style={{ fontSize: 48, marginBottom: spacing[2] }}>✅</AppText>
            <AppText variant="h3" bold center>Inspection Complete</AppText>
            <AppText variant="body" color="secondary" center style={{ marginTop: spacing[2] }}>
              {passedQty} pcs released for packing
            </AppText>
            {reworkQty > 0 && <AppText variant="body" color="secondary" center>{reworkQty} pcs sent for rework</AppText>}
            {rejectedQty > 0 && <AppText variant="body" color="danger" center>{rejectedQty} pcs rejected</AppText>}
            <AppText variant="caption" style={{ color: isDemoMode ? tokens.warning : tokens.success, marginTop: spacing[3] }}>
              {isDemoMode ? 'Demo mode — not saved to server' : t('common:savedToServer', { defaultValue: 'Saved to server' })}
            </AppText>
          </AppCard>
        )}

      </ScrollView>

      <ConfirmSheet
        visible={showRelease}
        title="Confirm QC Release"
        message={`Release ${passedQty} QC-passed pieces for packing? Rework (${reworkQty}) and rejected (${rejectedQty}) pieces will NOT be released.`}
        confirmLabel={`Release ${passedQty} Pieces`}
        onConfirm={submitDecision}
        onCancel={() => setShowRelease(false)}
      />
    </View>
  );
}

function RowStepper({ label, value, max, onChange, color }: { label: string; value: number; max: number; onChange: (n: number) => void; color: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.stepperRow, { borderBottomColor: tokens.border }]}>
      <AppText variant="label" style={{ color, flex: 1 }}>{label}</AppText>
      <QuantityStepper value={value} onChange={onChange} max={max} />
    </View>
  );
}

function DecisionCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText style={{ fontSize: 32, fontWeight: '800', color, fontFamily: 'JetBrainsMono_700Bold' }}>{value}</AppText>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[2] }}>
      {label}
    </AppText>
  );
}

function Row({ label, value, mono = false, isLast = false }: { label: string; value: string; mono?: boolean; isLast?: boolean }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={{ width: 100 }}>{label}</AppText>
      <AppText variant="label" mono={mono} style={{ flex: 1, color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', paddingVertical: spacing[2] },
  stepperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2.5], borderBottomWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[3], borderRadius: 6, marginTop: spacing[3] },
  defectChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  defectChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: 6, borderWidth: 1 },
  defectList: { borderTopWidth: 1, marginTop: spacing[3], paddingTop: spacing[2] },
  defectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[1] },
  decisionGrid: { flexDirection: 'row', marginBottom: spacing[3] },
  releaseNote: { borderWidth: 1, borderRadius: 6, padding: spacing[3] },
});
