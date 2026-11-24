import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { Cpu } from 'lucide-react-native';

export interface ProductionLineRowProps {
  lineId: string;
  lineName: string;
  actualQty: number;
  targetQty: number;
  status: 'running' | 'idle' | 'delayed' | 'maintenance';
  onPress?: () => void;
}

export function ProductionLineRow({
  lineId,
  lineName,
  actualQty,
  targetQty,
  status,
  onPress,
}: ProductionLineRowProps) {
  const { tokens, mode } = useThemeStore();
  const progress = targetQty > 0 ? Math.min(actualQty / targetQty, 1) : 0;
  const pct = Math.round(progress * 100);

  const statusBadgeVariant =
    status === 'running'
      ? 'success'
      : status === 'delayed'
      ? 'danger'
      : status === 'idle'
      ? 'warning'
      : 'neutral';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.surfaceSecondary }]}>
          <Cpu size={16} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2} />
        </View>
        <View>
          <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
            {lineName}
          </AppText>
          <AppText variant="caption" color="secondary" mono>
            {actualQty.toLocaleString()} / {targetQty.toLocaleString()} pcs
          </AppText>
        </View>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: tokens.surfaceSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%`,
                  backgroundColor:
                    pct >= 85 ? tokens.signatureLime : pct >= 60 ? tokens.info : tokens.warning,
                },
              ]}
            />
          </View>
          <AppText variant="caption" bold mono style={{ color: tokens.textPrimary, marginLeft: spacing[2], minWidth: 32 }}>
            {pct}%
          </AppText>
        </View>
        <StatusBadge label={status.toUpperCase()} variant={statusBadgeVariant} size="sm" dot />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3.5],
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
