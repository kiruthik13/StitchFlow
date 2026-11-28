import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiBundles } from '../../../src/services/repositories/bundleRepository';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge, bundleStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { GarmentTicketCard } from '../../../src/design-system/components/GarmentTicketCard';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { getPermissions } from '../../../src/core/permissions';

export default function BundleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { bundles, submitProductionQty } = useDemoStore();
  const { user, isDemoMode } = useAuthStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['common', 'production', 'errors']);
  const [qty, setQty] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');

  const liveQuery = useQuery({
    queryKey: ['bundle-detail', id],
    enabled: !isDemoMode && !!id,
    queryFn: () => apiBundles.getBundleById(id),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!bundle) throw new Error('Bundle not found');
      return apiBundles.updateBundleStatus(bundle.id, bundle.status, qty);
    },
    onSuccess: () => {
      setShowConfirm(false);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['bundle-detail', id] });
      invalidateOperationalFlow(queryClient);
    },
    onError: (err: Error) => {
      setShowConfirm(false);
      Alert.alert(t('errors:serverError'), err.message);
    },
  });

  const bundle = isDemoMode ? bundles.find((b) => b.id === id) : liveQuery.data;
  if (!isDemoMode && liveQuery.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }
  if (!bundle) return <EmptyState title={t('errors:bundleNotFound')} />;

  const safeStatus = bundle.status ?? 'sewing';
  const perms = getPermissions(user?.role ?? 'operator');
  const canSubmit = perms.canScan && !submitted;

  const handleSubmit = () => {
    if (isDemoMode) {
      const ok = submitProductionQty(bundle.id, qty, bundle.currentStage ?? 'Production');
      setShowConfirm(false);
      if (ok) setSubmitted(true);
      return;
    }
    submitMutation.mutate();
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={bundle.bundleCode ?? 'Bundle'}
        subtitle={`${bundle.styleName || bundle.jobCode || ''} · ${bundle.jobCode ?? ''}`}
        showBack
        rightEl={<StatusBadge label={safeStatus.replace('-', ' ').toUpperCase()} variant={bundleStatusBadge(safeStatus)} size="sm" />}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>

        {/* Hang-tag ticket */}
        <GarmentTicketCard
          bundle={bundle}
          selectedSize={selectedSize || bundle.size}
          onSizeSelect={perms.canPack ? setSelectedSize : undefined}
          showPackAction={perms.canPack && safeStatus === 'packing'}
        />

        {/* Bundle info */}
        <SectionLabel label="Bundle Information" />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <Row label="Bundle" value={bundle.bundleCode ?? '—'} mono />
          <Row label="Job" value={bundle.jobCode ?? '—'} mono />
          <Row label="Style" value={bundle.styleName || bundle.jobCode || '—'} />
          <Row label="Color" value={bundle.color ?? '—'} />
          <Row label="Size" value={bundle.size ?? '—'} />
          <Row label="Quantity" value={String(bundle.quantity ?? 0)} mono />
          <Row label="Completed" value={String(bundle.completedQty ?? 0)} mono />
          <Row label="Rework" value={String(bundle.reworkQty ?? 0)} />
          <Row label="Rejected" value={String(bundle.rejectedQty ?? 0)} />
          <Row label="Line" value={bundle.lineName ?? 'Assigned Line'} />
          <Row label="Operator" value={bundle.operatorName ?? '—'} />
          <Row label="Cut Date" value={bundle.cuttingDate ?? '—'} isLast />
        </AppCard>

        {/* Quantity entry */}
        {canSubmit && ['sewing', 'kaja', 'ironing', 'cutting'].includes(safeStatus) && (
          <>
            <SectionLabel label="Production Entry" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="label" bold style={{ marginBottom: spacing[3] }}>
                Enter Completed Quantity (Max: {bundle.quantity})
              </AppText>
              <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
                <QuantityStepper value={qty} onChange={setQty} max={bundle.quantity} />
              </View>
              <AppButton
                title={`Submit ${qty} pcs`}
                fullWidth size="lg"
                disabled={qty === 0}
                onPress={() => setShowConfirm(true)}
              />
            </AppCard>
          </>
        )}

        {/* Success state */}
        {submitted && (
          <AppCard padding={spacing[4]} style={{ alignItems: 'center', marginBottom: spacing[3] }}>
            <AppText style={{ fontSize: 40, marginBottom: spacing[2] }}>✅</AppText>
            <AppText variant="h4" bold center>{qty} pcs submitted!</AppText>
            <AppText variant="caption" color="secondary" center>
              {isDemoMode ? 'Demo only — not saved to server' : t('common:savedToServer', { defaultValue: 'Saved to server' })}
            </AppText>
          </AppCard>
        )}

      </ScrollView>

      <ConfirmSheet
        visible={showConfirm}
        title="Confirm Production Entry"
        message={`Record ${qty} pcs completed for bundle ${bundle.bundleCode} at ${bundle.currentStage} stage?`}
        confirmLabel="Yes, Submit"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
      />
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
      <AppText variant="caption" color="secondary" style={{ width: 80 }}>{label}</AppText>
      <AppText variant="label" mono={mono} style={{ flex: 1, color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', paddingVertical: spacing[2] },
});
