import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const SAM_BENCHMARKS = [
  { style: 'Polo T-Shirt (PTS-001)', targetSam: 14.5, actualSam: 15.2, eff: 95, factory: 'Factory A' },
  { style: 'Chino Trousers (CT-002)', targetSam: 22.3, actualSam: 24.8, eff: 90, factory: 'Factory A' },
  { style: 'Linen Shirt (LS-003)', targetSam: 18.0, actualSam: 23.5, eff: 76, factory: 'Factory B' },
  { style: 'Crew Neck Tee (CNT-004)', targetSam: 9.8, actualSam: 9.9, eff: 99, factory: 'Factory B' },
];

export default function SamEfficiencyScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:samEfficiency')} subtitle={t('production:executiveAnalytics')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText variant="caption" color="secondary">Group Average Efficiency</AppText>
              <AppText style={{ fontSize: 36, fontWeight: '800', color: tokens.brand, fontFamily: 'JetBrainsMono_700Bold' }}>90.0%</AppText>
            </View>
            <StatusBadge label="ON TARGET" variant="success" size="sm" />
          </View>
        </AppCard>

        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Style-wise SAM Benchmark Comparison
        </AppText>

        {SAM_BENCHMARKS.map((item, idx) => (
          <AppCard key={idx} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <AppText variant="h4" bold>{item.style}</AppText>
                <AppText variant="caption" color="secondary">{item.factory}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText style={{ fontSize: 22, fontWeight: '800', color: item.eff >= 90 ? tokens.success : tokens.warning, fontFamily: 'JetBrainsMono_700Bold' }}>
                  {item.eff}%
                </AppText>
                <AppText variant="caption" color="secondary">SAM Eff.</AppText>
              </View>
            </View>

            <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Benchmark SAM</AppText><AppText variant="label" bold>{item.targetSam} min</AppText></View>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Actual Plant SAM</AppText><AppText variant="label" bold>{item.actualSam} min</AppText></View>
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row' },
});
