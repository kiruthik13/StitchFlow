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

export function QuickOperationsGrid({ operations, columns = 3 }: QuickOperationsGridProps) {
  const { tokens, mode } = useThemeStore();
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
              activeOpacity={0.7}
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
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD',
                  },
                ]}
              >
                {op.icon}
                {op.badge !== undefined && op.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: tokens.danger }]}>
                    <AppText variant="caption" color="inverse" style={{ fontSize: 9, fontWeight: '800' }}>
                      {op.badge > 99 ? '99+' : op.badge}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText
                variant="caption"
                bold
                style={[styles.label, { color: tokens.textPrimary }]}
                numberOfLines={1}
              >
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
    borderRadius: radii.xl,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[1.5],
    alignItems: 'center',
    minHeight: 74,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
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
    paddingHorizontal: 3,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
