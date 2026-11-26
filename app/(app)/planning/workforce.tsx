import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
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
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_LINES = [
  { id: 'l1', line: 'Line 1 (Tops)', planned: 24, present: 23, helpers: 4, absentees: 1, eff: 82, supervisor: 'Ramesh Kumar' },
  { id: 'l2', line: 'Line 2 (Bottoms)', planned: 26, present: 22, helpers: 3, absentees: 4, eff: 68, supervisor: 'Muthu Vel' },
  { id: 'l3', line: 'Line 3 (Polos)', planned: 22, present: 22, helpers: 4, absentees: 0, eff: 88, supervisor: 'Suresh Raina' },
  { id: 'l4', line: 'Line 4 (Dresses)', planned: 20, present: 18, helpers: 2, absentees: 2, eff: 74, supervisor: 'Priya Mani' },
];

interface LiveWorkforceLine {
  lineId: string;
  lineName: string;
  lineCode: string;
  plannedOperators: number;
  presentOperators: number;
  helpersCount: number;
  shiftMinutes: number;
  efficiencyPercent: number;
}

export default function WorkforceScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const workforceQuery = useQuery({
    queryKey: ['workforce-plans', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveWorkforceLine[]>(`/planning/workforce?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const rebalanceLine = useMutation({
    mutationFn: (item: LiveWorkforceLine) => apiRequest('/planning/workforce', {
      method: 'PUT',
      body: JSON.stringify({
        factoryId,
        lineId: item.lineId,
        plannedOperators: item.plannedOperators,
        presentOperators: Math.min(item.plannedOperators, item.presentOperators + 1),
        helpersCount: item.helpersCount + 1,
        shiftMinutes: item.shiftMinutes,
        efficiencyPercent: item.efficiencyPercent,
      }),
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workforce-plans', user?.id, factoryId] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const lines: Array<LiveWorkforceLine & { subtitle: string }> = isDemoMode
    ? DEMO_LINES.map((d) => ({
        lineId: d.id,
        lineName: d.line,
        lineCode: d.id,
        plannedOperators: d.planned,
        presentOperators: d.present,
        helpersCount: d.helpers,
        shiftMinutes: 480,
        efficiencyPercent: d.eff,
        subtitle: d.supervisor,
      }))
    : (workforceQuery.data ?? []).map((w) => ({
        ...w,
        subtitle: w.lineCode,
      }));

  const totalPlanned = lines.reduce((s, l) => s + l.plannedOperators, 0);
  const totalPresent = lines.reduce((s, l) => s + l.presentOperators, 0);
  const totalAbsentees = Math.max(0, totalPlanned - totalPresent);
  const avgEff = lines.length ? Math.round(lines.reduce((s, l) => s + l.efficiencyPercent, 0) / lines.length) : 0;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:lineStrength')} subtitle={t('production:workforceDeployment')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Planned</AppText>
              <AppText variant="h3" bold>{totalPlanned}</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Present</AppText>
              <AppText variant="h3" bold style={{ color: tokens.success }}>{totalPresent}</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Gap</AppText>
              <AppText variant="h3" bold style={{ color: tokens.danger }}>{totalAbsentees}</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Eff.</AppText>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>{avgEff}%</AppText>
            </View>
          </View>
        </AppCard>

        {!isDemoMode && workforceQuery.isLoading && <AppText>{t('common:loading')}</AppText>}

        {lines.map((item) => {
          const gap = Math.max(0, item.plannedOperators - item.presentOperators);
          return (
            <AppCard key={item.lineId} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.lineHeader}>
                <View>
                  <AppText variant="h4" bold>{item.lineName}</AppText>
                  <AppText variant="caption" color="secondary">{item.subtitle}</AppText>
                </View>
                <StatusBadge
                  label={gap > 2 ? 'UNDERSTAFFED' : 'BALANCED'}
                  variant={gap > 2 ? 'danger' : 'success'}
                  size="sm"
                />
              </View>

              <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="secondary">Operators</AppText>
                  <AppText variant="label" bold>{item.presentOperators}/{item.plannedOperators}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="secondary">Helpers</AppText>
                  <AppText variant="label" bold>{item.helpersCount}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="secondary">Eff.</AppText>
                  <AppText variant="label" bold style={{ color: item.efficiencyPercent >= 80 ? tokens.success : tokens.warning }}>
                    {item.efficiencyPercent}%
                  </AppText>
                </View>
              </View>

              {gap > 0 && (
                <View style={{ marginTop: spacing[3] }}>
                  <AppButton
                    title={`+1 (${gap})`}
                    variant="outline"
                    size="sm"
                    disabled={!isDemoMode && rebalanceLine.isPending}
                    onPress={() => {
                      if (isDemoMode) {
                        Alert.alert(t('production:workforceDeployment'), item.lineName);
                      } else {
                        rebalanceLine.mutate(item);
                      }
                    }}
                  />
                </View>
              )}
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
