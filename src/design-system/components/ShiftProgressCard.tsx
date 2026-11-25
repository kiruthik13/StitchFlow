import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Platform } from 'react-native';
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
  const { t } = useTranslation(['production', 'common']);
  const progress = shift.targetQty > 0 ? Math.min(shift.actualQty / shift.targetQty, 1) : 0;
  const pct = Math.round(progress * 100);

  // Segmented bar: 8 segments
  const totalSegments = 8;
  const filledSegments = Math.round(progress * totalSegments);

  const paceVariant =
    pct >= 90 ? tokens.success : pct >= 70 ? tokens.warning : tokens.danger;

  const heroText = '#FFFFFF';
  const heroMuted = 'rgba(255, 255, 255, 0.76)';
  const heroDivider = 'rgba(255, 255, 255, 0.16)';
  const progressAccent = '#34C765';

  return (
    <AppCard variant="forest" padding={spacing[4]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="caption" uppercase style={{ color: heroMuted, letterSpacing: 0.8, fontWeight: '600' }}>
            {t('production:floorOutputProgress')}
          </AppText>
          <View style={styles.pctRow}>
            <AppText style={[styles.pctText, { color: heroText }]}>
              {pct}%
            </AppText>
            <View style={[styles.paceBadge, { backgroundColor: 'rgba(255, 255, 255, 0.14)' }]}>
              <AppText variant="label" bold style={{ color: heroText, fontVariant: ['tabular-nums'] }}>
                {shift.pacePerHour} pcs/hr
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.rightCol}>
          <AppText variant="caption" style={{ color: heroMuted }}>{t('common:target')}</AppText>
          <AppText variant="h3" bold style={{ color: heroText, fontVariant: ['tabular-nums'] }}>{shift.targetQty.toLocaleString()}</AppText>
        </View>
      </View>

      {/* Production Green Progress Track */}
      <View style={styles.segmentRow}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < filledSegments ? progressAccent : 'rgba(255, 255, 255, 0.18)',
                marginRight: i < totalSegments - 1 ? 4 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: heroDivider }]}>
        <StatCol label="Packed" value={shift.packingQty} color={progressAccent} muted={heroMuted} />
        <View style={[styles.divider, { backgroundColor: heroDivider }]} />
        <StatCol label="Pending" value={Math.max(0, shift.targetQty - shift.actualQty)} color={heroText} muted={heroMuted} />
        <View style={[styles.divider, { backgroundColor: heroDivider }]} />
        <StatCol label="Rework" value={shift.reworkQty} color="#FBB315" muted={heroMuted} />
      </View>
    </AppCard>
  );
}

function StatCol({ label, value, color, muted }: { label: string; value: number; color: string; muted: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" style={{ color: muted, marginBottom: 2 }}>{label}</AppText>
      <AppText style={{ color, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
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
    fontSize: 42,
    fontWeight: '800',
    fontFamily: Platform.select({ android: 'sans-serif-black', default: 'System' }),
    lineHeight: 52,
    includeFontPadding: false,
    letterSpacing: 0,
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
