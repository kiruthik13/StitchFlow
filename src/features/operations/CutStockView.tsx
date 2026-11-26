import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

interface Option { id: string; name: string; isActive?: boolean }
interface BundleLookup { id: string; bundleCode: string; requestId: string }
interface Handover {
  id: string;
  direction: 'output-in' | 'output-out';
  status: 'pending' | 'received' | 'rejected';
  quantity: number;
  sender_id: string;
  destination_line_id: string | null;
  bundleCode: string;
  returnVerifiedAt: string | null;
  returnApprovedAt: string | null;
}

export function CutStockView({ mode }: { mode: 'output-in' | 'output-out' }) {
  const { t } = useTranslation(['common', 'inventory', 'errors', 'production']);
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const factory = user?.factoryId ?? '';
  const key = ['cut-stock', user?.id, factory];
  const [barcode, setBarcode] = useState('');
  const [bundle, setBundle] = useState<BundleLookup | null>(null);
  const [locationId, setLocation] = useState('');
  const [destinationLineId, setLine] = useState('');
  const [quantity, setQuantity] = useState('');
  const [returnEditing, setReturnEditing] = useState<string | null>(null);
  const [exception, setException] = useState<string | null>(null);
  const [actual, setActual] = useState('');
  const [reason, setReason] = useState('');
  const canSend = mode === 'output-in' ? user?.role === 'operator' : user?.role === 'store-dispatch';
  const source = useQuery({
    queryKey: ['cut-stock-options', user?.id, factory],
    enabled: !!factory && canSend,
    queryFn: async () => {
      const [locations, hierarchy] = await Promise.all([
        apiRequest<Option[]>(`/masters/locations?factoryId=${encodeURIComponent(factory)}`),
        apiRequest<{ lines: Option[] }>(`/factories/${encodeURIComponent(factory)}/hierarchy`),
      ]);
      return { locations: locations.filter(item => item.isActive), lines: hierarchy.lines };
    },
  });
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const handovers = useQuery({
    queryKey: key,
    enabled: !!factory && focused,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    queryFn: () => apiRequest<Handover[]>(`/inventory/cut-stock/handovers?factoryId=${encodeURIComponent(factory)}`),
  });
  const lookup = useMutation({
    mutationFn: () => apiRequest<BundleLookup>('/barcodes/resolve', {
      method: 'POST', body: JSON.stringify({ barcode: barcode.trim() }),
    }),
    onSuccess: setBundle,
    onError: () => Alert.alert(t('errors:scanFailed')),
  });
  const send = useMutation({
    mutationFn: (selected: BundleLookup) => apiRequest(`/inventory/${mode}`, {
      method: 'POST', body: JSON.stringify({
        bundleId: selected.id, requestId: selected.requestId, locationId, quantity: Number(quantity),
        ...(mode === 'output-out' ? { destinationLineId } : {}),
      }),
    }),
    onSuccess: () => {
      setBundle(null);
      setBarcode('');
      setQuantity('');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const decide = useMutation({
    mutationFn: ({ id, status, actualQuantity }: { id: string; status: 'received' | 'rejected'; actualQuantity: number }) =>
      apiRequest(`/inventory/cut-stock/handovers/${id}/decide`, {
        method: 'POST', body: JSON.stringify({ status, actualQuantity, ...(status === 'rejected' ? { reason } : {}) }),
      }),
    onSuccess: () => {
      setException(null);
      setReason('');
      setActual('');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const resolve = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => apiRequest(
      `/inventory/cut-stock/handovers/${id}/${approve ? 'approve-return' : 'verify-return'}`,
      { method: 'POST', ...(approve ? {} : { body: JSON.stringify({ verifiedQuantity: Number(actual), reason: reason.trim() }) }) },
    ),
    onSuccess: () => {
      setReturnEditing(null);
      setActual('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const canReceive = (item: Handover) => item.sender_id !== user?.id &&
    (mode === 'output-in' ? user?.role === 'store-dispatch' : user?.role === 'operator');
  const list = handovers.data?.filter(item => item.direction === mode && (item.status === 'pending' || (item.status === 'rejected' && !item.returnApprovedAt))) ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
      {canSend && <AppCard padding={spacing[4]}>
        <AppInput label={t('common:scanBarcode')} value={barcode} onChangeText={value => { setBarcode(value); setBundle(null); }} />
        <AppButton title={t('common:search')} onPress={() => lookup.mutate()} disabled={lookup.isPending || !barcode.trim()} />
        {bundle && <AppText variant="code">{bundle.bundleCode}</AppText>}
        {source.isError && <AppButton title={t('common:refresh')} onPress={() => void source.refetch()} />}
        <AppText variant="label">{t('inventory:cutStockLocation')}</AppText>
        {source.data?.locations.map(location => <View key={location.id} style={{ marginTop: spacing[1] }}>
          <AppButton title={location.name} variant={location.id === locationId ? 'primary' : 'outline'}
            size="sm" onPress={() => setLocation(location.id)} />
        </View>)}
        {mode === 'output-out' && <>
          <AppText variant="label">{t('inventory:cutStockDestination')}</AppText>
          {source.data?.lines.map(line => <View key={line.id} style={{ marginTop: spacing[1] }}>
            <AppButton title={line.name} variant={line.id === destinationLineId ? 'primary' : 'outline'}
              size="sm" onPress={() => setLine(line.id)} />
          </View>)}
        </>}
        <AppInput label={t('production:enterQuantity')} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        <AppButton title={t('inventory:sendCutStock')} disabled={!bundle || !locationId || !Number.isInteger(Number(quantity))
          || Number(quantity) <= 0 || (mode === 'output-out' && !destinationLineId) || send.isPending}
          onPress={() => { if (bundle) send.mutate(bundle); }} />
      </AppCard>}
      {handovers.isLoading && <AppText>{t('common:loading')}</AppText>}
      {handovers.isError && <AppButton title={t('common:refresh')} onPress={() => void handovers.refetch()} />}
      {!handovers.isLoading && !handovers.isError && !list.length && <AppText>{t('inventory:noCutStockHandovers')}</AppText>}
      {list.map(item => <AppCard key={item.id} padding={spacing[4]}>
        <AppText variant="code">{item.bundleCode}</AppText>
        <AppText variant="bodySmall">{item.quantity}</AppText>
        {item.status === 'pending' && canReceive(item) && <>
          <AppButton title={t('common:confirm')} disabled={decide.isPending}
            onPress={() => Alert.alert(t('common:confirm'), `${item.bundleCode} · ${item.quantity}`, [
              { text: t('common:cancel'), style: 'cancel' },
              { text: t('common:confirm'), onPress: () => decide.mutate({ id: item.id, status: 'received', actualQuantity: item.quantity }) },
            ])} />
          {exception === item.id ? <>
            <AppInput label={t('production:enterQuantity')} value={actual} onChangeText={setActual} keyboardType="numeric" />
            <AppInput label={t('production:jobRejectionReason')} value={reason} onChangeText={setReason} />
            <AppButton title={t('inventory:recordCutStockDiscrepancy')} disabled={!reason.trim() || actual.trim() === ''
              || !Number.isInteger(Number(actual)) || Number(actual) < 0 || decide.isPending}
              onPress={() => decide.mutate({ id: item.id, status: 'rejected', actualQuantity: Number(actual) })} />
          </> : <AppButton title={t('inventory:recordCutStockDiscrepancy')} variant="outline"
            onPress={() => { setException(item.id); setReturnEditing(null); setReason(''); setActual(''); }} />}
        </>}
        {item.status === 'rejected' && <>
          <AppText variant="caption">{t('inventory:recordCutStockDiscrepancy')}</AppText>
          {!item.returnVerifiedAt && item.sender_id === user?.id && (
            returnEditing === item.id ? <>
              <AppInput label={t('production:enterQuantity')} value={actual} onChangeText={setActual} keyboardType="numeric" />
              <AppInput label={t('production:jobRejectionReason')} value={reason} onChangeText={setReason} />
              <AppButton title={t('inventory:verifyStockReturn')} disabled={resolve.isPending || Number(actual) !== item.quantity || !reason.trim()}
                onPress={() => resolve.mutate({ id: item.id, approve: false })} />
            </> : <AppButton title={t('inventory:verifyStockReturn')} variant="outline"
              onPress={() => { setReturnEditing(item.id); setException(null); setActual(''); setReason(''); }} />
          )}
          {!!item.returnVerifiedAt && user?.role === 'factory-manager' && <AppButton
            title={t('inventory:approveStockReturn')} disabled={resolve.isPending}
            onPress={() => Alert.alert(t('inventory:approveStockReturn'), `${item.bundleCode} · ${item.quantity}`, [
              { text: t('common:cancel'), style: 'cancel' },
              { text: t('common:confirm'), onPress: () => resolve.mutate({ id: item.id, approve: true }) },
            ])} />}
        </>}
      </AppCard>)}
    </ScrollView>
  );
}
