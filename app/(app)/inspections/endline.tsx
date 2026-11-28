import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { validateQCReconciliation } from '../../../src/utils/qcCalculations';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface QualityBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
  inspected: number;
  passed: number;
  rework: number;
  rejected: number;
  released: number;
  ready?: boolean;
  pendingStages?: string[];
}

function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function EndlineQCScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bundles } = useDemoStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quality', 'common', 'errors']);

  const demoBundle = bundles[0];
  const [selectedLive, setSelectedLive] = useState<QualityBundle | null>(null);

  const bundlesQuery = useQuery({
    queryKey: ['quality-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<QualityBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeLive =
    selectedLive ??
    bundlesQuery.data?.find((b) => b.ready !== false) ??
    bundlesQuery.data?.[0] ??
    null;
  const routeNotReady = !isDemoMode && !!activeLive && activeLive.ready === false;
  const totalInspected = isDemoMode ? 200 : Math.max(0, (activeLive?.quantity ?? 0) - (activeLive?.inspected ?? 0));

  const [passedQty, setPassedQty] = useState(isDemoMode ? 180 : 0);
  const [reworkQty, setReworkQty] = useState(isDemoMode ? 15 : 0);
  const [rejectedQty, setRejectedQty] = useState(isDemoMode ? 5 : 0);

  const validation = validateQCReconciliation(totalInspected, passedQty, reworkQty, rejectedQty);

  const submitLive = useMutation({
    mutationFn: async () => {
      if (!activeLive) throw new Error('No bundle selected');
      await apiRequest('/quality/inspections', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: activeLive.id,
          requestId: createUuidV4(),
          passed: passedQty,
          rejected: rejectedQty,
          rework: reworkQty,
          held: 0,
        }),
      });
      if (passedQty > 0) {
        await apiRequest('/quality/releases', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            requestId: createUuidV4(),
            quantity: passedQty,
          }),
        });
      }
    },
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('quality:endlineQC'), `${activeLive?.bundleCode ?? ''} · ${passedQty}`, [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      const isConflict = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isConflict ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const handleSubmit = () => {
    if (!validation.isValid) {
      Alert.alert(t('errors:validationError'), validation.error);
      return;
    }
    if (isDemoMode) {
      Alert.alert(
        t('quality:endlineQC'),
        `${totalInspected} = ${passedQty} + ${reworkQty} + ${rejectedQty}`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
      return;
    }
    submitLive.mutate();
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('quality:endlineQC')}
        subtitle={isDemoMode ? `${demoBundle.bundleCode} · ${demoBundle.styleName}` : (activeLive?.bundleCode ?? '')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!isDemoMode && bundlesQuery.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {bundlesQuery.data.slice(0, 20).map((b) => {
                const chosen = activeLive?.id === b.id;
                const remaining = Math.max(0, b.quantity - b.inspected);
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      setSelectedLive(b);
                      setPassedQty(remaining);
                      setReworkQty(0);
                      setRejectedQty(0);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: chosen ? tokens.brand : tokens.surface,
                        borderColor: chosen ? tokens.brand : tokens.border,
                      },
                    ]}
                  >
                    <AppText variant="label" mono bold style={{ color: chosen ? tokens.textInverse : tokens.textPrimary }}>
                      {b.bundleCode}
                    </AppText>
                    <AppText variant="caption" style={{ color: chosen ? tokens.textInverse : tokens.textSecondary }}>
                      {remaining}/{b.quantity} · {b.ready === false ? 'IN PROD' : 'READY'}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">{t('quality:inspectedQty')}</AppText>
              <AppText variant="h3" bold>{totalInspected}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color="secondary">{t('quality:reconciliation')}</AppText>
              <AppText variant="code" mono bold style={{ color: validation.isValid ? tokens.success : tokens.danger }}>
                {passedQty} + {reworkQty} + {rejectedQty} = {passedQty + reworkQty + rejectedQty}
              </AppText>
            </View>
          </View>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper label={t('quality:passedQty')} value={passedQty} min={0} max={totalInspected} step={1} onChange={setPassedQty} />
          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper label={t('quality:reworkQty')} value={reworkQty} min={0} max={totalInspected} step={1} onChange={setReworkQty} />
          </View>
          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper label={t('quality:rejectedQty')} value={rejectedQty} min={0} max={totalInspected} step={1} onChange={setRejectedQty} />
          </View>
        </AppCard>

        {!validation.isValid && (
          <View style={[styles.errorCard, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
            <AppText variant="caption" style={{ color: tokens.danger }}>
              {validation.error}
            </AppText>
          </View>
        )}

        {routeNotReady && (
          <View style={[styles.errorCard, { backgroundColor: tokens.warningLight, borderColor: tokens.warning }]}>
            <AppText variant="label" bold style={{ color: tokens.warningText }}>
              Production route has not reached the QC checkpoint
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {activeLive?.pendingStages?.length
                ? `Pending stages: ${activeLive.pendingStages.join(' → ')}`
                : 'Complete all upstream production route steps for this bundle first.'}
            </AppText>
          </View>
        )}

        <AppButton
          title={`${t('quality:releaseToPacking')} (${passedQty})`}
          onPress={handleSubmit}
          disabled={routeNotReady || !validation.isValid || totalInspected === 0 || submitLive.isPending}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[3] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
