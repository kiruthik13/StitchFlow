import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StickyActionLayout } from '../../../src/design-system/layouts/StickyActionLayout';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { STYLES } from '../../../src/fixtures/mockData';

interface LiveStyle {
  id: string;
  code: string;
  name: string;
}

interface SamPlan {
  id: string;
  styleId: string;
  styleName: string;
  totalSam: number;
  targetPcsPerHour: number;
  operationBreakdown: Record<string, number>;
}

export default function SamEntryScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [selectedDemoStyle, setSelectedDemoStyle] = useState(STYLES[0]);
  const [selectedLiveStyleId, setSelectedLiveStyleId] = useState<string | null>(null);
  const [collarSam, setCollarSam] = useState('2.8');
  const [sleeveSam, setSleeveSam] = useState('3.4');
  const [frontSam, setFrontSam] = useState('4.2');
  const [hemSam, setHemSam] = useState('1.5');
  const [assemblySam, setAssemblySam] = useState('2.6');

  const stylesQuery = useQuery({
    queryKey: ['sam-styles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveStyle[]>(`/masters/styles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const samQuery = useQuery({
    queryKey: ['sam-plans', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<SamPlan[]>(`/planning/sam?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeStyleId = selectedLiveStyleId ?? stylesQuery.data?.[0]?.id ?? null;

  const totalSamNum =
    (parseFloat(collarSam || '0') || 0) +
    (parseFloat(sleeveSam || '0') || 0) +
    (parseFloat(frontSam || '0') || 0) +
    (parseFloat(hemSam || '0') || 0) +
    (parseFloat(assemblySam || '0') || 0);
  const totalSam = totalSamNum.toFixed(1);
  const targetPcsPerHour = totalSamNum > 0 ? Math.round(60 / totalSamNum) : 0;

  const saveSam = useMutation({
    mutationFn: () => apiRequest('/planning/sam', {
      method: 'PUT',
      body: JSON.stringify({
        factoryId,
        styleId: activeStyleId,
        totalSam: Number(totalSamNum.toFixed(2)),
        operationBreakdown: {
          front: parseFloat(frontSam || '0') || 0,
          collar: parseFloat(collarSam || '0') || 0,
          sleeve: parseFloat(sleeveSam || '0') || 0,
          hem: parseFloat(hemSam || '0') || 0,
          assembly: parseFloat(assemblySam || '0') || 0,
        },
      }),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sam-plans', user?.id, factoryId] });
      Alert.alert(t('production:samPlan'), `${totalSam} SAM (${targetPcsPerHour} pcs/hr)`);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const handleSave = () => {
    if (isDemoMode) {
      Alert.alert(t('production:samPlan'), `${selectedDemoStyle.name} · ${totalSam} SAM · ${targetPcsPerHour} pcs/hr`);
      return;
    }
    if (!activeStyleId || totalSamNum <= 0) return;
    saveSam.mutate();
  };

  const styleItems = isDemoMode
    ? STYLES.map((s) => ({ id: s.id, name: s.name }))
    : (stylesQuery.data ?? []);

  const currentSelectedId = isDemoMode ? selectedDemoStyle.id : activeStyleId;

  return (
    <StickyActionLayout
      header={<AppHeader title={t('production:samPlan')} subtitle={t('production:samEfficiency')} showBack onBack={() => router.back()} />}
      stickyFooter={<AppButton title={t('common:confirm')} fullWidth size="lg" disabled={!isDemoMode && (saveSam.isPending || !activeStyleId || totalSamNum <= 0)} onPress={handleSave} />}
    >
      <AppText variant="caption" color="secondary" uppercase style={styles.sectionTitle}>{t('production:style')}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {styleItems.map((s) => {
            const selected = currentSelectedId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  if (isDemoMode) {
                    const found = STYLES.find((x) => x.id === s.id);
                    if (found) setSelectedDemoStyle(found);
                  } else {
                    setSelectedLiveStyleId(s.id);
                    const existing = samQuery.data?.find((p) => p.styleId === s.id);
                    if (existing?.operationBreakdown) {
                      setFrontSam(String(existing.operationBreakdown.front ?? '4.2'));
                      setCollarSam(String(existing.operationBreakdown.collar ?? '2.8'));
                      setSleeveSam(String(existing.operationBreakdown.sleeve ?? '3.4'));
                      setHemSam(String(existing.operationBreakdown.hem ?? '1.5'));
                      setAssemblySam(String(existing.operationBreakdown.assembly ?? '2.6'));
                    }
                  }
                }}
                style={[
                  styles.styleChip,
                  {
                    backgroundColor: selected ? tokens.brand : tokens.surface,
                    borderColor: selected ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText variant="label" style={{ color: selected ? tokens.textInverse : tokens.textPrimary }}>
                  {s.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <AppCard variant="forest" padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <View style={styles.calcRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" style={{ color: tokens.textInverse }}>{t('production:samValue')}</AppText>
            <AppText style={{ fontSize: 36, lineHeight: 46, fontWeight: '800', color: tokens.textInverse, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
              {totalSam} SAM
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption" style={{ color: tokens.textInverse }}>{t('production:targetPaceLabel')}</AppText>
            <AppText style={{ fontSize: 24, lineHeight: 32, fontWeight: '700', color: tokens.success, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
              {targetPcsPerHour} pcs/hr
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard padding={spacing[4]}>
        <AppInput label="1. Front" value={frontSam} onChangeText={setFrontSam} keyboardType="numeric" />
        <AppInput label="2. Collar" value={collarSam} onChangeText={setCollarSam} keyboardType="numeric" />
        <AppInput label="3. Sleeve" value={sleeveSam} onChangeText={setSleeveSam} keyboardType="numeric" />
        <AppInput label="4. Hem" value={hemSam} onChangeText={setHemSam} keyboardType="numeric" />
        <AppInput label="5. Assembly" value={assemblySam} onChangeText={setAssemblySam} keyboardType="numeric" />
      </AppCard>

      {!isDemoMode && samQuery.data && samQuery.data.length > 0 && (
        <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
          {samQuery.data.map((plan) => (
            <AppCard key={plan.id} padding={spacing[3]}>
              <AppText variant="label" bold>{plan.styleName}</AppText>
              <AppText variant="caption" color="secondary">{plan.totalSam} SAM · {plan.targetPcsPerHour} pcs/hr</AppText>
            </AppCard>
          ))}
        </View>
      )}
    </StickyActionLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { letterSpacing: 0.8, marginBottom: spacing[2] },
  styleChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
