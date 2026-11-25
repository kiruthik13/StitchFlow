import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean; // semantic positive meaning (e.g. defect drop is positive)
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'lime';
  compact?: boolean;
}

export function MetricCard({
  label,
  value,
  subLabel,
  unit,
  icon,
  trend,
  variant = 'default',
  compact = false,
}: MetricCardProps) {
  const { tokens, mode } = useThemeStore();

  const accentMap = {
    default: tokens.textPrimary,
    success: tokens.success,
    warning: tokens.warning,
    danger: tokens.danger,
    brand: mode === 'dark' ? tokens.signatureLime : tokens.brand,
    lime: mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep,
  };

  const trendBg = trend?.isPositive ? tokens.successLight : tokens.dangerLight;
  const trendColor = trend?.isPositive ? tokens.success : tokens.danger;

  return (
    <AppCard padding={compact ? spacing[3] : spacing[3.5]}>
      <View style={styles.topRow}>
        <AppText variant="caption" color="secondary" uppercase style={styles.label}>
          {label}
        </AppText>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: tokens.surfaceSecondary }]}>
            {icon}
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <AppText
          variant="kpi"
          style={[
            styles.value,
            {
              color: accentMap[variant],
              fontSize: compact ? 22 : 26,
              lineHeight: compact ? 28 : 34,
              letterSpacing: 0,
              includeFontPadding: false,
            },
          ]}
        >
          {value}
        </AppText>
        {unit && (
          <AppText variant="caption" color="secondary" style={styles.unit}>
            {unit}
          </AppText>
        )}
      </View>

      <View style={styles.bottomRow}>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trendBg }]}>
            <AppText
              variant="caption"
              style={{ color: trendColor, fontSize: 10, fontWeight: '700' }}
            >
              {trend.isPositive ? '▲ ' : '▼ '}
              {trend.value}
            </AppText>
          </View>
        )}
        {subLabel && (
          <AppText variant="caption" color="secondary" style={styles.sub}>
            {subLabel}
          </AppText>
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  label: {
    letterSpacing: 0.6,
    fontWeight: '600',
    fontSize: 11,
    flex: 1,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[1],
  },
  value: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginLeft: spacing[1],
    fontWeight: '500',
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    flexWrap: 'wrap',
  },
  trendBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  sub: {
    fontSize: 11,
  },
});
