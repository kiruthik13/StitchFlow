import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppText } from '../../design-system/components/AppText';
import { EmptyState } from '../../design-system/components/EmptyState';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

interface LiveBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
  inspected?: number;
  released?: number;
  rework?: number;
}

interface LiveRawStock {
  id: string;
  sku: string;
  name: string;
  baseUnit: string;
  quantity: number;
}

export function LiveWorkPanel({ mode }: { mode: 'supervisor' | 'operator' | 'qc' | 'store' | 'packing' }) {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const factoryId = user?.factoryId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'quality', 'inventory', 'packing', 'common']);

  const bundlesQuery = useQuery({
    queryKey: ['live-work-bundles', mode, user?.id, factoryId],
    enabled: !!factoryId && mode !== 'store',
    queryFn: () => {
      const path = mode === 'qc' || mode === 'packing'
        ? `/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`
        : `/bundles?factoryId=${encodeURIComponent(factoryId!)}`;
      return apiRequest<LiveBundle[]>(path);
    },
  });

  const stockQuery = useQuery({
    queryKey: ['live-work-stock', user?.id, factoryId],
    enabled: !!factoryId && mode === 'store',
    queryFn: () => apiRequest<LiveRawStock[]>(`/inventory/raw/stock?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const title =
    mode === 'qc'
      ? t('quality:inspectionQueue')
      : mode === 'store'
      ? t('inventory:stockInventoryItems')
      : mode === 'packing'
      ? t('packing:packingQueue')
      : t('production:lineBundlesWIP');

  const items =
    mode === 'packing'
      ? (bundlesQuery.data ?? []).filter((b) => (b.released ?? 0) > 0)
      : (bundlesQuery.data ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background }}>
      <View
        style={{
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.border,
          borderBottomWidth: 1,
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
          {title}
        </AppText>
        <AppButton
          title={t('common:refresh')}
          size="sm"
          variant="outline"
          onPress={() => void (mode === 'store' ? stockQuery.refetch() : bundlesQuery.refetch())}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}>
        {mode === 'store' ? (
          <>
            {stockQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!stockQuery.isLoading && (stockQuery.data ?? []).length === 0 && <EmptyState title={t('common:noData')} />}
            {(stockQuery.data ?? []).map((s) => (
              <AppCard key={s.id} padding={spacing[3.5]} style={{ marginBottom: spacing[2] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" bold>{s.name}</AppText>
                    <AppText variant="code" color="secondary">{s.sku}</AppText>
                  </View>
                  <StatusBadge label={`${s.quantity} ${s.baseUnit}`} variant={s.quantity > 0 ? 'success' : 'warning'} size="sm" />
                </View>
              </AppCard>
            ))}
          </>
        ) : (
          <>
            {bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!bundlesQuery.isLoading && items.length === 0 && <EmptyState title={t('common:noData')} />}
            {items.map((b) => (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.8}
                style={{ marginBottom: spacing[2] }}
                onPress={() =>
                  router.push(
                    mode === 'qc'
                      ? `/(app)/inspections/${b.id}`
                      : mode === 'packing'
                      ? '/(app)/cartons/create'
                      : `/(app)/bundles/${b.id}`,
                  )
                }
              >
                <AppCard padding={spacing[3.5]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                      <AppText variant="caption" color="secondary">
                        {`${b.jobCode} · ${b.color} · ${b.size} · ${b.quantity}`}
                      </AppText>
                    </View>
                    <StatusBadge
                      label={mode === 'packing' ? `${b.released ?? 0} REL` : `${b.quantity} PCS`}
                      variant={mode === 'packing' ? 'success' : 'brand'}
                      size="sm"
                    />
                  </View>
                </AppCard>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
