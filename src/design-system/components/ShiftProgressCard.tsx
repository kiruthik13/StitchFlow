import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { ShiftSummary } from '../../core/types';

interface ShiftProgressCardProps {
  shift: ShiftSummary;
}

export function ShiftProgressCard({ shift }: ShiftProgressCardProps) {
  const { tokens } = useThemeStore();
  const progress = Math.min(shift.actualQty / shift.targetQty, 1);
  const pct = Math.round(progress * 100);

  // Segmented bar: 8 segments
  const totalSegments = 8;
  const filledSegments = Math.round(progress * totalSegments);

  const paceVariant =
    pct >= 90 ? tokens.success : pct >= 70 ? tokens.warning : tokens.danger;

  return (
    <AppCard padding={spacing[4]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.5 }}>
            Shift Progress
          </AppText>
          <View style={styles.pctRow}>
            <AppText style={[styles.pctText, { color: tokens.textPrimary }]}>
              {pct}%
            </AppText>
            <View style={[styles.paceBadge, { backgroundColor: tokens.surfaceSecondary }]}>
              <AppText variant="label" mono style={{ color: paceVariant }}>
                {shift.pacePerHour} pcs/hr
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.rightCol}>
          <AppText variant="caption" color="secondary">Target</AppText>
          <AppText variant="h4" mono>{shift.targetQty}</AppText>
        </View>
      </View>

      {/* Segmented progress bar */}
      <View style={styles.segmentRow}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < filledSegments ? tokens.brand : tokens.surfaceSecondary,
                marginRight: i < totalSegments - 1 ? 3 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: tokens.border }]}>
        <StatCol label="Packed" value={shift.packingQty} color={tokens.success} tokens={tokens} />
        <View style={[styles.divider, { backgroundColor: tokens.border }]} />
        <StatCol label="Pending" value={shift.targetQty - shift.actualQty} color={tokens.textSecondary} tokens={tokens} />
        <View style={[styles.divider, { backgroundColor: tokens.border }]} />
        <StatCol label="Rework" value={shift.reworkQty} color={tokens.danger} tokens={tokens} />
      </View>
    </AppCard>
  );
}

function StatCol({ label, value, color, tokens }: { label: string; value: number; color: string; tokens: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText style={{ color, fontSize: 20, fontWeight: '700', fontFamily: 'JetBrainsMono_700Bold' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[0.5],
  },
  pctText: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'JetBrainsMono_700Bold',
    lineHeight: 44,
  },
  paceBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: 4,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  segmentRow: {
    flexDirection: 'row',
    height: 8,
    marginBottom: spacing[4],
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  divider: {
    width: 1,
    height: '100%',
  },
});
