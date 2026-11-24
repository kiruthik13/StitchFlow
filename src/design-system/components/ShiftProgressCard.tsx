import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ShiftSummary } from '../../core/types';

interface ShiftProgressCardProps {
  shift: ShiftSummary;
}

export function ShiftProgressCard({ shift }: ShiftProgressCardProps) {
  const { tokens, mode } = useThemeStore();
  const progress = shift.targetQty > 0 ? Math.min(shift.actualQty / shift.targetQty, 1) : 0;
  const pct = Math.round(progress * 100);

  // Segmented bar: 8 segments
  const totalSegments = 8;
  const filledSegments = Math.round(progress * totalSegments);

  const paceVariant =
    pct >= 90 ? tokens.success : pct >= 70 ? tokens.warning : tokens.danger;

  return (
    <AppCard variant="hero" padding={spacing[4]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, fontWeight: '600' }}>
            Shift Output Progress
          </AppText>
          <View style={styles.pctRow}>
            <AppText style={[styles.pctText, { color: tokens.textPrimary }]}>
              {pct}%
            </AppText>
            <View style={[styles.paceBadge, { backgroundColor: tokens.surfaceSecondary }]}>
              <AppText variant="label" mono bold style={{ color: paceVariant }}>
                {shift.pacePerHour} pcs/hr
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.rightCol}>
          <AppText variant="caption" color="secondary">Target</AppText>
          <AppText variant="h3" mono bold>{shift.targetQty.toLocaleString()}</AppText>
        </View>
      </View>

      {/* Signature Lime Progress Track */}
      <View style={styles.segmentRow}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < filledSegments ? tokens.signatureLime : tokens.surfaceSecondary,
                marginRight: i < totalSegments - 1 ? 4 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: tokens.border }]}>
        <StatCol label="Packed" value={shift.packingQty} color={tokens.success} tokens={tokens} />
        <View style={[styles.divider, { backgroundColor: tokens.border }]} />
        <StatCol label="Pending" value={Math.max(0, shift.targetQty - shift.actualQty)} color={tokens.textSecondary} tokens={tokens} />
        <View style={[styles.divider, { backgroundColor: tokens.border }]} />
        <StatCol label="Rework" value={shift.reworkQty} color={tokens.danger} tokens={tokens} />
      </View>
    </AppCard>
  );
}

function StatCol({ label, value, color, tokens }: { label: string; value: number; color: string; tokens: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary" style={{ marginBottom: 2 }}>{label}</AppText>
      <AppText style={{ color, fontSize: 18, fontWeight: '800', fontFamily: 'JetBrainsMono_700Bold' }}>
        {value.toLocaleString()}
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
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'JetBrainsMono_700Bold',
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  paceBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radii.sm,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  segmentRow: {
    flexDirection: 'row',
    height: 8,
    marginBottom: spacing[3.5],
    borderRadius: radii.sm,
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
