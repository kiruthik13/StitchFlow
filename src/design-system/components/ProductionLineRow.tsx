import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';
import { PressableScale } from './PressableScale';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ChevronRight } from 'lucide-react-native';

export interface ProductionLineRowProps {
  lineId: string;
  lineName: string;
  actualQty: number;
  targetQty: number;
  status: 'running' | 'idle' | 'delayed' | 'maintenance';
  onPress?: () => void;
  isLast?: boolean;
  embedded?: boolean;
}

export function ProductionLineRow({
  lineId,
  lineName,
  actualQty,
  targetQty,
  status,
  onPress,
  isLast = false,
  embedded = false,
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

  const statusAccent =
    status === 'running'
      ? mode === 'dark'
        ? tokens.signatureLime
        : tokens.success
      : status === 'delayed'
        ? tokens.danger
        : status === 'idle'
          ? tokens.warning
          : tokens.textDisabled;

  return (
    <PressableScale
      scaleTo={0.985}
      haptic={onPress ? 'light' : 'none'}
      onPress={onPress}
      disabled={!onPress}
      style={[
        embedded ? styles.embeddedContainer : styles.container,
        embedded
          ? {
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: tokens.border,
          }
          : {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
      ]}
    >
      <View style={[styles.statusStrip, { backgroundColor: statusAccent }]} />

      <View style={styles.leftCol}>
        <AppText variant="label" bold numberOfLines={1} style={{ color: tokens.textPrimary }}>
          {lineName}
        </AppText>
        <View style={styles.metaRow}>
          <AppText
            variant="caption"
            color="secondary"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {actualQty.toLocaleString()} / {targetQty.toLocaleString()} pcs
          </AppText>
          <StatusBadge label={status.toUpperCase()} variant={statusBadgeVariant} size="sm" dot />
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
                    pct >= 85
                      ? tokens.signatureLime
                      : pct >= 60
                        ? tokens.info
                        : tokens.warning,
                },
              ]}
            />
          </View>
          <AppText
            variant="label"
            bold
            style={{
              color: tokens.textPrimary,
              marginLeft: spacing[2],
              minWidth: 38,
              textAlign: 'right',
              fontVariant: ['tabular-nums'],
            }}
          >
            {pct}%
          </AppText>
          {onPress && (
            <ChevronRight
              size={15}
              color={tokens.textSecondary}
              strokeWidth={2}
              style={{ marginLeft: spacing[1] }}
            />
          )}
        </View>
      </View>
    </PressableScale>
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
    minHeight: 58,
  },
  embeddedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3.5],
    minHeight: 58,
  },
  statusStrip: {
    width: 3,
    height: 28,
    borderRadius: 2,
    marginRight: spacing[3],
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 3,
  },
  rightCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    width: 54,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
