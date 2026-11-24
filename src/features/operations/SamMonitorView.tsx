import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { MetricCard } from '../../design-system/components/MetricCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

const STAGE_SAM_STATS = [
  { stage: 'Cutting', targetSam: 4.5, actualSam: 4.2, eff: 107, buffer: '80 pcs', status: 'optimal' },
  { stage: 'Sewing Out', targetSam: 12.0, actualSam: 13.8, eff: 87, buffer: '180 pcs', status: 'normal' },
  { stage: 'Kaja / Button', targetSam: 2.5, actualSam: 2.4, eff: 104, buffer: '60 pcs', status: 'optimal' },
  { stage: 'Ironing', targetSam: 3.2, actualSam: 4.9, eff: 65, buffer: '240 pcs', status: 'bottleneck' },
  { stage: 'QC Gate', targetSam: 1.8, actualSam: 1.9, eff: 95, buffer: '40 pcs', status: 'normal' },
  { stage: 'Packing', targetSam: 2.0, actualSam: 1.9, eff: 105, buffer: '24 pcs', status: 'optimal' },
];

export function SamMonitorView() {
  const { tokens } = useThemeStore();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Bottleneck alert banner */}
      <View style={[styles.alertBanner, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
        <AppText variant="h4" bold style={{ color: tokens.danger }}>⚡ Active Bottleneck: Ironing Station</AppText>
        <AppText variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
          Actual cycle time (4.9 SAM) exceeds benchmark (3.2 SAM) by 53%. 240 pieces piling up in buffer.
        </AppText>
      </View>

      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        Standard vs Actual Allowed Minutes (SAM)
      </AppText>

      {STAGE_SAM_STATS.map((item, idx) => (
        <AppCard key={idx} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText variant="h4" bold>{item.stage}</AppText>
              <AppText variant="caption" color="secondary">Buffer Pile: {item.buffer}</AppText>
            </View>
            <StatusBadge
              label={item.status.toUpperCase()}
              variant={item.status === 'bottleneck' ? 'danger' : item.status === 'optimal' ? 'success' : 'neutral'}
              size="sm"
            />
          </View>

          <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Target SAM</AppText><AppText variant="label" bold>{item.targetSam}m</AppText></View>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Actual SAM</AppText><AppText variant="label" bold style={{ color: item.status === 'bottleneck' ? tokens.danger : tokens.textPrimary }}>{item.actualSam}m</AppText></View>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Efficiency</AppText><AppText variant="label" bold style={{ color: item.eff >= 100 ? tokens.success : item.eff >= 80 ? tokens.warning : tokens.danger }}>{item.eff}%</AppText></View>
          </View>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: spacing[4], marginBottom: spacing[3] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row' },
});
