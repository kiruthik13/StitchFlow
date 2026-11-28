import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { enqueueProductionEvent } from '../../services/offline/offlineQueueService';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';
import { JOBS } from '../../fixtures/mockData';

interface LiveBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
}

function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CuttingEntryView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [selectedJob] = useState(JOBS[0]);
  const [rollNo, setRollNo] = useState('ROLL-9821');
  const [plyCount, setPlyCount] = useState(50);
  const [markerLength, setMarkerLength] = useState('6.4m');
  const [cutPieces, setCutPieces] = useState(200);

  const [selectedBundle, setSelectedBundle] = useState<LiveBundle | null>(null);
  const [liveQty, setLiveQty] = useState(1);

  const bundlesQuery = useQuery({
    queryKey: ['cutting-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveBundle[]>(`/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeBundle = selectedBundle ?? bundlesQuery.data?.[0] ?? null;

  const submitCutting = useMutation({
    mutationFn: async () => {
      if (!activeBundle) throw new Error('No bundle selected');
      const requestId = createUuidV4();
      const occurredAt = new Date().toISOString();
      try {
        return await apiRequest('/production/cutting', {
          method: 'POST',
          body: JSON.stringify({
            bundleId: activeBundle.id,
            requestId,
            quantity: liveQty,
            clientOccurredAt: occurredAt,
          }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 0 && user?.id) {
          await enqueueProductionEvent({
            kind: 'cutting',
            requestId,
            bundleId: activeBundle.id,
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
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('production:cuttingEntry'), activeBundle?.bundleCode ?? '', [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>
          {t('production:cuttingEntry')}
        </AppText>
        {bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {bundlesQuery.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {bundlesQuery.data.slice(0, 20).map((b) => {
                const chosen = activeBundle?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => { setSelectedBundle(b); setLiveQty(b.quantity); }}
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
                      {b.jobCode} · {b.quantity}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {activeBundle && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="h3" bold mono>{activeBundle.bundleCode}</AppText>
            <AppText variant="bodySmall" color="secondary">
              {activeBundle.jobCode} · {activeBundle.size} · {activeBundle.color}
            </AppText>
            <View style={{ marginTop: spacing[4] }}>
              <QuantityStepper
                label={t('production:cuttingEntry')}
                value={liveQty}
                min={1}
                max={activeBundle.quantity}
                step={1}
                onChange={setLiveQty}
              />
            </View>
          </AppCard>
        )}

        <AppButton
          title={t('common:confirm')}
          disabled={!activeBundle || submitCutting.isPending}
          onPress={() => submitCutting.mutate()}
        />
      </ScrollView>
    );
  }

  const handleDemoSubmit = () => {
    Alert.alert(
      t('production:cuttingEntry'),
      `${selectedJob.jobCode} · ${cutPieces} · ${rollNo} · ${plyCount}`,
      [{ text: t('common:confirm'), onPress: () => router.back() }],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>{t('production:jobOrder')}</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{selectedJob.jobCode}</AppText>
        <AppText variant="bodySmall" color="secondary">{selectedJob.styleName} · {selectedJob.buyerName}</AppText>
      </AppCard>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppInput label="ROLL" value={rollNo} onChangeText={setRollNo} />
        <AppInput label="MARKER" value={markerLength} onChangeText={setMarkerLength} />

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper label="PLIES" value={plyCount} min={1} max={120} step={5} onChange={setPlyCount} />
        </View>

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper label={t('production:cuttingEntry')} value={cutPieces} min={10} max={1000} step={20} onChange={setCutPieces} />
        </View>
      </AppCard>

      <AppButton title={t('common:confirm')} onPress={handleDemoSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
