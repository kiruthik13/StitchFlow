import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { radii } from '../../../src/design-system/tokens/radii';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { JOBS } from '../../../src/fixtures/mockData';
import { formatQuantity } from '../../../src/utils/formatters';

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['Navy', 'White', 'Black'];

interface ReleasedBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  styleName?: string;
  size: string;
  color: string;
  quantity: number;
  released: number;
  packed?: number;
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
  const [requestId, setRequestId] = useState(() => createUuidV4());

  const releasedQuery = useQuery({
    queryKey: ['packing-released-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: async () => {
      const all = await apiRequest<ReleasedBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`);
      return all.filter((b) => Math.max(0, b.released - (b.packed ?? 0)) > 0);
    },
  });

  const eligibleBundles = releasedQuery.data ?? [];
  const activeBundle =
    (selectedBundle && eligibleBundles.find((b) => b.id === selectedBundle.id)) ??
    eligibleBundles[0] ??
    null;
  const maxPackable = activeBundle ? Math.max(1, activeBundle.released - (activeBundle.packed ?? 0)) : 1;

  useEffect(() => {
    if (!activeBundle) return;
    const remaining = Math.max(1, activeBundle.released - (activeBundle.packed ?? 0));
    setLiveQty(remaining);
  }, [activeBundle?.id, activeBundle?.released, activeBundle?.packed]);

  const createLiveCarton = useMutation({
    mutationFn: () => {
      if (!activeBundle) throw new Error('Select a QC-released bundle');
      const qtyToPack = Math.min(Math.max(1, liveQty), maxPackable);
      return apiRequest<{ id: string; barcode: string }>('/packing/cartons', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: activeBundle.id,
          requestId,
          quantity: qtyToPack,
        }),
      });
    },
    onSuccess: (created) => {
      setRequestId(createUuidV4());
      invalidateOperationalFlow(queryClient);
      Alert.alert(
        t('packing:cartonCreation'),
        `Carton ${created.barcode} created (${formatQuantity(Math.min(Math.max(1, liveQty), maxPackable))}).`,
        [{ text: t('common:confirm'), onPress: () => router.replace(`/(app)/cartons/${created.id}`) }],
      );
    },
    onError: (err: Error) => {
      const isConflict = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isConflict ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  if (!isDemoMode) {
    const totalReleased = eligibleBundles.reduce((sum, b) => sum + Number(b.released || 0), 0);
    const totalPacked = eligibleBundles.reduce((sum, b) => sum + Number(b.packed || 0), 0);
    const totalRemaining = eligibleBundles.reduce((sum, b) => sum + Math.max(0, b.released - (b.packed ?? 0)), 0);

    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader
          title={t('packing:cartonCreation')}
          subtitle={t('packing:packingOverview')}
          showBack
          onBack={() => router.back()}
          rightEl={
            <AppButton
              title={t('common:refresh')}
              size="sm"
              variant="outline"
              loading={releasedQuery.isRefetching}
              onPress={() => void releasedQuery.refetch()}
            />
          }
        />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
          <SummaryStrip
            metrics={[
              { label: t('common:bundles'), value: eligibleBundles.length, tone: 'brand' },
              { label: t('packing:qcReleasedQty'), value: formatQuantity(totalReleased), tone: 'default' },
              { label: 'Already Packed', value: formatQuantity(totalPacked), tone: 'default' },
              { label: 'Ready to Pack', value: formatQuantity(totalRemaining), tone: totalRemaining > 0 ? 'success' : 'warning' },
            ]}
          />

          {releasedQuery.isLoading && <AppText>{t('common:loading')}</AppText>}

          {!releasedQuery.isLoading && eligibleBundles.length === 0 && (
            <EmptyState
              title="No Packable Bundles"
              message="No QC-released bundles have remaining unpackaged pieces. Release pieces in QC Inspection first."
            />
          )}

          {eligibleBundles.length > 0 && (
            <>
              <SectionHeader title="Select QC-Released Bundle" count={eligibleBundles.length} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {eligibleBundles.map((b) => {
                    const chosen = activeBundle?.id === b.id;
                    const rem = Math.max(0, b.released - (b.packed ?? 0));
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          setSelectedBundle(b);
                          setLiveQty(rem);
                          setRequestId(createUuidV4());
                        }}
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
                          {`${b.size} · ${b.color} · ${rem} pcs left`}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          {activeBundle && (
            <StructuredRecordCard
              code={activeBundle.bundleCode}
              title={activeBundle.styleName || activeBundle.jobCode}
              subtitle={activeBundle.jobCode}
              status={{ label: `${maxPackable} PCS AVAILABLE`, variant: 'success', dot: true }}
              fields={[
                { label: t('common:job'), value: activeBundle.jobCode, mono: true },
                { label: t('common:size'), value: activeBundle.size },
                { label: t('common:color'), value: activeBundle.color },
                { label: t('packing:qcReleasedQty'), value: formatQuantity(activeBundle.released), mono: true },
                { label: 'Already Packed', value: formatQuantity(activeBundle.packed ?? 0), mono: true },
                { label: 'Max Packable', value: formatQuantity(maxPackable), mono: true, tone: 'brand' },
              ]}
            >
              <QuantityStepper
                label={t('common:quantity')}
                value={Math.min(liveQty, maxPackable)}
                min={1}
                max={maxPackable}
                step={1}
                onChange={setLiveQty}
              />
              <AppButton
                title={`${t('packing:createCarton')} (${Math.min(liveQty, maxPackable)} pcs)`}
                loading={createLiveCarton.isPending}
                disabled={!activeBundle || createLiveCarton.isPending || maxPackable < 1}
                onPress={() => createLiveCarton.mutate()}
              />
            </StructuredRecordCard>
          )}
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
      `${newCarton.cartonCode} · ${formatQuantity(quantity)}`,
      [{ text: t('common:confirm'), onPress: () => router.replace(`/(app)/cartons/${newCarton.id}`) }],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:cartonCreation')} subtitle={t('packing:packingOverview')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
        <SummaryStrip
          metrics={[
            { label: t('common:job'), value: selectedJob.jobCode, tone: 'brand' },
            { label: t('packing:qcReleasedQty'), value: formatQuantity(maxQcReleasedEligible), tone: 'success' },
          ]}
        />

        <StructuredRecordCard
          code={selectedJob.jobCode}
          title={selectedJob.styleName}
          status={{ label: 'QC RELEASED', variant: 'success', dot: true }}
          fields={[
            { label: t('common:size'), value: selectedSize },
            { label: t('common:color'), value: selectedColor },
          ]}
        >
          <AppText variant="label" bold>{t('common:size')}</AppText>
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

          <AppText variant="label" bold style={{ marginTop: spacing[2] }}>{t('common:color')}</AppText>
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

          <View style={{ marginTop: spacing[2] }}>
            <QuantityStepper label={t('common:quantity')} value={quantity} min={10} max={maxQcReleasedEligible} step={10} onChange={setQuantity} />
          </View>
        </StructuredRecordCard>

        <AppButton title={`${t('packing:createCarton')} (${formatQuantity(quantity)})`} onPress={handleDemoCreate} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.md, borderWidth: 1 },
});
