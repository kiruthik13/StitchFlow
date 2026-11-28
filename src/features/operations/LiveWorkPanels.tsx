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
import {
  DetailField,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { formatQuantity } from '../../utils/formatters';

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
  ready?: boolean;
  pendingStages?: string[];
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

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8], gap: spacing[2.5] }}>
        {mode === 'store' ? (
          <>
            {stockQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!stockQuery.isLoading && (stockQuery.data ?? []).length === 0 && <EmptyState title={t('common:noData')} />}
            {!!(stockQuery.data ?? []).length && (
              <SummaryStrip
                metrics={[
                  { label: t('inventory:stockInventoryItems'), value: (stockQuery.data ?? []).length, tone: 'brand' },
                  {
                    label: t('inventory:lowStock'),
                    value: (stockQuery.data ?? []).filter(s => s.quantity <= 0).length,
                    tone: (stockQuery.data ?? []).some(s => s.quantity <= 0) ? 'warning' : 'success',
                  },
                ]}
              />
            )}
            {(stockQuery.data ?? []).map((s) => (
              <StructuredRecordCard
                key={s.id}
                code={s.sku}
                title={s.name}
                status={{
                  label: `${s.quantity} ${s.baseUnit}`,
                  variant: s.quantity > 0 ? 'success' : 'warning',
                  dot: true,
                }}
                fields={[
                  { label: t('inventory:availableStock'), value: formatQuantity(s.quantity, s.baseUnit), mono: true, tone: s.quantity > 0 ? 'brand' : 'warning' },
                  { label: t('common:unit'), value: s.baseUnit },
                ]}
              />
            ))}
          </>
        ) : (
          <>
            {bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {!bundlesQuery.isLoading && items.length === 0 && <EmptyState title={t('common:noData')} />}
            {items.length > 0 && (
              <SummaryStrip
                metrics={[
                  { label: t('common:bundles'), value: items.length, tone: 'brand' },
                  {
                    label: t('common:quantity'),
                    value: formatQuantity(items.reduce((sum, b) => sum + Number(b.quantity || 0), 0)),
                    tone: 'default',
                  },
                ]}
              />
            )}
            {items.map((b) => {
              const fields: DetailField[] = [
                { label: t('common:job'), value: b.jobCode || '—', mono: true },
                { label: t('common:quantity'), value: formatQuantity(b.quantity), mono: true, tone: 'brand' },
                { label: t('common:size'), value: b.size || '—' },
                { label: t('common:color'), value: b.color || '—' },
              ];
              if (typeof b.inspected === 'number' || typeof b.released === 'number') {
                fields.push(
                  { label: t('quality:inspectedQty'), value: formatQuantity(b.inspected ?? 0), mono: true },
                  { label: t('quality:passedQty'), value: formatQuantity(b.released ?? 0), mono: true, tone: 'success' },
                );
              }
              if ((b.rework ?? 0) > 0) {
                fields.push({ label: t('quality:rework'), value: formatQuantity(b.rework ?? 0), mono: true, tone: 'danger' });
              }

              return (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.8}
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
                  <StructuredRecordCard
                    code={b.bundleCode}
                    title={b.jobCode}
                    status={{
                      label:
                        mode === 'packing'
                          ? `${b.released ?? 0} REL`
                          : mode === 'qc'
                          ? b.ready === false
                            ? 'PENDING ROUTE'
                            : 'READY FOR QC'
                          : `${b.quantity} PCS`,
                      variant:
                        mode === 'packing'
                          ? 'success'
                          : mode === 'qc'
                          ? b.ready === false
                            ? 'warning'
                            : 'success'
                          : 'brand',
                      dot: true,
                    }}
                    fields={fields}
                    highlight={
                      mode === 'qc' && b.ready === false && b.pendingStages?.length
                        ? {
                            label: t('common:stage'),
                            value: `Pending: ${b.pendingStages.join(' → ')}`,
                            tone: 'warning',
                          }
                        : undefined
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
