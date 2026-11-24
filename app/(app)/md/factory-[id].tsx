import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { MetricCard } from '../../../src/design-system/components/MetricCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { FACTORIES } from '../../../src/fixtures/mockData';

export default function FactoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const factory = FACTORIES.find((f) => f.id === id) || FACTORIES[0];
  const eff = factory.id === 'factory-a' ? 82 : 68;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={factory.name} subtitle={`${factory.location} · Executive View`} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* KPI Grid */}
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}><MetricCard label="Active Lines" value={`${factory.activeLines}/${factory.totalLines}`} compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="Daily Capacity" value={`${factory.capacity} pcs`} compact /></View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}><MetricCard label="Plant Efficiency" value={`${eff}%`} variant={eff >= 80 ? 'success' : 'warning'} compact /></View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}><MetricCard label="On-Time Delivery" value="94%" variant="brand" compact /></View>
        </View>

        {/* Lines Breakdown */}
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginTop: spacing[4], marginBottom: spacing[2] }}>
          Operating Lines Status
        </AppText>

        {[1, 2, 3, 4].map((lineNum) => {
          const lineEff = lineNum === 2 ? 68 : 82 + lineNum * 2;
          return (
            <AppCard key={lineNum} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.rowBetween}>
                <View>
                  <AppText variant="h4" bold>Line {lineNum}</AppText>
                  <AppText variant="caption" color="secondary">Supervisor: Arun Kumar · Morning Shift</AppText>
                  <AppText variant="caption" color="secondary">Running: JOB-100{lineNum} (Polo / Chino)</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText style={{ fontSize: 24, fontWeight: '800', color: lineEff >= 80 ? tokens.success : tokens.warning, fontFamily: 'JetBrainsMono_700Bold' }}>
                    {lineEff}%
                  </AppText>
                  <StatusBadge label={lineEff >= 80 ? 'OPTIMAL' : 'DELAY RISK'} variant={lineEff >= 80 ? 'success' : 'warning'} size="sm" />
                </View>
              </View>
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
  grid2: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
