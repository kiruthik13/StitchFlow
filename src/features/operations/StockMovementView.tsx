import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../services/api/apiClient';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';
import { STOCK_ITEMS } from '../../fixtures/mockData';

const newRequestId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export function StockMovementView({ mode }: { mode: 'input-in' | 'input-out' | 'output-in' | 'output-out' }) {
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation(['inventory', 'common', 'errors']);

  const titles: Record<string, { title: string; subtitle: string; source: string; dest: string }> = {
    'input-in': { title: 'Raw Material Goods Inward', subtitle: 'Receive fabric/trims into store', source: 'Supplier / Mill', dest: 'Main Store' },
    'input-out': { title: 'Issue Inputs to Production', subtitle: 'Dispatch materials to cutting/lines', source: 'Main Store', dest: 'Cutting Bay / Line 1' },
    'output-in': { title: 'Receive Output in Store', subtitle: 'Receive finished cartons from packing', source: 'Packing Department', dest: 'Finished Goods Bay' },
    'output-out': { title: 'Finished Goods Dispatch Out', subtitle: 'Ship packed orders to buyer freight', source: 'Finished Goods Bay', dest: 'Buyer Logistic Hub' },
  };

  const config = titles[mode] || titles['input-in'];
  const factoryId = user?.factoryId ?? '';
  const isRawMode = mode === 'input-in' || mode === 'input-out';

  const catalogQuery = useQuery({
    queryKey: ['stock-movement-catalog', factoryId, mode],
    enabled: !isDemoMode && !!factoryId,
    queryFn: async () => {
      const [materials, locations, bundles, lines] = await Promise.all([
        isRawMode ? apiRequest<Array<{ id: string; sku: string; name: string; baseUnit: string }>>(`/inventory/raw/materials?factoryId=${encodeURIComponent(factoryId)}`) : Promise.resolve([]),
        apiRequest<Array<{ id: string; name: string; isActive?: boolean }>>(`/masters/locations?factoryId=${encodeURIComponent(factoryId)}`),
        !isRawMode ? apiRequest<Array<{ id: string; bundleCode: string; quantity: number }>>(`/bundles?factoryId=${encodeURIComponent(factoryId)}`) : Promise.resolve([]),
        mode === 'output-out' ? apiRequest<Array<{ id: string; name: string }>>(`/masters/lines?factoryId=${encodeURIComponent(factoryId)}`) : Promise.resolve([]),
      ]);
      return { materials, locations: locations.filter((l) => l.isActive !== false), bundles, lines };
    },
  });

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedLocId, setSelectedLocId] = useState<string>('');
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [qty, setQty] = useState(50);
  const [referenceDoc, setReferenceDoc] = useState('DOC-2026-8812');
  const [notes, setNotes] = useState('');

  const liveMaterials = catalogQuery.data?.materials ?? [];
  const liveLocations = catalogQuery.data?.locations ?? [];
  const liveBundles = catalogQuery.data?.bundles ?? [];
  const liveLines = catalogQuery.data?.lines ?? [];

  const activeMaterial = liveMaterials.find((m) => m.id === selectedItemId) ?? liveMaterials[0];
  const activeBundle = liveBundles.find((b) => b.id === selectedItemId) ?? liveBundles[0];
  const activeLoc = liveLocations.find((l) => l.id === selectedLocId) ?? liveLocations[0];
  const activeLine = liveLines.find((l) => l.id === selectedLineId) ?? liveLines[0];

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'input-in' || mode === 'input-out') {
        if (!activeMaterial || !activeLoc) throw new Error('Material and location are required');
        const endpoint = mode === 'input-in' ? '/inventory/raw/receipts' : '/inventory/raw/issues';
        return apiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            materialId: activeMaterial.id,
            locationId: activeLoc.id,
            requestId: newRequestId(),
            quantity: qty,
            reference: referenceDoc.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });
      }
      if (!activeBundle || !activeLoc) throw new Error('Bundle and location are required');
      const endpoint = mode === 'output-in' ? '/inventory/output-in' : '/inventory/output-out';
      return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          bundleId: activeBundle.id,
          locationId: activeLoc.id,
          requestId: newRequestId(),
          quantity: qty,
          ...(mode === 'output-out' ? { destinationLineId: activeLine?.id } : {}),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-stock'] });
      queryClient.invalidateQueries({ queryKey: ['cut-stock-handovers'] });
      Alert.alert(
        `${config.title} Successful`,
        `Saved ${qty} ${isRawMode ? activeMaterial?.baseUnit ?? 'units' : 'pcs'} to server.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const handleSubmit = () => {
    if (isDemoMode) {
      const demoItem = STOCK_ITEMS[0];
      Alert.alert(
        `${config.title} Successful`,
        `Recorded movement of ${qty} ${demoItem.unit} of ${demoItem.name} from ${config.source} to ${config.dest}. Reference: ${referenceDoc}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    mutation.mutate();
  };

  if (!isDemoMode && catalogQuery.isLoading) {
    return (
      <View style={{ padding: spacing[8], alignItems: 'center' }}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>Movement Type</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{config.title}</AppText>
        <AppText variant="bodySmall" color="secondary">{config.subtitle}</AppText>

        <View style={styles.flowRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="secondary">Source Origin</AppText>
            <AppText variant="label" bold>{config.source}</AppText>
          </View>
          <AppText style={{ fontSize: 20 }}>➔</AppText>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="caption" color="secondary">Destination Stage</AppText>
            <AppText variant="label" bold>{config.dest}</AppText>
          </View>
        </View>
      </AppCard>

      {!isDemoMode && (
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>
            {isRawMode ? 'Select Material & Location' : 'Select Bundle & Location'}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
            {(isRawMode ? liveMaterials : liveBundles).map((item) => {
              const id = item.id;
              const selected = (isRawMode ? activeMaterial?.id : activeBundle?.id) === id;
              const label = 'sku' in item ? `${item.sku} · ${item.name}` : item.bundleCode;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setSelectedItemId(id)}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1.5],
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: selected ? tokens.brand : tokens.border,
                    backgroundColor: selected ? tokens.brandLight : tokens.surfaceSecondary,
                  }}
                >
                  <AppText variant="caption" bold={selected}>{label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {liveLocations.map((loc) => {
              const selected = activeLoc?.id === loc.id;
              return (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => setSelectedLocId(loc.id)}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1.5],
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: selected ? tokens.brand : tokens.border,
                    backgroundColor: selected ? tokens.brandLight : tokens.surfaceSecondary,
                  }}
                >
                  <AppText variant="caption" bold={selected}>{loc.name}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>
      )}

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppInput label="Reference Document / Invoice / DC No" value={referenceDoc} onChangeText={setReferenceDoc} />

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper
            label={`Transaction Quantity (${isDemoMode ? STOCK_ITEMS[0].unit : isRawMode ? activeMaterial?.baseUnit ?? 'units' : 'pcs'})`}
            value={qty}
            min={1}
            max={5000}
            step={10}
            onChange={setQty}
          />
        </View>

        <AppInput
          label="Transfer Notes / Vehicle No"
          value={notes}
          onChangeText={setNotes}
          placeholder="E.g. Container TN-09-AB-1234, inspected by Store Incharge"
        />
      </AppCard>

      <AppButton title={`Confirm & Post ${config.title}`} onPress={handleSubmit} loading={mutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
});
