import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'lime';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function StatusBadge({ label, variant = 'neutral', size = 'md', dot = false }: StatusBadgeProps) {
  const { tokens, mode } = useThemeStore();

  const colorMap: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: tokens.successLight,
      text: tokens.successText,
      dot: tokens.success,
      border: mode === 'dark' ? 'rgba(72, 207, 120, 0.3)' : 'rgba(28, 166, 74, 0.25)',
    },
    warning: {
      bg: tokens.warningLight,
      text: tokens.warningText,
      dot: tokens.warning,
      border: mode === 'dark' ? 'rgba(251, 179, 21, 0.35)' : 'rgba(154, 101, 0, 0.25)',
    },
    danger: {
      bg: tokens.dangerLight,
      text: tokens.dangerText,
      dot: tokens.danger,
      border: mode === 'dark' ? 'rgba(255, 116, 107, 0.3)' : 'rgba(197, 40, 32, 0.25)',
    },
    info: {
      bg: tokens.infoLight,
      text: tokens.brand,
      dot: tokens.brand,
      border: mode === 'dark' ? 'rgba(135, 165, 224, 0.3)' : 'rgba(68, 105, 177, 0.25)',
    },
    brand: {
      bg: tokens.brandLight,
      text: tokens.brand,
      dot: tokens.brand,
      border: mode === 'dark' ? 'rgba(135, 165, 224, 0.3)' : 'rgba(68, 105, 177, 0.25)',
    },
    lime: {
      bg: tokens.brandLight,
      text: tokens.brand,
      dot: tokens.brand,
      border: mode === 'dark' ? 'rgba(135, 165, 224, 0.3)' : 'rgba(68, 105, 177, 0.25)',
    },
    neutral: {
      bg: tokens.surfaceSecondary,
      text: tokens.textSecondary,
      dot: tokens.textSecondary,
      border: tokens.border,
    },
  };

  const c = colorMap[variant] || colorMap.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
          paddingHorizontal: size === 'sm' ? spacing[2] : spacing[2.5],
          paddingVertical: size === 'sm' ? spacing[0.5] : spacing[1],
        },
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: c.dot }]} />
      )}
      <AppText
        variant={size === 'sm' ? 'caption' : 'label'}
        style={{
          color: c.text,
          fontWeight: '600',
          fontSize: size === 'sm' ? 11 : 12,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

export function jobStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: 'lime',
    'on-hold': 'warning',
    completed: 'success',
    closed: 'neutral',
    draft: 'neutral',
    cancelled: 'danger',
  };
  return map[status] ?? 'neutral';
}

export function bundleStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    cutting: 'neutral',
    sewing: 'info',
    kaja: 'info',
    ironing: 'info',
    'qc-pending': 'warning',
    'qc-passed': 'success',
    rework: 'danger',
    packing: 'brand',
    packed: 'success',
    dispatched: 'neutral',
  };
  return map[status] ?? 'neutral';
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
});
