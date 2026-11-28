import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import {
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatQuantity } from '../../../src/utils/formatters';

interface QualityBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  styleName?: string;
  rework: number;
  reworked: number;
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

export default function ReinspectionScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [selectedLive, setSelectedLive] = useState<QualityBundle | null>(null);
  const bundlesQuery = useQuery({
    queryKey: ['reinspection-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: async () => {
      const all = await apiRequest<QualityBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`);
      return all
        .filter((b) => b.reworked > 0 || b.rework > 0)
        .sort((a, b) => b.reworked - a.reworked);
    },
  });

  const reworkBundles = bundlesQuery.data ?? [];
  const activeLive =
    (selectedLive && reworkBundles.find((b) => b.id === selectedLive.id)) ??
    reworkBundles[0] ??
    null;
  const totalReworkPieces = isDemoMode ? 15 : (activeLive?.reworked ?? 0);
  const pendingOperatorRework = isDemoMode ? 0 : Math.max(0, (activeLive?.rework ?? 0) - (activeLive?.reworked ?? 0));
  const routeNotReady = !isDemoMode && !!activeLive && activeLive.ready === false;

  const [passedReworkQty, setPassedReworkQty] = useState(isDemoMode ? 15 : 0);
  const [scrapQty, setScrapQty] = useState(0);

  useEffect(() => {
    if (isDemoMode || !activeLive) return;
    setPassedReworkQty(activeLive.reworked ?? 0);
    setScrapQty(0);
  }, [isDemoMode, activeLive?.id, activeLive?.reworked]);

  const submitReinspection = useMutation({
    mutationFn: async () => {
      if (!activeLive) throw new Error('No bundle selected');
      if (totalReworkPieces <= 0) {
        throw new Error('Operator must complete rework rectification before QC reinspection.');
      }
      await apiRequest('/quality/reinspections', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: activeLive.id,
          requestId: createUuidV4(),
          passed: passedReworkQty,
          rejected: scrapQty,
          rework: 0,
          held: 0,
          fromRework: totalReworkPieces,
          fromHold: 0,
        }),
      });
      if (passedReworkQty > 0) {
        await apiRequest('/quality/releases', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            requestId: createUuidV4(),
            quantity: passedReworkQty,
          }),
        });
      }
    },
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(
        t('quality:reinspection'),
        `${activeLive?.bundleCode ?? ''} · ${passedReworkQty} passed, ${scrapQty} rejected`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const handleReleaseRework = () => {
    if (isDemoMode) {
      Alert.alert(
        t('quality:reinspection'),
        `${passedReworkQty} / ${totalReworkPieces}`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
      return;
    }
    submitReinspection.mutate();
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('quality:reinspection')}
        subtitle={isDemoMode ? 'BND-00523' : (activeLive?.bundleCode ?? '')}
        showBack
        onBack={() => router.back()}
        rightEl={
          !isDemoMode ? (
            <AppButton
              title={t('common:refresh')}
              size="sm"
              variant="outline"
              loading={bundlesQuery.isRefetching}
              onPress={() => void bundlesQuery.refetch()}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
        {!isDemoMode && bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}

        {!isDemoMode && !bundlesQuery.isLoading && reworkBundles.length === 0 && (
          <EmptyState
            title="No Rework Pending Reinspection"
            message="No bundles currently have rework backlog or rectified pieces awaiting QC reinspection."
          />
        )}

        {!isDemoMode && reworkBundles.length > 0 && (
          <>
            <SummaryStrip
              metrics={[
                { label: t('common:bundles'), value: reworkBundles.length, tone: 'brand' },
                {
                  label: 'Ready for Reinspection',
                  value: formatQuantity(reworkBundles.reduce((s, b) => s + Number(b.reworked || 0), 0)),
                  tone: 'success',
                },
                {
                  label: 'With Operator',
                  value: formatQuantity(reworkBundles.reduce((s, b) => s + Math.max(0, b.rework - b.reworked), 0)),
                  tone: 'warning',
                },
              ]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {reworkBundles.map((b) => {
                  const chosen = activeLive?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => {
                        setSelectedLive(b);
                        setPassedReworkQty(b.reworked);
                        setScrapQty(0);
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
                        {b.reworked > 0 ? `${b.reworked} ready` : `${b.rework} in rework`}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {(isDemoMode || activeLive) && (
          <>
            <StructuredRecordCard
              code={isDemoMode ? 'BND-00523' : activeLive?.bundleCode}
              title={isDemoMode ? 'Rework Reinspection' : (activeLive?.styleName || activeLive?.jobCode || 'Rework Reinspection')}
              status={{
                label: totalReworkPieces > 0 ? 'READY FOR REINSPECTION' : 'AWAITING OPERATOR REWORK',
                variant: totalReworkPieces > 0 ? 'success' : 'warning',
                dot: true,
              }}
              fields={[
                { label: 'Ready to Reinspect', value: formatQuantity(totalReworkPieces), mono: true, tone: 'success' },
                { label: 'Pending Operator', value: formatQuantity(pendingOperatorRework), mono: true, tone: pendingOperatorRework > 0 ? 'warning' : 'default' },
              ]}
              highlight={
                routeNotReady
                  ? {
                      label: 'Production Route',
                      value: `Pending stages: ${activeLive?.pendingStages?.join(' → ') || 'Incomplete'}`,
                      tone: 'warning',
                    }
                  : totalReworkPieces === 0 && pendingOperatorRework > 0
                  ? {
                      label: 'Operator Rectification Required',
                      value: `${pendingOperatorRework} pcs are still in rework with the operator. Reinspection unlocks once rectified.`,
                      tone: 'warning',
                    }
                  : undefined
              }
            />

            <AppCard padding={spacing[4]}>
              <QuantityStepper
                label={t('quality:passedQty')}
                value={Math.min(passedReworkQty, totalReworkPieces)}
                min={0}
                max={totalReworkPieces}
                step={1}
                onChange={(val) => {
                  setPassedReworkQty(val);
                  setScrapQty(Math.max(0, totalReworkPieces - val));
                }}
              />

              <View style={{ marginTop: spacing[4] }}>
                <QuantityStepper
                  label={t('quality:rejectedQty')}
                  value={scrapQty}
                  min={0}
                  max={totalReworkPieces}
                  step={1}
                  onChange={(val) => {
                    setScrapQty(val);
                    setPassedReworkQty(Math.max(0, totalReworkPieces - val));
                  }}
                />
              </View>
            </AppCard>

            <AppButton
              title={`${t('quality:releaseToPacking')} (${passedReworkQty})`}
              disabled={routeNotReady || totalReworkPieces === 0 || passedReworkQty + scrapQty !== totalReworkPieces || submitReinspection.isPending}
              loading={submitReinspection.isPending}
              onPress={handleReleaseRework}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
