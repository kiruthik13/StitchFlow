import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { StatusBadge, bundleStatusBadge } from './StatusBadge';
import { spacing } from '../tokens/spacing';
import { Bundle } from '../../core/types';

interface GarmentTicketCardProps {
  bundle: Bundle;
  onSizeSelect?: (size: string) => void;
  selectedSize?: string;
  onPackAction?: () => void;
  showPackAction?: boolean;
}

export function GarmentTicketCard({
  bundle,
  onSizeSelect,
  selectedSize,
  onPackAction,
  showPackAction = false,
}: GarmentTicketCardProps) {
  const { tokens } = useThemeStore();
  const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <View
      style={[
        styles.ticket,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      {/* Left notch */}
      <View style={[styles.notch, styles.notchLeft, { borderColor: tokens.border, backgroundColor: tokens.background }]} />
      {/* Right notch */}
      <View style={[styles.notch, styles.notchRight, { borderColor: tokens.border, backgroundColor: tokens.background }]} />

      {/* Top section */}
      <View style={styles.topSection}>
        <View style={styles.idBlock}>
          <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.5 }}>
            Bundle
          </AppText>
          <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>
            {bundle.bundleCode}
          </AppText>
        </View>
        <StatusBadge
          label={bundle.status.replace('-', ' ').toUpperCase()}
          variant={bundleStatusBadge(bundle.status)}
          size="sm"
        />
      </View>

      {/* Dashed tear line */}
      <View style={[styles.tearLine, { borderColor: tokens.border }]} />

      {/* Middle section */}
      <View style={styles.middleSection}>
        <InfoRow label="Job" value={bundle.jobCode} mono tokens={tokens} />
        <InfoRow label="Style" value={bundle.styleName} tokens={tokens} />
        <InfoRow label="Color" value={bundle.color} tokens={tokens} />
        <View style={styles.row}>
          <InfoRow label="Qty" value={String(bundle.quantity)} mono tokens={tokens} />
          <InfoRow label="Done" value={String(bundle.completedQty)} mono tokens={tokens} />
          {bundle.reworkQty > 0 && (
            <InfoRow label="Rework" value={String(bundle.reworkQty)} mono tokens={tokens} valueColor={tokens.danger} />
          )}
        </View>
      </View>

      {/* Size selectors */}
      {onSizeSelect && (
        <View style={styles.sizeRow}>
          {allSizes.map((s) => {
            const isSelected = s === (selectedSize || bundle.size);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => onSizeSelect(s)}
                style={[
                  styles.sizeChip,
                  {
                    backgroundColor: isSelected ? tokens.brand : tokens.surfaceSecondary,
                    borderColor: isSelected ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={{ color: isSelected ? tokens.textInverse : tokens.textSecondary }}
                >
                  {s}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pack action */}
      {showPackAction && (
        <TouchableOpacity
          onPress={onPackAction}
          activeOpacity={0.8}
          style={[styles.packBtn, { backgroundColor: tokens.brand }]}
        >
          <AppText variant="label" color="inverse" bold>
            Pack {bundle.completedQty} pcs
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  tokens,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tokens: any;
  valueColor?: string;
}) {
  return (
    <View style={{ marginRight: spacing[4], marginBottom: spacing[1] }}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="label" mono={mono} style={{ color: valueColor ?? tokens.textPrimary }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[4],
    position: 'relative',
    overflow: 'visible',
  },
  notch: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    top: '50%',
    marginTop: -8,
  },
  notchLeft: {
    left: -9,
  },
  notchRight: {
    right: -9,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  idBlock: {},
  tearLine: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: -spacing[4],
    marginBottom: spacing[3],
  },
  middleSection: {
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing[1],
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  sizeChip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: 4,
    borderWidth: 1,
  },
  packBtn: {
    marginTop: spacing[2],
    borderRadius: 6,
    paddingVertical: spacing[2.5],
    alignItems: 'center',
  },
});
