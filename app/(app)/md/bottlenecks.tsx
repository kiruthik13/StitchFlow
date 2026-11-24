import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const BOTTLENECKS = [
  {
    id: 'bn-1',
    stage: 'Ironing & Thread Trimming',
    factory: 'Factory A (Line 1)',
    job: 'JOB-1001',
    piledPieces: 240,
    cycleVariance: '+53% over SAM',
    cause: 'Single operator bottleneck on manual steam press station.',
    recommendation: 'Reassign 1 reserve helper from cutting bay to pre-trim threads.',
    impact: 'Recovers 2.5 hours delay before packing handover.',
  },
  {
    id: 'bn-2',
    stage: 'Front Placket Stitching',
    factory: 'Factory B (Line 2)',
    job: 'JOB-1003',
    piledPieces: 160,
    cycleVariance: '+35% over SAM',
    cause: 'Dense knit jersey fabric needle slippage.',
    recommendation: 'Switch needle to ball-point gauge 11/75.',
    impact: 'Restores target pace from 31 to 45 pcs/hr.',
  },
];

export default function BottleneckAnalyticsScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:bottleneckAnalytics')} subtitle={t('production:manufacturingGroupSummary')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={[styles.alertBanner, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
          <AppText variant="h4" bold style={{ color: tokens.danger }}>⚡ 2 Active Line Bottlenecks Identified</AppText>
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
            Simulated throughput analysis projects a 4.2 hour cumulative dispatch delay if unoptimized.
          </AppText>
        </View>

        {BOTTLENECKS.map((b) => (
          <AppCard key={b.id} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="h4" bold>{b.stage}</AppText>
                <AppText variant="caption" color="secondary">{b.factory} · {b.job}</AppText>
              </View>
              <StatusBadge label="CRITICAL" variant="danger" size="sm" />
            </View>

            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">WIP Buffer Pile</AppText><AppText variant="label" bold style={{ color: tokens.danger }}>{b.piledPieces} pcs</AppText></View>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Pace Variance</AppText><AppText variant="label" bold style={{ color: tokens.danger }}>{b.cycleVariance}</AppText></View>
            </View>

            <View style={[styles.recBox, { backgroundColor: tokens.surfaceSecondary }]}>
              <AppText variant="caption" color="brand" bold uppercase>Root Cause:</AppText>
              <AppText variant="bodySmall" style={{ marginTop: 2 }}>{b.cause}</AppText>

              <AppText variant="caption" color="brand" bold uppercase style={{ marginTop: spacing[2] }}>Optimization Recommendation:</AppText>
              <AppText variant="bodySmall" style={{ marginTop: 2 }}>{b.recommendation}</AppText>

              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>Estimated Impact: {b.impact}</AppText>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <AppButton
                title="Execute Optimization Rebalancing"
                size="sm"
                onPress={() => Alert.alert('Action Broadcast', `Rebalancing instruction sent to supervisor for ${b.stage}.`)}
              />
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
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: spacing[4], marginBottom: spacing[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', marginTop: spacing[2], marginBottom: spacing[2] },
  recBox: { padding: spacing[3], borderRadius: 6, marginTop: spacing[2] },
});
