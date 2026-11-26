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
import { StatusBadge } from '../../design-system/components/StatusBadge';
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

  const submitLive = useMutation({
    mutationFn: async () => {
      if (!activeLive || !sewingStep) throw new Error('No ready sewing stage step');
      const requestId = createUuidV4();
      const occurredAt = new Date().toISOString();
      try {
        return await apiRequest('/production/stages/complete', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeLive.id,
            stepId: sewingStep.id,
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
            stepId: sewingStep.id,
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
      Alert.alert(t('production:sewingEntry'), activeLive?.bundleCode ?? '', [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    const maxAllowed = sewingStep ? Math.max(1, sewingStep.available - sewingStep.completed) : 1;
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          {t('production:sewingEntry')}
        </AppText>
        {liveBundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {(liveBundlesQuery.data ?? []).slice(0, 20).map((b) => {
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

        {activeLive && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.rowBetween}>
              <View>
                <AppText variant="h3" bold mono>{activeLive.bundleCode}</AppText>
                <AppText variant="bodySmall" color="secondary">{activeLive.jobCode} · {activeLive.size} · {activeLive.color}</AppText>
              </View>
              {sewingStep && <StatusBadge label={sewingStep.stageCode.toUpperCase()} variant="info" size="sm" />}
            </View>
            {sewingStep ? (
              <View style={{ marginTop: spacing[4] }}>
                <QuantityStepper
                  label={t('production:sewingEntry')}
                  value={Math.min(liveQty, maxAllowed)}
                  min={1}
                  max={maxAllowed}
                  step={1}
                  onChange={setLiveQty}
                />
              </View>
            ) : (
              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[3] }}>
                {routeQuery.isLoading ? t('common:loading') : t('common:noData')}
              </AppText>
            )}
          </AppCard>
        )}

        <AppButton
          title={t('common:confirm')}
          disabled={!activeLive || !sewingStep || !sewingStep.ready || submitLive.isPending}
          onPress={() => submitLive.mutate()}
        />
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
