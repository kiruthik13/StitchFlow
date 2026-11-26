import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface QualityBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  rework: number;
  reworked: number;
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
      return all.filter((b) => b.reworked > 0 || b.rework > 0);
    },
  });

  const activeLive = selectedLive ?? bundlesQuery.data?.[0] ?? null;
  const totalReworkPieces = isDemoMode ? 15 : (activeLive?.reworked ?? 0);

  const [passedReworkQty, setPassedReworkQty] = useState(isDemoMode ? 15 : 0);
  const [scrapQty, setScrapQty] = useState(0);

  const submitReinspection = useMutation({
    mutationFn: async () => {
      if (!activeLive) throw new Error('No bundle selected');
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
      void queryClient.invalidateQueries({ queryKey: ['reinspection-bundles', user?.id, factoryId] });
      Alert.alert(t('quality:reinspection'), `${activeLive?.bundleCode ?? ''} · ${passedReworkQty}`, [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
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
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!isDemoMode && bundlesQuery.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {bundlesQuery.data.map((b) => {
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
                      {b.reworked}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase>{t('quality:reinspection')}</AppText>
          <AppText variant="h4" bold style={{ marginTop: 2 }}>{totalReworkPieces}</AppText>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
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
          disabled={totalReworkPieces === 0 || submitReinspection.isPending}
          onPress={handleReleaseRework}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
