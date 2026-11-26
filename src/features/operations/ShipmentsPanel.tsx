import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

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
  carrier: string;
  vehicle: string;
  destination: string;
  cartons: number;
  quantity: number;
  approvedAt: string | null;
  dispatchedAt: string | null;
  gatePass: string | null;
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
  const query = useQuery({ queryKey: key, enabled: !!factory && focused && serverPermissions.includes('CAN_MONITOR_DISPATCH'), refetchInterval: 20000, refetchIntervalInBackground: false,
    queryFn: () => apiRequest<Manifest[]>(`/dispatch/manifests?factoryId=${encodeURIComponent(factory ?? '')}`) });
  const [selected, setSelected] = useState<string[]>([]);
  const [requestId, setRequestId] = useState('');
  const [carrier, setCarrier] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [seal, setSeal] = useState('');
  const [destination, setDestination] = useState('');
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: key });
    void cache.invalidateQueries({ queryKey: ['dispatch-cartons', user?.id, factory] });
  };
  const create = useMutation({
    mutationFn: () => apiRequest('/dispatch/manifests', {
      method: 'POST', body: JSON.stringify({ factoryId: factory, requestId, cartonIds: selected, carrier, vehicle, seal, destination }),
    }),
    onSuccess: () => { setSelected([]); setRequestId(''); setCarrier(''); setVehicle(''); setSeal(''); setDestination(''); refresh(); },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const update = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'execute' }) =>
      apiRequest(`/dispatch/manifests/${id}/${action}`, { method: 'POST' }),
    onSuccess: refresh,
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const eligible = cartons.filter(item => item.receivedAt && !item.approvedAt && !item.manifestId);

  return (
    <View style={{ gap: spacing[3] }}>
      <AppText variant="h4" bold>{t('inventory:shipmentManifests')}</AppText>
      {query.isError && <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />}
      {canCreate && !!eligible.length && (
        <AppCard padding={spacing[3]}>
          <View style={{ gap: spacing[2] }}>
            {eligible.map(item => <AppButton key={item.id} title={item.barcode} size="sm"
              disabled={create.isPending} variant={selected.includes(item.id) ? 'primary' : 'outline'}
              onPress={() => {
                if (!requestId) setRequestId(item.requestId);
                setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]);
              }} />)}
            <AppInput label={t('inventory:shipmentCarrier')} value={carrier} onChangeText={setCarrier} />
            <AppInput label={t('inventory:shipmentVehicle')} value={vehicle} onChangeText={setVehicle} />
            <AppInput label={t('inventory:shipmentSeal')} value={seal} onChangeText={setSeal} />
            <AppInput label={t('inventory:transferDestination')} value={destination} onChangeText={setDestination} />
            <AppButton title={t('inventory:createShipment')}
              disabled={!selected.length || !requestId || !carrier.trim() || !vehicle.trim() || !seal.trim() || !destination.trim() || create.isPending}
              onPress={() => create.mutate()} />
          </View>
        </AppCard>
      )}
      {query.data?.map(item => <AppCard key={item.id} padding={spacing[3]}>
        <AppText variant="label">{item.carrier} · {item.vehicle}</AppText>
        <AppText variant="bodySmall">{item.destination} · {item.cartons} / {item.quantity}</AppText>
        {!!item.gatePass && (
          <>
            <AppText variant="code">{item.gatePass}</AppText>
            <AppButton
              title={t('inventory:gatePass')}
              size="sm"
              variant="outline"
              onPress={async () => {
                try {
                  const doc = await apiRequest<{ text: string }>(`/dispatch/manifests/${item.id}/gate-pass`);
                  await Share.share({ title: item.gatePass!, message: doc.text });
                } catch {
                  Alert.alert(t('errors:serverError'));
                }
              }}
            />
          </>
        )}
        {!item.approvedAt && serverPermissions.includes('CAN_APPROVE_DISPATCH') && (
          <AppButton title={t('inventory:approveShipment')} disabled={update.isPending}
            onPress={() => update.mutate({ id: item.id, action: 'approve' })} />
        )}
        {!!item.approvedAt && !item.dispatchedAt && canCreate && (
          <AppButton title={t('inventory:executeShipment')} disabled={update.isPending}
            onPress={() => Alert.alert(t('inventory:executeShipment'), item.vehicle, [
              { text: t('common:cancel'), style: 'cancel' },
              { text: t('common:confirm'), onPress: () => update.mutate({ id: item.id, action: 'execute' }) },
            ])} />
        )}
      </AppCard>)}
    </View>
  );
}
