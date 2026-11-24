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
      text: tokens.success,
      dot: tokens.success,
      border: mode === 'dark' ? 'rgba(145, 218, 105, 0.3)' : 'rgba(50, 122, 65, 0.2)',
    },
    warning: {
      bg: tokens.warningLight,
      text: tokens.warning,
      dot: tokens.warning,
      border: mode === 'dark' ? 'rgba(229, 186, 84, 0.3)' : 'rgba(168, 121, 24, 0.2)',
    },
    danger: {
      bg: tokens.dangerLight,
      text: tokens.danger,
      dot: tokens.danger,
      border: mode === 'dark' ? 'rgba(241, 122, 112, 0.3)' : 'rgba(184, 59, 54, 0.2)',
    },
    info: {
      bg: tokens.infoLight,
      text: tokens.info,
      dot: tokens.info,
      border: mode === 'dark' ? 'rgba(121, 184, 202, 0.3)' : 'rgba(57, 121, 139, 0.2)',
    },
    brand: {
      bg: tokens.brandLight,
      text: mode === 'dark' ? tokens.signatureLime : tokens.brand,
      dot: mode === 'dark' ? tokens.signatureLime : tokens.brand,
      border: mode === 'dark' ? 'rgba(201, 239, 69, 0.3)' : 'rgba(21, 61, 45, 0.2)',
    },
    lime: {
      bg: mode === 'dark' ? '#203D2A' : '#E6F7AD',
      text: mode === 'dark' ? '#C9EF45' : '#0D2B20',
      dot: mode === 'dark' ? '#C9EF45' : '#0D2B20',
      border: mode === 'dark' ? 'rgba(201, 239, 69, 0.4)' : 'rgba(13, 43, 32, 0.25)',
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
