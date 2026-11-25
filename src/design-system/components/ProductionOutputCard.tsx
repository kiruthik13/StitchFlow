import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { Layers } from 'lucide-react-native';

export interface ProductionOutputCardProps {
  actualQty: number;
  targetQty: number;
  unit?: string;
  title?: string;
  subtitle?: string;
  pacePerHour?: number;
}

export function ProductionOutputCard({
  actualQty,
  targetQty,
  unit = 'pcs',
  title = 'Production Output',
  subtitle,
  pacePerHour,
}: ProductionOutputCardProps) {
  const { tokens, mode } = useThemeStore();
  const progress = targetQty > 0 ? Math.min(actualQty / targetQty, 1) : 0;
  const pct = Math.round(progress * 100);

  return (
    <AppCard variant="hero" padding={spacing[4]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconContainer, { backgroundColor: tokens.brandLight }]}>
            <Layers size={18} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
          </View>
          <View>
            <AppText variant="label" bold style={{ color: tokens.textPrimary, letterSpacing: 0.2 }}>
              {title}
            </AppText>
            {subtitle && (
              <AppText variant="caption" color="secondary">
                {subtitle}
              </AppText>
            )}
          </View>
        </View>

        <View style={[styles.pctBadge, { backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD' }]}>
          <AppText
            variant="caption"
            bold
            style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep, fontSize: 12 }}
          >
            {pct}%
          </AppText>
        </View>
      </View>

      {/* Hero Quantity Numbers */}
      <View style={styles.numberRow}>
        <AppText
          style={[
            styles.heroActual,
            { color: tokens.textPrimary },
          ]}
        >
          {actualQty.toLocaleString()}
        </AppText>
        <AppText style={[styles.heroTarget, { color: tokens.textSecondary }]}>
          {' / '}{targetQty.toLocaleString()} {unit}
        </AppText>
      </View>

      {/* Signature Lime Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: tokens.surfaceSecondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct}%`,
              backgroundColor: tokens.signatureLime,
            },
          ]}
        />
      </View>

      {/* Bottom context / pace */}
      {pacePerHour !== undefined && (
        <View style={styles.bottomMeta}>
          <AppText variant="caption" color="secondary">
            Current Pace:
          </AppText>
          <AppText variant="caption" bold mono style={{ color: tokens.textPrimary }}>
            {' '}{pacePerHour} {unit}/hr
          </AppText>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctBadge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[3],
  },
  heroActual: {
    fontSize: 48,
    lineHeight: 60,
    fontWeight: '800',
    fontFamily: Platform.select({ android: 'sans-serif-black', default: 'System' }),
    letterSpacing: 0,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  heroTarget: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: 'System' }),
    marginLeft: spacing[1.5],
    includeFontPadding: false,
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  bottomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
});
