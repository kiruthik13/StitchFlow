import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { JOBS } from '../../../src/fixtures/mockData';

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['Navy', 'White', 'Black'];

interface ReleasedBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
  released: number;
}

function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CreateCartonScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createCarton } = useDemoStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { t } = useTranslation(['packing', 'common', 'errors']);

  const [selectedJob] = useState(JOBS[0]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedColor, setSelectedColor] = useState('Navy');
  const [quantity, setQuantity] = useState(50);

  const [selectedBundle, setSelectedBundle] = useState<ReleasedBundle | null>(null);
  const [liveQty, setLiveQty] = useState(1);

  const releasedQuery = useQuery({
    queryKey: ['packing-released-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: async () => {
      const all = await apiRequest<ReleasedBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`);
      return all.filter((b) => b.released > 0);
    },
  });

  const activeBundle = selectedBundle ?? releasedQuery.data?.[0] ?? null;

  const createLiveCarton = useMutation({
    mutationFn: () => {
      if (!activeBundle) throw new Error('Select a QC-released bundle');
      return apiRequest<{ id: string; barcode: string }>('/packing/cartons', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: activeBundle.id,
          requestId: createUuidV4(),
          quantity: liveQty,
        }),
      });
    },
    onSuccess: (created) => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('packing:cartonCreation'), created.barcode, [
        { text: t('common:confirm'), onPress: () => router.replace(`/(app)/cartons/${created.id}`) },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    const maxAllowed = activeBundle?.released ?? 1;
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('packing:cartonCreation')} subtitle={t('packing:packingOverview')} showBack onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
          <View style={[styles.alertCard, { backgroundColor: tokens.brandLight, borderColor: tokens.brand, marginBottom: spacing[3] }]}>
            <AppText variant="caption" bold style={{ color: tokens.brand }}>
              {`${t('packing:qcReleasedQty')}: ${activeBundle ? activeBundle.released : 0}`}
            </AppText>
          </View>

          {releasedQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
          {releasedQuery.data && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {releasedQuery.data.map((b) => {
                  const chosen = activeBundle?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => { setSelectedBundle(b); setLiveQty(Math.min(b.released, b.quantity)); }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: chosen ? tokens.brand : tokens.surface,
                          borderColor: chosen ? tokens.brand : tokens.border,
                        },
                      ]}
                    >
                      <AppText variant="label" mono bold style={{ color: chosen ? tokens.brandButtonText : tokens.textPrimary }}>
                        {b.bundleCode}
                      </AppText>
                      <AppText variant="caption" style={{ color: chosen ? tokens.brandButtonText : tokens.textSecondary }}>
                        {`${b.size} · ${b.color} · ${b.released}`}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {activeBundle && (
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="h4" bold>{activeBundle.bundleCode}</AppText>
              <AppText variant="caption" color="secondary">{`${activeBundle.jobCode} · ${activeBundle.size} · ${activeBundle.color}`}</AppText>
              <View style={{ marginTop: spacing[3] }}>
                <QuantityStepper
                  label={t('common:quantity')}
                  value={Math.min(liveQty, maxAllowed)}
                  min={1}
                  max={maxAllowed}
                  step={1}
                  onChange={setLiveQty}
                />
              </View>
            </AppCard>
          )}

          <AppButton
            title={t('packing:cartonCreation')}
            disabled={!activeBundle || createLiveCarton.isPending}
            onPress={() => createLiveCarton.mutate()}
          />
        </ScrollView>
      </View>
    );
  }

  const maxQcReleasedEligible = 180;
  const handleDemoCreate = () => {
    const newCarton = createCarton({
      jobId: selectedJob.id,
      jobCode: selectedJob.jobCode,
      styleName: selectedJob.styleName,
      color: selectedColor,
      size: selectedSize,
      quantity,
      status: 'open',
      createdAt: new Date().toISOString(),
      packedBy: 'Anitha Raj',
    });

    Alert.alert(
      t('packing:cartonCreation'),
      `${newCarton.cartonCode} · ${quantity}`,
      [{ text: t('common:confirm'), onPress: () => router.replace(`/(app)/cartons/${newCarton.id}`) }],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:cartonCreation')} subtitle={t('packing:packingOverview')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={[styles.alertCard, { backgroundColor: tokens.brandLight, borderColor: tokens.brand, marginBottom: spacing[3] }]}>
          <AppText variant="caption" bold style={{ color: tokens.brand }}>
            {`${t('packing:qcReleasedQty')}: ${maxQcReleasedEligible}`}
          </AppText>
        </View>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="label" bold style={{ marginBottom: spacing[2] }}>{t('common:size')}</AppText>
          <View style={styles.chipRow}>
            {SIZES.map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => setSelectedSize(sz)}
                style={[styles.chip, { backgroundColor: selectedSize === sz ? tokens.brand : tokens.surfaceSecondary, borderColor: tokens.border }]}
              >
                <AppText variant="label" bold style={{ color: selectedSize === sz ? tokens.brandButtonText : tokens.textPrimary }}>{sz}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="label" bold style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>{t('common:color')}</AppText>
          <View style={styles.chipRow}>
            {COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                onPress={() => setSelectedColor(col)}
                style={[styles.chip, { backgroundColor: selectedColor === col ? tokens.brand : tokens.surfaceSecondary, borderColor: tokens.border }]}
              >
                <AppText variant="label" bold style={{ color: selectedColor === col ? tokens.brandButtonText : tokens.textPrimary }}>{col}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper label={t('common:quantity')} value={quantity} min={10} max={maxQcReleasedEligible} step={10} onChange={setQuantity} />
          </View>
        </AppCard>

        <AppButton title={t('packing:cartonCreation')} onPress={handleDemoCreate} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  alertCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
