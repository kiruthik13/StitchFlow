import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

interface DataRowProps {
  label: string;
  value: string | number;
  mono?: boolean;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  divider?: boolean;
}

export function DataRow({ label, value, mono = false, tone = 'default', divider = true }: DataRowProps) {
  const { tokens } = useThemeStore();
  const valueColor =
    tone === 'brand'
      ? tokens.brand
      : tone === 'success'
      ? tokens.successText
      : tone === 'warning'
      ? tokens.warningText
      : tone === 'danger'
      ? tokens.dangerText
      : tokens.textPrimary;

  return (
    <View style={[styles.row, divider && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <AppText variant="bodySmall" color="secondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText
        variant={mono ? 'code' : 'label'}
        bold
        style={{ color: valueColor, fontVariant: ['tabular-nums'] }}
      >
        {String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2.5],
    gap: spacing[2],
  },
});
