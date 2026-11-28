import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { ManifestCarton, ShipmentsPanel } from '../../../src/features/operations/ShipmentsPanel';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import {
  DetailField,
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { CARTONS } from '../../../src/fixtures/mockData';
import { formatDateTime, formatQuantity } from '../../../src/utils/formatters';

interface LiveCarton extends ManifestCarton {
  jobCode?: string;
  styleName?: string;
  size?: string;
  color?: string;
  quantity: number;
  dispatchedAt: string | null;
  gatePass: string | null;
}

export default function DispatchScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common', 'errors']);

  const { user, isDemoMode, serverPermissions } = useAuthStore();
  const factory = user?.factoryId;
  const queryClient = useQueryClient();
  const key = ['dispatch-cartons', user?.id, factory];
  const canMonitor = serverPermissions.includes('CAN_MONITOR_DISPATCH');
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const cartons = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<LiveCarton[]>(`/dispatch/cartons?factoryId=${encodeURIComponent(factory ?? '')}`),
    enabled: !isDemoMode && canMonitor && !!factory && focused,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
  const update = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'receive' | 'approve' | 'execute' }) =>
      apiRequest(`/dispatch/cartons/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => invalidateOperationalFlow(queryClient),
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const [truckNo, setTruckNo] = useState('TN-11-BX-5521');
  const [containerSeal, setContainerSeal] = useState('SEAL-EU-99214');
  const [forwarder, setForwarder] = useState('Maersk Logistics / DHL Global Forwarding');

  const sealedCartons = CARTONS.filter((c) => c.status === 'sealed');
  const totalGarments = sealedCartons.reduce((acc, c) => acc + c.quantity, 0);

  const handleDispatch = () => {
    Alert.alert(
      'Export Shipment Dispatched',
      `Manifest #DSP-7721 created. ${sealedCartons.length} cartons (${totalGarments} garments) loaded onto ${truckNo}. Seal: ${containerSeal}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('inventory:dispatchManifest')}
        subtitle={t('inventory:finishedGoodsStore')}
        showBack
        onBack={() => router.back()}
        rightEl={
          !isDemoMode ? (
            <AppButton
              title={t('common:refresh')}
              size="sm"
              variant="outline"
              loading={cartons.isRefetching}
              onPress={() => void cartons.refetch()}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!isDemoMode ? (
          !factory || !canMonitor ? <AppText>{t('errors:unauthorized')}</AppText>
          : cartons.isLoading ? <AppText>{t('common:loading')}</AppText>
          : cartons.isError ? <AppButton title={t('common:refresh')} onPress={() => void cartons.refetch()} />
          : !cartons.data?.length ? <AppText>{t('inventory:noDispatchCartons')}</AppText>
          : <>
          <SummaryStrip
            style={{ marginBottom: spacing[3] }}
            metrics={[
              { label: t('inventory:cartonsCount'), value: cartons.data.length, tone: 'brand' },
              {
                label: t('inventory:totalPieces'),
                value: formatQuantity(cartons.data.reduce((sum, c) => sum + Number(c.quantity || 0), 0)),
                tone: 'default',
              },
              {
                label: t('inventory:pendingReceipt'),
                value: cartons.data.filter(c => !c.receivedAt).length,
                tone: cartons.data.some(c => !c.receivedAt) ? 'warning' : 'default',
              },
              {
                label: t('inventory:dispatched'),
                value: cartons.data.filter(c => !!c.dispatchedAt).length,
                tone: 'success',
              },
            ]}
          />
          <ShipmentsPanel cartons={cartons.data} />
          <View style={{ marginTop: spacing[3], gap: spacing[2.5] }}>
            <SectionHeader title={t('inventory:finishedGoodsCartons')} count={cartons.data.length} />
            {cartons.data.map(carton => {
              const cartonStatus = carton.dispatchedAt
                ? { label: t('inventory:dispatched').toUpperCase(), variant: 'success' as const, dot: true }
                : carton.manifestId
                ? { label: t('inventory:inManifest').toUpperCase(), variant: 'info' as const, dot: true }
                : carton.approvedAt
                ? { label: t('inventory:readyToDispatch').toUpperCase(), variant: 'brand' as const, dot: true }
                : carton.receivedAt
                ? { label: t('inventory:inStore').toUpperCase(), variant: 'neutral' as const, dot: true }
                : { label: t('inventory:pendingReceipt').toUpperCase(), variant: 'warning' as const, dot: true };

              const fields: DetailField[] = [
                { label: t('common:job'), value: carton.jobCode || '—', mono: true },
                { label: t('common:quantity'), value: formatQuantity(carton.quantity), mono: true, tone: 'brand' },
                { label: t('common:size'), value: carton.size || '—' },
                { label: t('common:color'), value: carton.color || '—' },
              ];
              if (carton.receivedAt) {
                fields.push({ label: t('inventory:receivedAt'), value: formatDateTime(carton.receivedAt) });
              }
              if (carton.approvedAt) {
                fields.push({ label: t('inventory:approvedAt'), value: formatDateTime(carton.approvedAt) });
              }
              if (carton.dispatchedAt) {
                fields.push({ label: t('inventory:dispatchedAt'), value: formatDateTime(carton.dispatchedAt), tone: 'success' });
              }

              return (
                <StructuredRecordCard
                  key={carton.id}
                  code={carton.barcode}
                  title={carton.styleName || carton.jobCode || carton.barcode}
                  status={cartonStatus}
                  fields={fields}
                  highlight={
                    carton.gatePass
                      ? { label: t('inventory:gatePass'), value: carton.gatePass, mono: true, tone: 'success' }
                      : undefined
                  }
                >
                  {!carton.receivedAt && user?.role === 'store-dispatch' && serverPermissions.includes('CAN_MANAGE_INVENTORY') && (
                    <AppButton
                      title={t('inventory:receiveFinishedCarton')}
                      disabled={update.isPending}
                      onPress={() =>
                        Alert.alert(t('inventory:receiveFinishedCarton'), carton.barcode, [
                          { text: t('common:cancel'), style: 'cancel' },
                          { text: t('common:confirm'), onPress: () => update.mutate({ id: carton.id, action: 'receive' }) },
                        ])
                      }
                    />
                  )}
                  {!carton.manifestId && !!carton.receivedAt && !carton.approvedAt && serverPermissions.includes('CAN_APPROVE_DISPATCH') && (
                    <AppButton
                      title={t('inventory:approveCartonDispatch')}
                      disabled={update.isPending}
                      onPress={() => update.mutate({ id: carton.id, action: 'approve' })}
                    />
                  )}
                  {!carton.manifestId && !!carton.approvedAt && !carton.dispatchedAt && serverPermissions.includes('CAN_EXECUTE_DISPATCH') && (
                    <AppButton
                      title={t('inventory:confirmCartonDispatch')}
                      disabled={update.isPending}
                      onPress={() =>
                        Alert.alert(t('inventory:confirmCartonDispatch'), carton.barcode, [
                          { text: t('common:cancel'), style: 'cancel' },
                          { text: t('common:confirm'), onPress: () => update.mutate({ id: carton.id, action: 'execute' }) },
                        ])
                      }
                    />
                  )}
                </StructuredRecordCard>
              );
            })}
          </View>
          </>
        ) : <>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">Sealed Cartons</AppText>
              <AppText variant="h3" bold>{sealedCartons.length} Cartons</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color="secondary">Total Garments</AppText>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>{totalGarments} pcs</AppText>
            </View>
          </View>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label="Logistics Carrier / Freight Forwarder" value={forwarder} onChangeText={setForwarder} />
          <AppInput label="Vehicle / Truck Registration Number" value={truckNo} onChangeText={setTruckNo} />
          <AppInput label="Customs / Container Bolt Seal Number" value={containerSeal} onChangeText={setContainerSeal} />
        </AppCard>

        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Carton Loading Checklist
        </AppText>

        {sealedCartons.map((c) => (
          <AppCard key={c.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.cartonRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · Size: {c.size} · {c.quantity} pcs</AppText>
              </View>
              <StatusBadge label="READY TO LOAD" variant="success" size="sm" />
            </View>
          </AppCard>
        ))}

        <View style={{ marginTop: spacing[3] }}>
          <AppButton title="Sign Off Shipment & Gate Pass" onPress={handleDispatch} />
        </View>
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
