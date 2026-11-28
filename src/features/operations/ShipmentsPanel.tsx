import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { FilterBar } from '../../design-system/components/FilterBar';
import {
  DetailField,
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, formatQuantity, shortCode } from '../../utils/formatters';

export interface ManifestCarton {
  id: string;
  barcode: string;
  requestId: string;
  receivedAt: string | null;
  approvedAt: string | null;
  manifestId: string | null;
}

interface Manifest {
  id: string;
  factoryName?: string;
  carrier: string;
  vehicle: string;
  seal?: string | null;
  destination: string;
  cartons: number;
  quantity: number;
  createdAt?: string | null;
  approvedAt: string | null;
  dispatchedAt: string | null;
  gatePass: string | null;
  cartonBarcodes?: string[];
  jobCodes?: string[];
}

export function ShipmentsPanel({ cartons }: { cartons: ManifestCarton[] }) {
  const { t } = useTranslation(['inventory', 'common', 'errors']);
  const { user, serverPermissions } = useAuthStore();
  const factory = user?.factoryId;
  const canCreate = user?.role === 'store-dispatch' && serverPermissions.includes('CAN_EXECUTE_DISPATCH');
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const cache = useQueryClient();
  const key = ['shipment-manifests', user?.id, factory];
  const query = useQuery({
    queryKey: key,
    enabled: !!factory && focused && serverPermissions.includes('CAN_MONITOR_DISPATCH'),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    queryFn: () => apiRequest<Manifest[]>(`/dispatch/manifests?factoryId=${encodeURIComponent(factory ?? '')}`),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [requestId, setRequestId] = useState('');
  const [carrier, setCarrier] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [seal, setSeal] = useState('');
  const [destination, setDestination] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'dispatched'>('all');
  const refresh = () => {
    invalidateOperationalFlow(cache);
  };
  const showErr = (err: Error) => {
    const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
    Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
  };
  const create = useMutation({
    mutationFn: () => apiRequest('/dispatch/manifests', {
      method: 'POST',
      body: JSON.stringify({ factoryId: factory, requestId, cartonIds: selected, carrier, vehicle, seal, destination }),
    }),
    onSuccess: () => {
      setSelected([]);
      setRequestId('');
      setCarrier('');
      setVehicle('');
      setSeal('');
      setDestination('');
      refresh();
    },
    onError: showErr,
  });
  const update = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'execute' }) =>
      apiRequest(`/dispatch/manifests/${id}/${action}`, { method: 'POST' }),
    onSuccess: refresh,
    onError: showErr,
  });
  const eligible = cartons.filter(item => item.receivedAt && !item.approvedAt && !item.manifestId);
  const manifests = query.data ?? [];
  const filteredManifests = manifests.filter((m) => {
    if (statusFilter === 'pending') return !m.approvedAt;
    if (statusFilter === 'ready') return !!m.approvedAt && !m.dispatchedAt;
    if (statusFilter === 'dispatched') return !!m.dispatchedAt;
    return true;
  });
  const pendingApprovalCount = manifests.filter(m => !m.approvedAt).length;
  const readyDispatchCount = manifests.filter(m => !!m.approvedAt && !m.dispatchedAt).length;
  const dispatchedCount = manifests.filter(m => !!m.dispatchedAt).length;
  const totalPieces = manifests.reduce((sum, m) => sum + Number(m.quantity || 0), 0);

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('inventory:shipmentManifests')} count={manifests.length} />

      {manifests.length > 0 && (
        <>
          <SummaryStrip
            metrics={[
              { label: t('inventory:totalManifests'), value: manifests.length, tone: 'brand' },
              { label: t('inventory:pendingApproval'), value: pendingApprovalCount, tone: pendingApprovalCount > 0 ? 'warning' : 'default' },
              { label: t('inventory:dispatched'), value: dispatchedCount, tone: 'success' },
              { label: t('inventory:totalPieces'), value: formatQuantity(totalPieces), tone: 'default' },
            ]}
          />
          <FilterBar
            selected={statusFilter}
            onSelect={(k) => setStatusFilter(k as 'all' | 'pending' | 'ready' | 'dispatched')}
            options={[
              { key: 'all', label: `${t('common:all')} (${manifests.length})` },
              { key: 'pending', label: `${t('common:pending')} (${pendingApprovalCount})` },
              { key: 'ready', label: `${t('inventory:readyToDispatch')} (${readyDispatchCount})` },
              { key: 'dispatched', label: `${t('inventory:dispatched')} (${dispatchedCount})` },
            ]}
          />
        </>
      )}

      {query.isError && <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />}

      {canCreate && !!eligible.length && (
        <AppCard padding={spacing[3.5]}>
          <View style={{ gap: spacing[2] }}>
            <AppText variant="label" bold>{t('inventory:selectCartonsForManifest')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
              {eligible.map(item => (
                <AppButton
                  key={item.id}
                  title={item.barcode}
                  size="sm"
                  disabled={create.isPending}
                  variant={selected.includes(item.id) ? 'primary' : 'outline'}
                  onPress={() => {
                    if (!requestId) setRequestId(item.requestId);
                    setSelected(current =>
                      current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id],
                    );
                  }}
                />
              ))}
            </View>
            <AppInput label={t('inventory:shipmentCarrier')} value={carrier} onChangeText={setCarrier} />
            <AppInput label={t('inventory:shipmentVehicle')} value={vehicle} onChangeText={setVehicle} />
            <AppInput label={t('inventory:shipmentSeal')} value={seal} onChangeText={setSeal} />
            <AppInput label={t('inventory:transferDestination')} value={destination} onChangeText={setDestination} />
            <AppButton
              title={t('inventory:createShipment')}
              disabled={
                !selected.length ||
                !requestId ||
                !carrier.trim() ||
                !vehicle.trim() ||
                !seal.trim() ||
                !destination.trim() ||
                create.isPending
              }
              onPress={() => create.mutate()}
            />
          </View>
        </AppCard>
      )}

      {filteredManifests.map(item => {
        const statusInfo = item.dispatchedAt
          ? { label: t('inventory:dispatched').toUpperCase(), variant: 'success' as const, dot: true }
          : item.approvedAt
          ? { label: t('inventory:readyToDispatch').toUpperCase(), variant: 'info' as const, dot: true }
          : { label: t('inventory:pendingApproval').toUpperCase(), variant: 'warning' as const, dot: true };

        const fields: DetailField[] = [
          { label: t('inventory:transferDestination'), value: item.destination || '—', fullWidth: true },
          { label: t('inventory:shipmentVehicle'), value: item.vehicle || '—', mono: true },
          { label: t('inventory:shipmentSeal'), value: item.seal || '—', mono: true },
          { label: t('inventory:cartonsCount'), value: formatQuantity(item.cartons, ''), mono: true },
          { label: t('inventory:totalPieces'), value: formatQuantity(item.quantity), mono: true, tone: 'brand' },
        ];

        if (item.jobCodes && item.jobCodes.length > 0) {
          fields.push({
            label: t('inventory:includedJobs'),
            value: item.jobCodes.join(', '),
            mono: true,
            fullWidth: true,
          });
        }
        if (item.createdAt) {
          fields.push({ label: t('inventory:createdAt'), value: formatDateTime(item.createdAt) });
        }
        if (item.approvedAt) {
          fields.push({ label: t('inventory:approvedAt'), value: formatDateTime(item.approvedAt), tone: 'info' as unknown as DetailField['tone'] });
        }
        if (item.dispatchedAt) {
          fields.push({ label: t('inventory:dispatchedAt'), value: formatDateTime(item.dispatchedAt), tone: 'success' });
        }
        if (item.cartonBarcodes && item.cartonBarcodes.length > 0) {
          fields.push({
            label: t('inventory:includedCartons'),
            value: item.cartonBarcodes.join('  ·  '),
            mono: true,
            fullWidth: true,
          });
        }

        return (
          <StructuredRecordCard
            key={item.id}
            code={`MANIFEST #${shortCode(item.id)}`}
            title={item.carrier}
            subtitle={item.factoryName || `${readyDispatchCount > 0 && item.approvedAt && !item.dispatchedAt ? t('inventory:readyToDispatch') : t('inventory:shipment')}`}
            status={statusInfo}
            fields={fields}
            highlight={
              item.gatePass
                ? { label: t('inventory:gatePass'), value: item.gatePass, mono: true, tone: 'success' }
                : undefined
            }
          >
            {!!item.gatePass && (
              <AppButton
                title={t('inventory:gatePass')}
                size="sm"
                variant="outline"
                onPress={async () => {
                  try {
                    const doc = await apiRequest<{ text: string }>(`/dispatch/manifests/${item.id}/gate-pass`);
                    await Share.share({ title: `StitchFlow Gate Pass · ${item.gatePass}`, message: doc.text });
                  } catch {
                    Alert.alert(t('errors:serverError'));
                  }
                }}
              />
            )}
            {!item.approvedAt && serverPermissions.includes('CAN_APPROVE_DISPATCH') && (
              <AppButton
                title={t('inventory:approveShipment')}
                disabled={update.isPending}
                onPress={() => update.mutate({ id: item.id, action: 'approve' })}
              />
            )}
            {!!item.approvedAt && !item.dispatchedAt && canCreate && (
              <AppButton
                title={t('inventory:executeShipment')}
                disabled={update.isPending}
                onPress={() =>
                  Alert.alert(t('inventory:executeShipment'), `${item.carrier} · ${item.vehicle}`, [
                    { text: t('common:cancel'), style: 'cancel' },
                    { text: t('common:confirm'), onPress: () => update.mutate({ id: item.id, action: 'execute' }) },
                  ])
                }
              />
            )}
          </StructuredRecordCard>
        );
      })}
    </View>
  );
}
