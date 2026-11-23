import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

export interface QuickOperation {
  id: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: number;
}

interface QuickOperationsGridProps {
  operations: QuickOperation[];
  columns?: 2 | 3 | 4;
}

export function QuickOperationsGrid({ operations, columns = 2 }: QuickOperationsGridProps) {
  const { tokens } = useThemeStore();
  const rows: QuickOperation[][] = [];
  for (let i = 0; i < operations.length; i += columns) {
    rows.push(operations.slice(i, i + columns));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.row, { gap: spacing[2] }]}>
          {row.map((op) => (
            <TouchableOpacity
              key={op.id}
              onPress={op.onPress}
              disabled={op.disabled}
              activeOpacity={0.75}
              style={[
                styles.cell,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  opacity: op.disabled ? 0.4 : 1,
                  flex: 1,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: tokens.brandLight }]}>
                {op.icon}
                {op.badge !== undefined && op.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: tokens.danger }]}>
                    <AppText variant="caption" color="inverse" style={{ fontSize: 9 }}>
                      {op.badge > 99 ? '99+' : op.badge}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="label" color="primary" center style={styles.label}>
                {op.label}
              </AppText>
            </TouchableOpacity>
          ))}
          {row.length < columns &&
            Array.from({ length: columns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[3],
    alignItems: 'center',
    minHeight: 96,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
  },
});
