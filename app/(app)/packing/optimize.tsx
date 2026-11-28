import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppText } from '../../../src/design-system/components/AppText';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface OptResult {
  remainingPackable: number;
  recommendation: {
    cartonCount: number;
    cartons: Array<{ index: number; quantity: number; utilizationPercent: number }>;
  };
}

export default function CartonOptimizationScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { t } = useTranslation(['common', 'packing']);
  const [capacity, setCapacity] = useState('25');

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<OptResult>('/packing/optimize-cartons', {
        method: 'POST',
        body: JSON.stringify({ bundleId, maxPerCarton: Number(capacity) || 25 }),
      }),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:cartonOptimization', { defaultValue: 'Smart Carton Optimization' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        <AppCard padding={spacing[4]}>
          <AppInput label="Carton Capacity (pcs)" keyboardType="numeric" value={capacity} onChangeText={setCapacity} />
          <AppButton
            title={t('packing:computePlan', { defaultValue: 'Compute Packing Plan' })}
            style={{ marginTop: spacing[3] }}
            disabled={!bundleId || mutation.isPending}
            onPress={() => mutation.mutate()}
          />
          {mutation.data && (
            <View style={{ marginTop: spacing[3] }}>
              <AppText variant="label" bold>{`Packable: ${mutation.data.remainingPackable} pcs in ${mutation.data.recommendation.cartonCount} cartons`}</AppText>
              {mutation.data.recommendation.cartons.map((c) => (
                <AppText key={c.index} variant="bodySmall" color="secondary">
                  {`Carton ${c.index}: ${c.quantity} pcs (${c.utilizationPercent}%)`}
                </AppText>
              ))}
            </View>
          )}
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
