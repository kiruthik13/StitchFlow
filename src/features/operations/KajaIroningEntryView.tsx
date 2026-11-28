import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { enqueueProductionEvent } from '../../services/offline/offlineQueueService';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { EmptyState } from '../../design-system/components/EmptyState';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';
import { formatQuantity } from '../../utils/formatters';

interface LiveBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
}

interface LiveRouteStep {
  id: string;
  stageCode: string;
  ready: boolean;
  completedAt: string | null;
  completed: number;
  available: number;
}

function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function KajaIroningEntryView({ type }: { type: 'kaja' | 'ironing' }) {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles, submitProductionQty } = useDemoStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { t } = useTranslation(['production', 'common', 'errors']);

  const isKaja = type === 'kaja';
  const title = isKaja ? t('production:kajaEntry') : t('production:ironingEntry');
  const stageName = isKaja ? 'Kaja/Button' : 'Ironing';

  const [selectedDemoBundle] = useState(bundles[0]);
  const [completedQty, setCompletedQty] = useState(selectedDemoBundle.quantity);

  const [selectedLiveBundle, setSelectedLiveBundle] = useState<LiveBundle | null>(null);
  const [liveQty, setLiveQty] = useState(1);

  const bundlesQuery = useQuery({
    queryKey: ['stage-bundles', type, user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveBundle[]>(`/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeLive = selectedLiveBundle ?? bundlesQuery.data?.[0] ?? null;

  const routeQuery = useQuery({
    queryKey: ['bundle-route', activeLive?.id],
    enabled: !isDemoMode && !!activeLive?.id,
    queryFn: () => apiRequest<LiveRouteStep[]>(`/production/bundles/${activeLive!.id}/route`),
  });

  const targetStep = routeQuery.data?.find((s) => s.stageCode.toLowerCase().includes(type) && !s.completedAt)
    ?? routeQuery.data?.find((s) => s.ready && !s.completedAt)
    ?? null;

  const remainingForStep = targetStep ? Math.max(0, targetStep.available - targetStep.completed) : 0;

  useEffect(() => {
    if (isDemoMode || !targetStep) return;
    setLiveQty(Math.max(1, remainingForStep));
  }, [isDemoMode, targetStep?.id, remainingForStep]);

  const submitLive = useMutation({
    mutationFn: async () => {
      if (!activeLive || !targetStep) throw new Error('No ready stage step');
      const requestId = createUuidV4();
      const occurredAt = new Date().toISOString();
      const qtyToSend = Math.min(Math.max(1, liveQty), Math.max(1, remainingForStep));
      try {
        return await apiRequest('/production/stages/complete', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            stepId: targetStep.id,
            requestId,
            quantity: qtyToSend,
            clientOccurredAt: occurredAt,
          }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 0 && user?.id) {
          await enqueueProductionEvent({
            kind: 'stage',
            requestId,
            bundleId: activeLive.id,
            stepId: targetStep.id,
            quantity: qtyToSend,
            occurredAt,
            actorId: user.id,
          });
          return { queuedOffline: true };
        }
        throw err;
      }
    },
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(title, `${activeLive?.bundleCode ?? ''} · ${formatQuantity(liveQty)}`, [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  if (!isDemoMode) {
    const maxAllowed = Math.max(1, remainingForStep);
    const liveList = bundlesQuery.data ?? [];
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { gap: spacing[3] }]}>
        <SummaryStrip
          metrics={[
            { label: t('common:bundles'), value: liveList.length, tone: 'brand' },
            { label: 'Available', value: formatQuantity(targetStep?.available ?? 0), tone: 'default' },
            { label: 'Completed', value: formatQuantity(targetStep?.completed ?? 0), tone: 'success' },
            { label: 'Remaining', value: formatQuantity(remainingForStep), tone: remainingForStep > 0 ? 'brand' : 'default' },
          ]}
        />
        {bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {!bundlesQuery.isLoading && liveList.length === 0 && (
          <EmptyState title={t('common:noData')} message={`No bundles available for ${stageName}.`} />
        )}
        {liveList.length > 0 && (
          <>
            <SectionHeader title={title} count={liveList.length} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {liveList.slice(0, 20).map((b) => {
                  const chosen = activeLive?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => { setSelectedLiveBundle(b); setLiveQty(1); }}
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
                        {b.jobCode}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {activeLive && (
          <StructuredRecordCard
            code={activeLive.bundleCode}
            title={title}
            subtitle={activeLive.jobCode}
            status={{
              label: targetStep
                ? targetStep.ready
                  ? targetStep.stageCode.toUpperCase()
                  : 'WAITING UPSTREAM'
                : 'NO ASSIGNED STEP',
              variant: targetStep?.ready ? 'success' : 'warning',
              dot: true,
            }}
            fields={[
              { label: t('common:job'), value: activeLive.jobCode, mono: true },
              { label: 'Available', value: formatQuantity(targetStep?.available ?? 0), mono: true },
              { label: 'Completed', value: formatQuantity(targetStep?.completed ?? 0), mono: true },
              { label: 'Remaining', value: formatQuantity(remainingForStep), mono: true, tone: 'brand' },
            ]}
            highlight={
              !targetStep
                ? {
                    label: t('common:stage'),
                    value: routeQuery.isLoading
                      ? t('common:loading')
                      : `No pending ${stageName} step assigned to your account on this bundle.`,
                    tone: 'warning',
                  }
                : !targetStep.ready
                ? {
                    label: t('common:stage'),
                    value: `Upstream stage must be completed before ${stageName} output can be recorded.`,
                    tone: 'warning',
                  }
                : undefined
            }
          >
            {!!targetStep && targetStep.ready && remainingForStep > 0 && (
              <>
                <QuantityStepper
                  label={title}
                  value={Math.min(Math.max(1, liveQty), maxAllowed)}
                  min={1}
                  max={maxAllowed}
                  step={1}
                  onChange={setLiveQty}
                />
                <AppButton
                  title={`${t('common:confirm')} (${formatQuantity(Math.min(Math.max(1, liveQty), maxAllowed))})`}
                  loading={submitLive.isPending}
                  disabled={!activeLive || !targetStep || !targetStep.ready || submitLive.isPending}
                  onPress={() => submitLive.mutate()}
                />
              </>
            )}
          </StructuredRecordCard>
        )}
      </ScrollView>
    );
  }

  const handleDemoSubmit = () => {
    submitProductionQty(selectedDemoBundle.id, completedQty, stageName);
    Alert.alert(title, `${selectedDemoBundle.bundleCode} · ${completedQty}`, [
      { text: t('common:confirm'), onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>{stageName}</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{title}</AppText>
        <AppText variant="bodySmall" color="secondary">{selectedDemoBundle.bundleCode} · {selectedDemoBundle.styleName}</AppText>
      </AppCard>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <QuantityStepper
          label={title}
          value={completedQty}
          min={1}
          max={selectedDemoBundle.quantity}
          step={5}
          onChange={setCompletedQty}
        />
      </AppCard>

      <AppButton title={t('common:confirm')} onPress={handleDemoSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
