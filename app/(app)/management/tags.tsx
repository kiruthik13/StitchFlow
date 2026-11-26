import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import {
  dispatchThermalPrint,
  loadPrinterConfig,
  savePrinterConfig,
  ThermalFormat,
} from '../../../src/services/printer/thermalPrinterService';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_REPRINT_REQUESTS = [
  { id: 'req-1', bundleCode: 'BND-00521', reason: 'Torn barcode tag during washing', requestedBy: 'Ramesh Kumar (Supervisor)', date: '2026-11-24 10:15', status: 'Pending' },
  { id: 'req-2', bundleCode: 'BND-00524', reason: 'Ink smudge, scanner cannot read', requestedBy: 'Kavitha (Operator)', date: '2026-11-24 11:30', status: 'Approved' },
];

interface PrintQueueRow {
  id: string;
  bundleId: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
  requestedBy: string;
  reason: string;
  createdAt: string;
}

interface BundleRow {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
}

function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function TagReprintScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [demoRequests, setDemoRequests] = useState(DEMO_REPRINT_REQUESTS);
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [format, setFormat] = useState<ThermalFormat>('zpl');
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [reprintReason, setReprintReason] = useState('');

  useEffect(() => {
    void loadPrinterConfig().then((cfg) => {
      setBridgeUrl(cfg.bridgeUrl);
      setFormat(cfg.format);
    });
  }, []);

  const queueQuery = useQuery({
    queryKey: ['tag-print-queue', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<PrintQueueRow[]>(`/bundles/print-queue?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const bundlesQuery = useQuery({
    queryKey: ['factory-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<BundleRow[]>(`/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const printDirect = useMutation({
    mutationFn: async (bundle: BundleRow) => {
      const res = await apiRequest<{ payload: string }>(`/bundles/${bundle.id}/tag-payload?format=${format}`);
      const cfg = { bridgeUrl, format };
      await savePrinterConfig(cfg);
      return dispatchThermalPrint(res.payload, bundle.bundleCode, cfg);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const reprintMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBundleId) throw new Error('Select a bundle');
      const res = await apiRequest<{
        bundle: BundleRow;
        printLogId: string;
        zplPayload: string;
        tsplPayload: string;
      }>(`/bundles/${selectedBundleId}/reprint`, {
        method: 'POST',
        body: JSON.stringify({ requestId: createUuidV4(), reason: reprintReason.trim() }),
      });
      const cfg = { bridgeUrl, format };
      await savePrinterConfig(cfg);
      const payload = format === 'tspl' ? res.tsplPayload : res.zplPayload;
      await dispatchThermalPrint(payload, res.bundle.bundleCode, cfg);
      return res;
    },
    onSuccess: () => {
      setReprintReason('');
      setSelectedBundleId(null);
      void queryClient.invalidateQueries({ queryKey: ['tag-print-queue', user?.id, factoryId] });
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const handleDemoApprove = (id: string) => {
    setDemoRequests(demoRequests.map((r) => r.id === id ? { ...r, status: 'Approved' } : r));
    Alert.alert(t('production:tagReprints'), 'ZPL');
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:tagReprints')} subtitle={t('production:printerSettings')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {isDemoMode ? (
          <>
            <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
              {t('production:tagReprints')} ({demoRequests.filter((r) => r.status === 'Pending').length})
            </AppText>
            {demoRequests.map((req) => (
              <AppCard key={req.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="code" mono bold>{req.bundleCode}</AppText>
                    <AppText variant="bodySmall" bold style={{ marginTop: 2 }}>{req.reason}</AppText>
                    <AppText variant="caption" color="secondary">{req.requestedBy}</AppText>
                    <AppText variant="caption" color="secondary">{req.date}</AppText>
                  </View>
                  <StatusBadge label={req.status.toUpperCase()} variant={req.status === 'Approved' ? 'success' : 'warning'} size="sm" />
                </View>

                {req.status === 'Pending' && (
                  <View style={{ marginTop: spacing[3], flexDirection: 'row', gap: spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <AppButton title={t('production:printTagNow')} size="sm" onPress={() => handleDemoApprove(req.id)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppButton title={t('common:cancel')} size="sm" variant="outline" onPress={() => setDemoRequests(demoRequests.filter((r) => r.id !== req.id))} />
                    </View>
                  </View>
                )}
              </AppCard>
            ))}
          </>
        ) : (
          <View style={{ gap: spacing[3] }}>
            <AppCard padding={spacing[4]}>
              <AppText variant="h4" bold style={{ marginBottom: spacing[2] }}>{t('production:printerSettings')}</AppText>
              <AppInput
                label={t('production:printerBridgeUrl')}
                value={bridgeUrl}
                onChangeText={setBridgeUrl}
                placeholder="http://192.168.1.50:9100/print"
              />
              <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1] }}>
                {t('production:printerFormat')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <AppButton title="ZPL" size="sm" variant={format === 'zpl' ? 'primary' : 'outline'} onPress={() => setFormat('zpl')} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton title="TSPL" size="sm" variant={format === 'tspl' ? 'primary' : 'outline'} onPress={() => setFormat('tspl')} />
                </View>
              </View>
              <AppButton title={t('common:confirm')} size="sm" variant="outline" onPress={() => void savePrinterConfig({ bridgeUrl, format })} />
            </AppCard>

            {bundlesQuery.data && bundlesQuery.data.length > 0 && (
              <AppCard padding={spacing[4]}>
                <AppText variant="h4" bold style={{ marginBottom: spacing[2] }}>{t('production:requestReprint')}</AppText>
                {bundlesQuery.data.slice(0, 15).map((b) => (
                  <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                      <AppText variant="caption" color="secondary">{b.jobCode} · {b.size} · {b.color} · {b.quantity}</AppText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing[1] }}>
                      <AppButton title={t('production:printTagNow')} size="sm" variant="outline" onPress={() => printDirect.mutate(b)} />
                      <AppButton title={t('production:tagReprints')} size="sm" variant={selectedBundleId === b.id ? 'primary' : 'outline'} onPress={() => setSelectedBundleId(b.id)} />
                    </View>
                  </View>
                ))}
                {selectedBundleId && (
                  <View style={{ marginTop: spacing[2] }}>
                    <AppInput label={t('production:reprintReason')} value={reprintReason} onChangeText={setReprintReason} />
                    <AppButton
                      title={t('production:requestReprint')}
                      disabled={reprintMutation.isPending || !reprintReason.trim()}
                      onPress={() => reprintMutation.mutate()}
                    />
                  </View>
                )}
              </AppCard>
            )}

            <AppText variant="caption" color="secondary" uppercase>{t('production:tagReprints')}</AppText>
            {queueQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {queueQuery.data?.map((req) => (
              <AppCard key={req.id} padding={spacing[3]}>
                <AppText variant="code" mono bold>{req.bundleCode}</AppText>
                <AppText variant="bodySmall" bold>{req.reason}</AppText>
                <AppText variant="caption" color="secondary">{req.jobCode} · {req.requestedBy} · {req.createdAt}</AppText>
              </AppCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
