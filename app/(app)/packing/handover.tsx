import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatQuantity } from '../../../src/utils/formatters';

interface LiveCarton {
  id: string;
  barcode: string;
  jobCode?: string;
  styleName?: string;
  size?: string;
  color?: string;
  quantity?: number;
  receivedAt: string | null;
}

export default function PackingHandoverScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common', 'errors']);
  const { isDemoMode, user, serverPermissions } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { cartons } = useDemoStore();
  const [handoverDone, setHandoverDone] = useState(false);

  const liveCartonsQuery = useQuery({
    queryKey: ['dispatch-cartons', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveCarton[]>(`/packing/cartons?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const receiveCarton = useMutation({
    mutationFn: (id: string) => apiRequest(`/dispatch/cartons/${id}/receive`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['dispatch-cartons', user?.id, factoryId] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    const pending = (liveCartonsQuery.data ?? []).filter((c) => !c.receivedAt);
    const canReceive = serverPermissions.includes('CAN_MANAGE_INVENTORY');
    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('packing:storeHandover')} showBack onBack={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[2.5] }]}>
          <SummaryStrip
            metrics={[
              { label: t('packing:handoverPending'), value: pending.length, tone: pending.length ? 'warning' : 'success' },
              {
                label: t('common:quantity'),
                value: formatQuantity(pending.reduce((sum, c) => sum + Number(c.quantity ?? 0), 0)),
                tone: 'brand',
              },
            ]}
          />
          {liveCartonsQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
          {pending.length > 0 && <SectionHeader title={t('packing:storeHandover')} count={pending.length} />}
          {pending.map((c) => (
            <StructuredRecordCard
              key={c.id}
              code={c.barcode}
              title={c.styleName || c.jobCode || c.barcode}
              status={{ label: t('common:pending').toUpperCase(), variant: 'warning', dot: true }}
              fields={[
                { label: t('common:job'), value: c.jobCode || '—', mono: true },
                { label: t('common:quantity'), value: formatQuantity(c.quantity ?? 0), mono: true, tone: 'brand' },
                { label: t('common:size'), value: c.size || '—' },
                { label: t('common:color'), value: c.color || '—' },
              ]}
            >
              {canReceive && (
                <AppButton title={t('common:confirm')} size="sm" onPress={() => receiveCarton.mutate(c.id)} />
              )}
            </StructuredRecordCard>
          ))}
        </ScrollView>
      </View>
    );
  }

  const sealedCartons = cartons.filter((c) => c.status === 'sealed');
  const handleHandover = () => {
    setHandoverDone(true);
    Alert.alert(t('packing:storeHandover'), `${sealedCartons.length}`, [
      { text: t('common:confirm'), onPress: () => router.back() },
    ]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:storeHandover')} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.summaryRow}>
            <AppText variant="h3" bold>{sealedCartons.length}</AppText>
            <StatusBadge label={handoverDone ? 'TRANSFERRED' : 'READY'} variant={handoverDone ? 'success' : 'brand'} size="sm" />
          </View>
        </AppCard>
        {sealedCartons.map((c) => (
          <AppCard key={c.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · {c.size} · {c.quantity}</AppText>
              </View>
              <StatusBadge label="SEALED" variant="success" size="sm" />
            </View>
          </AppCard>
        ))}
        <View style={{ marginTop: spacing[4] }}>
          <AppButton title={t('packing:storeHandover')} onPress={handleHandover} disabled={handoverDone || sealedCartons.length === 0} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
