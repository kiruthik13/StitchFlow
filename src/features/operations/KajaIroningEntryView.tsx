import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { enqueueProductionEvent } from '../../services/offline/offlineQueueService';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';

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

  const submitLive = useMutation({
    mutationFn: async () => {
      if (!activeLive || !targetStep) throw new Error('No ready stage step');
      const requestId = createUuidV4();
      const occurredAt = new Date().toISOString();
      try {
        return await apiRequest('/production/stages/complete', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            stepId: targetStep.id,
            requestId,
            quantity: liveQty,
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
            quantity: liveQty,
            occurredAt,
            actorId: user.id,
          });
          return { queuedOffline: true };
        }
        throw err;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bundle-route', activeLive?.id] });
      Alert.alert(title, activeLive?.bundleCode ?? '', [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    const maxAllowed = targetStep ? Math.max(1, targetStep.available - targetStep.completed) : 1;
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {(bundlesQuery.data ?? []).slice(0, 20).map((b) => {
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
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {activeLive && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="h3" bold>{title}</AppText>
            <AppText variant="bodySmall" color="secondary">{activeLive.bundleCode} · {activeLive.jobCode}</AppText>
            {targetStep ? (
              <View style={{ marginTop: spacing[3] }}>
                <QuantityStepper
                  label={title}
                  value={Math.min(liveQty, maxAllowed)}
                  min={1}
                  max={maxAllowed}
                  step={1}
                  onChange={setLiveQty}
                />
              </View>
            ) : (
              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
                {routeQuery.isLoading ? t('common:loading') : t('common:noData')}
              </AppText>
            )}
          </AppCard>
        )}

        <AppButton
          title={t('common:confirm')}
          disabled={!activeLive || !targetStep || !targetStep.ready || submitLive.isPending}
          onPress={() => submitLive.mutate()}
        />
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
