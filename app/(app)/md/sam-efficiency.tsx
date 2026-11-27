import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_SAM_BENCHMARKS = [
  { style: 'Polo T-Shirt (PTS-001)', targetSam: 14.5, actualSam: 15.2, eff: 95, factory: 'Factory A' },
  { style: 'Chino Trousers (CT-002)', targetSam: 22.3, actualSam: 24.8, eff: 90, factory: 'Factory A' },
];

interface LiveSamPlan {
  id: string;
  styleName: string;
  styleCode: string;
  totalSam: number;
  targetPcsPerHour: number;
}

export default function SamEfficiencyScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;

  const samQuery = useQuery({
    queryKey: ['md-sam-plans', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveSamPlan[]>(`/planning/sam?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:samEfficiency')} subtitle={t('production:executiveAnalytics')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {isDemoMode ? (
          DEMO_SAM_BENCHMARKS.map((item, idx) => (
            <AppCard key={idx} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{item.style}</AppText>
                  <AppText variant="caption" color="secondary">{item.factory}</AppText>
                </View>
                <StatusBadge label={`${item.eff}%`} variant={item.eff >= 90 ? 'success' : 'warning'} size="sm" />
              </View>
            </AppCard>
          ))
        ) : (
          <>
            {samQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {(samQuery.data ?? []).map((item) => (
              <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{item.styleName}</AppText>
                    <AppText variant="code" color="secondary">{item.styleCode}</AppText>
                  </View>
                  <StatusBadge label={`${item.totalSam} SAM`} variant="brand" size="sm" />
                </View>
                <AppText variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
                  {item.targetPcsPerHour} pcs/hr
                </AppText>
              </AppCard>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
