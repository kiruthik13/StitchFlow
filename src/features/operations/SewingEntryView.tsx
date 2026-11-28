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
import { StatusBadge } from '../../design-system/components/StatusBadge';
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

export function SewingEntryView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles, submitProductionQty } = useDemoStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { t } = useTranslation(['production', 'common', 'errors']);

  const sewingBundles = bundles.filter((b) => b.currentStage === 'Sewing' || b.status === 'sewing');
  const [selectedDemoBundle, setSelectedDemoBundle] = useState(sewingBundles[0] || bundles[0]);
  const [demoQty, setDemoQty] = useState(selectedDemoBundle ? selectedDemoBundle.quantity : 40);

  const [selectedLiveBundle, setSelectedLiveBundle] = useState<LiveBundle | null>(null);
  const [liveQty, setLiveQty] = useState(1);

  const liveBundlesQuery = useQuery({
    queryKey: ['sewing-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveBundle[]>(`/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeLive = selectedLiveBundle ?? liveBundlesQuery.data?.[0] ?? null;

  const routeQuery = useQuery({
    queryKey: ['bundle-route', activeLive?.id],
    enabled: !isDemoMode && !!activeLive?.id,
    queryFn: () => apiRequest<LiveRouteStep[]>(`/production/bundles/${activeLive!.id}/route`),
  });

  const sewingStep = routeQuery.data?.find((s) => s.stageCode === 'sewing-out' && !s.completedAt)
    ?? routeQuery.data?.find((s) => s.ready && !s.completedAt)
    ?? null;

  const remainingForStep = sewingStep ? Math.max(0, sewingStep.available - sewingStep.completed) : 0;

  useEffect(() => {
    if (isDemoMode || !sewingStep) return;
    setLiveQty(Math.max(1, remainingForStep));
  }, [isDemoMode, sewingStep?.id, remainingForStep]);

  const submitLive = useMutation({
    mutationFn: async () => {
      if (!activeLive || !sewingStep) throw new Error('No ready sewing stage step');
      const requestId = createUuidV4();
      const occurredAt = new Date().toISOString();
      const qtyToSend = Math.min(Math.max(1, liveQty), Math.max(1, remainingForStep));
      try {
        return await apiRequest('/production/stages/complete', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            stepId: sewingStep.id,
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
            stepId: sewingStep.id,
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
      Alert.alert(t('production:sewingEntry'), `${activeLive?.bundleCode ?? ''} · ${formatQuantity(liveQty)}`, [
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
    const liveList = liveBundlesQuery.data ?? [];
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { gap: spacing[3] }]}>
        <SummaryStrip
          metrics={[
            { label: t('common:bundles'), value: liveList.length, tone: 'brand' },
            { label: 'Available', value: formatQuantity(sewingStep?.available ?? 0), tone: 'default' },
            { label: 'Completed', value: formatQuantity(sewingStep?.completed ?? 0), tone: 'success' },
            { label: 'Remaining', value: formatQuantity(remainingForStep), tone: remainingForStep > 0 ? 'brand' : 'default' },
          ]}
        />
        {liveBundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {!liveBundlesQuery.isLoading && liveList.length === 0 && (
          <EmptyState title={t('common:noData')} message="No sewing bundles available for your assignment." />
        )}
        {liveList.length > 0 && (
          <>
            <SectionHeader title={t('production:sewingEntry')} count={liveList.length} />
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
                        {b.size} · {b.color}
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
            title={activeLive.jobCode}
            subtitle={`${activeLive.size} · ${activeLive.color}`}
            status={{
              label: sewingStep
                ? sewingStep.ready
                  ? sewingStep.stageCode.toUpperCase()
                  : 'WAITING UPSTREAM'
                : 'NO ASSIGNED STEP',
              variant: sewingStep?.ready ? 'success' : 'warning',
              dot: true,
            }}
            fields={[
              { label: t('common:size'), value: activeLive.size },
              { label: t('common:color'), value: activeLive.color },
              { label: 'Available', value: formatQuantity(sewingStep?.available ?? 0), mono: true },
              { label: 'Remaining', value: formatQuantity(remainingForStep), mono: true, tone: 'brand' },
            ]}
            highlight={
              !sewingStep
                ? {
                    label: t('common:stage'),
                    value: routeQuery.isLoading
                      ? t('common:loading')
                      : 'No pending sewing step assigned to your account on this bundle.',
                    tone: 'warning',
                  }
                : !sewingStep.ready
                ? {
                    label: t('common:stage'),
                    value: 'Upstream stage must be completed before sewing output can be recorded.',
                    tone: 'warning',
                  }
                : undefined
            }
          >
            {!!sewingStep && sewingStep.ready && remainingForStep > 0 && (
              <>
                <QuantityStepper
                  label={t('production:sewingEntry')}
                  value={Math.min(Math.max(1, liveQty), maxAllowed)}
                  min={1}
                  max={maxAllowed}
                  step={1}
                  onChange={setLiveQty}
                />
                <AppButton
                  title={`${t('common:confirm')} (${formatQuantity(Math.min(Math.max(1, liveQty), maxAllowed))})`}
                  loading={submitLive.isPending}
                  disabled={!activeLive || !sewingStep || !sewingStep.ready || submitLive.isPending}
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
    submitProductionQty(selectedDemoBundle.id, demoQty, 'Sewing');
    Alert.alert(
      t('production:sewingEntry'),
      `${selectedDemoBundle.bundleCode} · ${demoQty}`,
      [{ text: t('common:confirm'), onPress: () => router.back() }],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        {t('production:sewingEntry')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {sewingBundles.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => { setSelectedDemoBundle(b); setDemoQty(b.quantity); }}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedDemoBundle.id === b.id ? tokens.brand : tokens.surface,
                  borderColor: selectedDemoBundle.id === b.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText variant="label" mono bold style={{ color: selectedDemoBundle.id === b.id ? tokens.textInverse : tokens.textPrimary }}>
                {b.bundleCode}
              </AppText>
              <AppText variant="caption" style={{ color: selectedDemoBundle.id === b.id ? tokens.textInverse : tokens.textSecondary }}>
                {b.size} · {b.color}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <View style={styles.rowBetween}>
          <View>
            <AppText variant="h3" bold mono>{selectedDemoBundle.bundleCode}</AppText>
            <AppText variant="bodySmall" color="secondary">{selectedDemoBundle.styleName} · {selectedDemoBundle.jobCode}</AppText>
          </View>
          <StatusBadge label={selectedDemoBundle.status.toUpperCase()} variant="info" size="sm" />
        </View>

        <View style={{ marginTop: spacing[4] }}>
          <QuantityStepper
            label={t('production:sewingEntry')}
            value={demoQty}
            min={1}
            max={selectedDemoBundle.quantity}
            step={1}
            onChange={setDemoQty}
          />
        </View>
      </AppCard>

      <AppButton title={t('common:confirm')} onPress={handleDemoSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
