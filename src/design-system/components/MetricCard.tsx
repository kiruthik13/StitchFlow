import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  compact?: boolean;
}

export function MetricCard({ label, value, subLabel, variant = 'default', compact = false }: MetricCardProps) {
  const { tokens } = useThemeStore();

  const accentMap = {
    default: tokens.textPrimary,
    success: tokens.success,
    warning: tokens.warning,
    danger: tokens.danger,
    brand: tokens.brand,
  };

  return (
    <AppCard padding={compact ? spacing[3] : spacing[4]}>
      <AppText variant="caption" color="secondary" uppercase style={styles.label}>
        {label}
      </AppText>
      <AppText
        variant="kpi"
        style={[styles.value, { color: accentMap[variant], fontSize: compact ? 24 : 32 }]}
      >
        {value}
      </AppText>
      {subLabel && (
        <AppText variant="caption" color="secondary" style={styles.sub}>
          {subLabel}
        </AppText>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  value: {
    marginBottom: spacing[0.5],
  },
  sub: {
    marginTop: spacing[0.5],
  },
});
