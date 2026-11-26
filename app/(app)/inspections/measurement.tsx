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
import { AppInput } from '../../../src/design-system/components/AppInput';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_SPECS = [
  { pom: 'Chest Width (1" below armhole)', spec: 54.0, tol: 1.0, actual: 54.2 },
  { pom: 'Total Body Length (HSP to hem)', spec: 72.0, tol: 1.5, actual: 72.5 },
  { pom: 'Across Shoulder Width', spec: 46.0, tol: 0.8, actual: 46.1 },
  { pom: 'Sleeve Length (shoulder to cuff)', spec: 22.0, tol: 0.8, actual: 21.8 },
  { pom: 'Neck Opening Circumference', spec: 42.0, tol: 0.5, actual: 42.3 },
  { pom: 'Bottom Hem Width', spec: 53.0, tol: 1.0, actual: 53.1 },
];

interface QualityBundle {
  id: string;
  bundleCode: string;
  size: string;
}

interface EvidenceResponse {
  specs: Array<{ id: string; point: string; minimumMm: number; maximumMm: number }>;
  measurements: Array<{ id: string; specId: string; measuredMm: number; withinTolerance: boolean }>;
  requestId: string;
}

export default function MeasurementCheckScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [selectedBundle, setSelectedBundle] = useState<QualityBundle | null>(null);
  const [measuredValues, setMeasuredValues] = useState<Record<string, string>>({});

  const bundlesQuery = useQuery({
    queryKey: ['measure-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<QualityBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeBundle = selectedBundle ?? bundlesQuery.data?.[0] ?? null;

  const evidenceQuery = useQuery({
    queryKey: ['bundle-evidence', activeBundle?.id],
    enabled: !isDemoMode && !!activeBundle?.id,
    queryFn: () => apiRequest<EvidenceResponse>(`/quality/bundles/${activeBundle!.id}/evidence`),
  });

  const submitMeasurement = useMutation({
    mutationFn: ({ specId, measuredMm }: { specId: string; measuredMm: number }) =>
      apiRequest(`/quality/bundles/${activeBundle!.id}/measurements`, {
        method: 'POST',
        body: JSON.stringify({
          requestId: evidenceQuery.data?.requestId,
          specId,
          measuredMm,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bundle-evidence', activeBundle?.id] });
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (isDemoMode) {
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('quality:measurementSpecs')} subtitle="Size L · PTS-001" showBack onBack={() => router.back()} />

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.rowBetween}>
              <View>
                <AppText variant="h4" bold>{t('quality:measurementSpecs')}</AppText>
                <AppText variant="caption" color="secondary">cm</AppText>
              </View>
              <StatusBadge label="PASS (6/6)" variant="success" size="sm" />
            </View>
          </AppCard>

          {DEMO_SPECS.map((item, idx) => {
            const diff = Math.abs(item.actual - item.spec);
            const isPass = diff <= item.tol;
            return (
              <AppCard key={idx} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" bold>{item.pom}</AppText>
                    <AppText variant="caption" color="secondary">
                      {item.spec} ±{item.tol} cm
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="code" mono bold style={{ color: isPass ? tokens.success : tokens.danger }}>
                      {item.actual} cm
                    </AppText>
                    <StatusBadge label={isPass ? 'OK' : 'OUT'} variant={isPass ? 'success' : 'danger'} size="sm" />
                  </View>
                </View>
              </AppCard>
            );
          })}

          <View style={{ marginTop: spacing[2] }}>
            <AppButton title={t('common:confirm')} onPress={() => Alert.alert(t('quality:measurementSpecs'), '6/6', [{ text: t('common:confirm'), onPress: () => router.back() }])} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('quality:measurementSpecs')}
        subtitle={activeBundle ? `${activeBundle.bundleCode} · ${activeBundle.size}` : ''}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {bundlesQuery.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {bundlesQuery.data.slice(0, 20).map((b) => {
                const chosen = activeBundle?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setSelectedBundle(b)}
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
        )}

        {evidenceQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {evidenceQuery.data?.specs.map((spec) => {
          const val = measuredValues[spec.id] ?? '';
          const last = evidenceQuery.data?.measurements.find((m) => m.specId === spec.id);
          return (
            <AppCard key={spec.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" bold>{spec.point}</AppText>
                  <AppText variant="caption" color="secondary">{spec.minimumMm}–{spec.maximumMm} mm</AppText>
                </View>
                {last && (
                  <StatusBadge
                    label={`${last.measuredMm} mm`}
                    variant={last.withinTolerance ? 'success' : 'danger'}
                    size="sm"
                  />
                )}
              </View>
              <View style={{ marginTop: spacing[2], gap: spacing[2] }}>
                <AppInput
                  label="mm"
                  value={val}
                  onChangeText={(txt) => setMeasuredValues((prev) => ({ ...prev, [spec.id]: txt }))}
                  keyboardType="decimal-pad"
                />
                <AppButton
                  title={t('common:confirm')}
                  size="sm"
                  disabled={!val.trim() || !Number.isFinite(Number(val)) || submitMeasurement.isPending}
                  onPress={() => submitMeasurement.mutate({ specId: spec.id, measuredMm: Number(val) })}
                />
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
});
