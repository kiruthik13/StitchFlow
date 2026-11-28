import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { formatQuantity } from '../../utils/formatters';

interface Material { id: string; sku: string; name: string; baseUnit: string; requestId: string; quantity?: number }
interface Location { id: string; name: string; isActive?: boolean; factoryName?: string }
interface Transfer {
  id: string; senderId: string; sku: string; baseUnit: string; quantity: number;
  receivedAt: string | null; disputedAt: string | null; returnedAt: string | null; source: string; destination: string; destinationFactoryId: string;
}

interface StockCount { id: string; sku: string; baseUnit: string; location: string; reason: string;
  expectedQuantity: number; observedQuantity: number; approvedAt: string | null }

export function RawInventoryPanel({ mode }: { mode: 'receipt' | 'transfer' | 'count' }) {
  const { t } = useTranslation(['inventory', 'common', 'production', 'errors']);
  const { user, serverPermissions } = useAuthStore();
  const factory = user?.factoryId;
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const cache = useQueryClient();
  const allowed = !!factory && serverPermissions.includes('CAN_MANAGE_INVENTORY');
  const isStore = allowed && user?.role === 'store-dispatch';
  const suffix = `?factoryId=${encodeURIComponent(factory ?? '')}`;
  const catalogKey = ['raw-catalog', user?.id, factory, mode];
  const transferKey = ['raw-transfers', user?.id, factory];
  const stockKey = ['raw-stock', user?.id, factory];
  const q = useQuery({
    queryKey: catalogKey, enabled: allowed,
    queryFn: async () => {
      const [materials, locations, destinations] = await Promise.all([
        apiRequest<Material[]>(`/inventory/raw/materials${suffix}`), apiRequest<Location[]>(`/masters/locations${suffix}`),
        mode === 'transfer' ? apiRequest<Location[]>(`/inventory/raw/destinations${suffix}`) : Promise.resolve([]),
      ]);
      return { materials, locations: locations.filter(item => item.isActive), destinations };
    },
  });
  const transfers = useQuery({
    queryKey: transferKey, enabled: allowed && mode === 'transfer' && focused, refetchInterval: 20000, refetchIntervalInBackground: false,
    queryFn: () => apiRequest<Transfer[]>(`/inventory/raw/transfers${suffix}`),
  });
  const countKey = ['raw-counts', user?.id, factory];
  const counts = useQuery({
    queryKey: countKey, enabled: allowed && mode === 'count' && focused, refetchInterval: 20000, refetchIntervalInBackground: false,
    queryFn: () => apiRequest<StockCount[]>(`/inventory/raw/counts${suffix}`),
  });
  const stock = useQuery({
    queryKey: stockKey, enabled: allowed && mode === 'receipt' && focused, refetchInterval: 20000, refetchIntervalInBackground: false,
    queryFn: () => apiRequest<Material[]>(`/inventory/raw/stock${suffix}`),
  });
  const [selected, setSelected] = useState<Material | null>(null);
  const [location, setLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [issue, setIssue] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'piece' | 'millimeter' | 'gram'>('piece');
  const [receiving, setReceiving] = useState<string | null>(null);
  const [count, setCount] = useState('');
  const [discrepancy, setDiscrepancy] = useState('');
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: catalogKey });
    void cache.invalidateQueries({ queryKey: transferKey });
    void cache.invalidateQueries({ queryKey: stockKey });
    void cache.invalidateQueries({ queryKey: countKey });
  };
  const create = useMutation({
    mutationFn: () => apiRequest('/inventory/raw/materials', { method: 'POST',
      body: JSON.stringify({ sku, name, baseUnit: unit }) }),
    onSuccess: () => { setSku(''); setName(''); refresh(); },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const submit = useMutation({
    mutationFn: (material: Material) => apiRequest(
      mode === 'transfer' ? '/inventory/raw/transfers' : mode === 'count' ? '/inventory/raw/counts' : issue ? '/inventory/raw/issues' : '/inventory/raw/receipts',
      { method: 'POST', body: JSON.stringify({ materialId: material.id, locationId: location, requestId: material.requestId,
        ...(mode === 'count' ? { observedQuantity: Number(quantity), reason: reference } :
          { quantity: Number(quantity), ...(mode === 'transfer' ? { destinationLocationId: destination } : { reference }) }) }) },
    ),
    onSuccess: () => { setSelected(null); setQuantity(''); setReference(''); refresh(); },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const receive = useMutation({
    mutationFn: (id: string) => apiRequest(`/inventory/raw/transfers/${id}/receive`, {
      method: 'POST', body: JSON.stringify({ quantity: Number(count) }),
    }),
    onSuccess: () => { setReceiving(null); setCount(''); refresh(); },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const resolveTransfer = useMutation({
    mutationFn: ({ id, quantity, restore }: { id: string; quantity: number; restore: boolean }) => apiRequest(
      `/inventory/raw/transfers/${id}/${restore ? 'return' : 'discrepancies'}`, {
        method: 'POST', body: JSON.stringify(restore ? { quantity, ...(discrepancy.trim() ? { lossReason: discrepancy.trim() } : {}) } : { observedQuantity: quantity, reason: discrepancy.trim() }),
      },
    ),
    onSuccess: () => { setReceiving(null); setDiscrepancy(''); setCount(''); refresh(); },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const approveCount = useMutation({
    mutationFn: (id: string) => apiRequest(`/inventory/raw/counts/${id}/approve`, { method: 'POST' }),
    onSuccess: refresh,
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const choices = (items: Location[], current: string, change: (id: string) => void) => items.map(item => (
    <AppButton key={item.id} size="sm" variant={item.id === current ? 'primary' : 'outline'}
      title={item.factoryName ? `${item.factoryName} · ${item.name}` : item.name} onPress={() => change(item.id)} />
  ));
  if (!allowed) return <AppText>{t('errors:unauthorized')}</AppText>;
  if (q.isLoading) return <AppText>{t('common:loading')}</AppText>;
  if (q.isError) return <AppButton title={t('common:refresh')} onPress={() => void q.refetch()} />;

  return (
    <View style={{ gap: spacing[3] }}>
      {user?.role === 'factory-manager' && mode === 'receipt' && <AppCard padding={spacing[3]}>
        <AppInput label={t('production:masterRecordCode')} value={sku} onChangeText={setSku} />
        <AppInput label={t('production:masterRecordName')} value={name} onChangeText={setName} />
        {(['piece', 'millimeter', 'gram'] as const).map(value => <AppButton key={value}
          title={t(`inventory:rawUnit_${value}`)} size="sm" variant={unit === value ? 'primary' : 'outline'} onPress={() => setUnit(value)} />)}
        <AppButton title={t('inventory:createRawMaterial')} disabled={!sku.trim() || !name.trim() || create.isPending} onPress={() => create.mutate()} />
      </AppCard>}
      {mode === 'receipt' && !!stock.data?.length && (
        <>
          <SummaryStrip
            metrics={[
              { label: t('inventory:stockInventoryItems'), value: stock.data.length, tone: 'brand' },
              {
                label: t('inventory:lowStock'),
                value: stock.data.filter(m => Number(m.quantity ?? 0) <= 0).length,
                tone: stock.data.some(m => Number(m.quantity ?? 0) <= 0) ? 'warning' : 'success',
              },
            ]}
          />
          <SectionHeader title={t('inventory:availableStock')} count={stock.data.length} />
          {stock.data.map(material => {
            const qty = Number(material.quantity ?? 0);
            const unitLabel = t(`inventory:rawUnit_${material.baseUnit}`);
            return (
              <StructuredRecordCard
                key={material.id}
                code={material.sku}
                title={material.name}
                status={{
                  label: qty > 0 ? t('inventory:availableStock').toUpperCase() : t('inventory:lowStock').toUpperCase(),
                  variant: qty > 0 ? 'success' : 'warning',
                  dot: true,
                }}
                fields={[
                  { label: t('inventory:currentStock'), value: formatQuantity(qty, unitLabel), mono: true, tone: qty > 0 ? 'brand' : 'warning' },
                  { label: t('common:unit'), value: unitLabel },
                ]}
              />
            );
          })}
        </>
      )}
      {isStore && <AppCard padding={spacing[3]}>
        <View style={{ gap: spacing[2] }}>
          {mode === 'receipt' && <AppButton title={t(issue ? 'inventory:postRawIssue' : 'inventory:goodsReceipt')} variant="outline"
            onPress={() => setIssue(!issue)} />}
          {q.data?.materials.map(material => <AppButton key={material.id} title={`${material.sku} · ${material.name}`}
            size="sm" variant={selected?.id === material.id ? 'primary' : 'outline'} onPress={() => setSelected(material)} />)}
          <AppText variant="label">{t('inventory:cutStockLocation')}</AppText>
          {choices(q.data?.locations ?? [], location, setLocation)}
          {mode === 'transfer' && <>
            <AppText variant="label">{t('inventory:transferDestination')}</AppText>
            {choices(q.data?.destinations ?? [], destination, setDestination)}
          </>}
          {mode !== 'transfer' && <AppInput label={t('inventory:stockReference')} value={reference} onChangeText={setReference} />}
          <AppInput label={selected ? t(`inventory:rawUnit_${selected.baseUnit}`) : t('production:enterQuantity')}
            value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <AppButton title={t(mode === 'transfer' ? 'inventory:sendCutStock' : mode === 'count' ? 'inventory:stockCount' : issue ? 'inventory:postRawIssue' : 'inventory:goodsReceipt')}
            disabled={!selected || !location || (mode === 'transfer' ? !destination : !reference.trim())
              || !quantity.trim() || !Number.isInteger(Number(quantity))
              || (mode === 'count' ? Number(quantity) < 0 : Number(quantity) <= 0) || submit.isPending}
            onPress={() => { if (selected) submit.mutate(selected); }} />
        </View>
      </AppCard>}
      {mode === 'count' && !!counts.data?.length && (
        <>
          <SectionHeader title={t('inventory:stockCount')} count={counts.data.length} />
          {counts.data.map(item => {
            const diff = Number(item.observedQuantity) - Number(item.expectedQuantity);
            const unitLabel = t(`inventory:rawUnit_${item.baseUnit}`);
            return (
              <StructuredRecordCard
                key={item.id}
                code={item.sku}
                title={item.location}
                status={{
                  label: item.approvedAt ? t('common:approved').toUpperCase() : t('common:pending').toUpperCase(),
                  variant: item.approvedAt ? 'success' : 'warning',
                  dot: true,
                }}
                fields={[
                  { label: t('inventory:availableStock'), value: formatQuantity(item.expectedQuantity, unitLabel), mono: true },
                  { label: t('inventory:physicalCount'), value: formatQuantity(item.observedQuantity, unitLabel), mono: true, tone: diff === 0 ? 'success' : 'warning' },
                  { label: t('inventory:discrepancy'), value: `${diff > 0 ? '+' : ''}${diff} ${unitLabel}`, mono: true, tone: diff === 0 ? 'default' : 'danger', fullWidth: true },
                ]}
                highlight={item.reason ? { label: t('common:remarks'), value: item.reason, tone: 'info' } : undefined}
              >
                {!item.approvedAt && user?.role === 'factory-manager' && (
                  <AppButton
                    title={t('inventory:approveStockCount')}
                    disabled={approveCount.isPending}
                    onPress={() =>
                      Alert.alert(t('inventory:approveStockCount'), item.sku, [
                        { text: t('common:cancel'), style: 'cancel' },
                        { text: t('common:confirm'), onPress: () => approveCount.mutate(item.id) },
                      ])
                    }
                  />
                )}
              </StructuredRecordCard>
            );
          })}
        </>
      )}
      {mode === 'transfer' && !!transfers.data?.length && (
        <>
          <SectionHeader title={t('inventory:interFactoryTransfer')} count={transfers.data.length} />
          {transfers.data.map(transfer => {
            const unitLabel = t(`inventory:rawUnit_${transfer.baseUnit}`);
            const transferStatus = transfer.returnedAt
              ? { label: t('inventory:rawTransferReturned').toUpperCase(), variant: 'neutral' as const, dot: true }
              : transfer.receivedAt
              ? { label: t('inventory:rawTransferReceived').toUpperCase(), variant: 'success' as const, dot: true }
              : transfer.disputedAt
              ? { label: t('inventory:rawTransferDisputed').toUpperCase(), variant: 'danger' as const, dot: true }
              : { label: t('inventory:rawTransferInTransit').toUpperCase(), variant: 'info' as const, dot: true };

            return (
              <StructuredRecordCard
                key={transfer.id}
                code={transfer.sku}
                title={`${transfer.source} → ${transfer.destination}`}
                status={transferStatus}
                fields={[
                  { label: t('common:quantity'), value: formatQuantity(transfer.quantity, unitLabel), mono: true, tone: 'brand' },
                  { label: t('inventory:transferDestination'), value: transfer.destination },
                ]}
              >
                {isStore && !transfer.receivedAt && !transfer.disputedAt && transfer.destinationFactoryId === factory && transfer.senderId !== user?.id && (
                  receiving === transfer.id ? <>
                    <AppInput label={t('production:enterQuantity')} value={count} onChangeText={setCount} keyboardType="numeric" />
                    <AppButton title={t('common:confirm')} disabled={receive.isPending || Number(count) !== transfer.quantity}
                      onPress={() => receive.mutate(transfer.id)} />
                    <AppInput label={t('production:jobRejectionReason')} value={discrepancy} onChangeText={setDiscrepancy} />
                    <AppButton title={t('inventory:recordCutStockDiscrepancy')} variant="outline"
                      disabled={!count.trim() || !Number.isInteger(Number(count)) || Number(count) < 0
                        || Number(count) === transfer.quantity || !discrepancy.trim() || resolveTransfer.isPending}
                      onPress={() => resolveTransfer.mutate({ id: transfer.id, quantity: Number(count), restore: false })} />
                  </> : <AppButton title={t('common:confirm')} variant="outline" onPress={() => { setReceiving(transfer.id); setCount(''); setDiscrepancy(''); }} />
                )}
                {isStore && transfer.disputedAt && !transfer.returnedAt && transfer.senderId === user?.id && (
                  receiving === `return-${transfer.id}` ? <>
                    <AppInput label={t('production:enterQuantity')} value={count} onChangeText={setCount} keyboardType="numeric" />
                    <AppInput label={t('production:jobRejectionReason')} value={discrepancy} onChangeText={setDiscrepancy} />
                    <AppButton title={t('inventory:verifyStockReturn')} variant="outline"
                      disabled={!count.trim() || !Number.isInteger(Number(count)) || Number(count) < 0
                        || Number(count) > transfer.quantity || resolveTransfer.isPending}
                      onPress={() => resolveTransfer.mutate({ id: transfer.id, quantity: Number(count), restore: true })} />
                  </> : (
                    <AppButton title={t('inventory:verifyStockReturn')} variant="outline" disabled={resolveTransfer.isPending}
                      onPress={() => { setReceiving(`return-${transfer.id}`); setCount(String(transfer.quantity)); setDiscrepancy(''); }} />
                  )
                )}
              </StructuredRecordCard>
            );
          })}
        </>
      )}
    </View>
  );
}
