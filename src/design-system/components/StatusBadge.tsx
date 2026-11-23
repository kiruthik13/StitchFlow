import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function StatusBadge({ label, variant = 'neutral', size = 'md', dot = false }: StatusBadgeProps) {
  const { tokens } = useThemeStore();

  const colorMap: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    success: { bg: tokens.successLight, text: tokens.success, dot: tokens.success },
    warning: { bg: tokens.warningLight, text: tokens.warning, dot: tokens.warning },
    danger: { bg: tokens.dangerLight, text: tokens.danger, dot: tokens.danger },
    info: { bg: tokens.infoLight, text: tokens.info, dot: tokens.info },
    brand: { bg: tokens.brandLight, text: tokens.brand, dot: tokens.brand },
    neutral: { bg: tokens.surfaceSecondary, text: tokens.textSecondary, dot: tokens.textSecondary },
  };

  const c = colorMap[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          paddingHorizontal: size === 'sm' ? spacing[1.5] : spacing[2],
          paddingVertical: size === 'sm' ? spacing[0.5] : spacing[1],
        },
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: c.dot }]} />
      )}
      <AppText
        variant={size === 'sm' ? 'caption' : 'label'}
        style={{ color: c.text, fontWeight: '600' }}
      >
        {label}
      </AppText>
    </View>
  );
}

export function jobStatusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    'on-hold': 'warning',
    completed: 'brand',
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
    marginRight: 4,
  },
});
