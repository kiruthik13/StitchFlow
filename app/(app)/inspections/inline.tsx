import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_STATIONS = [
  { id: 'st-1', name: 'Collar Runstitch', operator: 'Kavitha S.', line: 'Line 1' },
  { id: 'st-2', name: 'Sleeve Attachment', operator: 'Murugan P.', line: 'Line 1' },
  { id: 'st-3', name: 'Side Seam Overlock', operator: 'Devi S.', line: 'Line 1' },
  { id: 'st-4', name: 'Bottom Hemming', operator: 'Praveen C.', line: 'Line 1' },
];

interface TailorStation {
  id: string;
  lineId: string;
  lineName: string;
  operatorName: string;
  operationName: string;
  machineCode: string;
}

interface InlineAuditRow {
  id: string;
  stationName: string;
  operatorName: string;
  sampleQty: number;
  defectQty: number;
  defectNotes?: string | null;
  status: 'pass' | 'alert';
  createdAt: string;
}

export default function InlineQCScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [selectedDemo, setSelectedDemo] = useState(DEMO_STATIONS[0]);
  const [selectedStation, setSelectedStation] = useState<TailorStation | null>(null);
  const [checkedPieces, setCheckedPieces] = useState(10);
  const [defectsFound, setDefectsFound] = useState(0);
  const [defectNotes, setDefectNotes] = useState('');

  const stationsQuery = useQuery({
    queryKey: ['inline-stations', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<TailorStation[]>(`/masters/tailor-mappings?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const auditsQuery = useQuery({
    queryKey: ['inline-audits', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<InlineAuditRow[]>(`/quality/inline-audits?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeStation = selectedStation ?? stationsQuery.data?.[0] ?? null;

  const submitAudit = useMutation({
    mutationFn: () => apiRequest('/quality/inline-audits', {
      method: 'POST',
      body: JSON.stringify({
        factoryId,
        lineId: activeStation?.lineId,
        stationName: activeStation?.operationName ?? 'Inline Station',
        operatorName: activeStation?.operatorName ?? 'Operator',
        sampleQty: checkedPieces,
        defectQty: defectsFound,
        defectNotes: defectNotes.trim() || undefined,
      }),
    }),
    onSuccess: () => {
      setDefectsFound(0);
      setDefectNotes('');
      void queryClient.invalidateQueries({ queryKey: ['inline-audits', user?.id, factoryId] });
      Alert.alert(t('quality:inlineQC'), `${checkedPieces} · ${defectsFound}`, [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const handleDemoSubmit = () => {
    Alert.alert(
      t('quality:inlineQC'),
      `${selectedDemo.name} (${selectedDemo.operator}) · ${checkedPieces} / ${defectsFound}`,
      [{ text: t('common:confirm'), onPress: () => router.back() }],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('quality:inlineQC')} subtitle={t('quality:inspectionDetails')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppText variant="caption" color="secondary" uppercase style={styles.sectionTitle}>
          {t('quality:inlineQC')}
        </AppText>

        {isDemoMode ? (
          <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
            {DEMO_STATIONS.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => setSelectedDemo(st)}
                style={[
                  styles.stationCard,
                  {
                    backgroundColor: selectedDemo.id === st.id ? tokens.brandLight : tokens.surface,
                    borderColor: selectedDemo.id === st.id ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{st.name}</AppText>
                  <AppText variant="caption" color="secondary">{st.operator} · {st.line}</AppText>
                </View>
                <StatusBadge label={selectedDemo.id === st.id ? 'SELECTED' : 'AUDIT'} variant={selectedDemo.id === st.id ? 'brand' : 'neutral'} size="sm" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
            {stationsQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {stationsQuery.data?.map((st) => {
              const selected = activeStation?.id === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => setSelectedStation(st)}
                  style={[
                    styles.stationCard,
                    {
                      backgroundColor: selected ? tokens.brandLight : tokens.surface,
                      borderColor: selected ? tokens.brand : tokens.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{st.operationName}</AppText>
                    <AppText variant="caption" color="secondary">{st.operatorName} · {st.lineName} ({st.machineCode})</AppText>
                  </View>
                  <StatusBadge label={selected ? 'SELECTED' : 'AUDIT'} variant={selected ? 'brand' : 'neutral'} size="sm" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper
            label={t('quality:inspectedQty')}
            value={checkedPieces}
            min={5}
            max={50}
            step={5}
            onChange={(val) => {
              setCheckedPieces(val);
              if (defectsFound > val) setDefectsFound(val);
            }}
          />
          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper
              label={t('quality:defectCount')}
              value={defectsFound}
              min={0}
              max={checkedPieces}
              step={1}
              onChange={setDefectsFound}
            />
          </View>
          {!isDemoMode && (
            <View style={{ marginTop: spacing[3] }}>
              <AppInput label={t('quality:defectNotes')} value={defectNotes} onChangeText={setDefectNotes} />
            </View>
          )}
        </AppCard>

        <AppButton
          title={t('common:confirm')}
          disabled={!isDemoMode && submitAudit.isPending}
          onPress={isDemoMode ? handleDemoSubmit : () => submitAudit.mutate()}
        />

        {!isDemoMode && auditsQuery.data && auditsQuery.data.length > 0 && (
          <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
            {auditsQuery.data.slice(0, 10).map((a) => (
              <AppCard key={a.id} padding={spacing[3]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" bold>{a.stationName} · {a.operatorName}</AppText>
                    <AppText variant="caption" color="secondary">{a.sampleQty} / {a.defectQty}</AppText>
                  </View>
                  <StatusBadge label={a.status.toUpperCase()} variant={a.status === 'pass' ? 'success' : 'danger'} size="sm" />
                </View>
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
  sectionTitle: { letterSpacing: 0.8, marginBottom: spacing[2] },
  stationCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
