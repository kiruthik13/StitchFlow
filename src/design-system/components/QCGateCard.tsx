import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';

export interface QCGateCardProps {
  status: 'passed' | 'pending' | 'rework' | 'rejected';
  inspectedQty: number;
  passedQty: number;
  reworkQty: number;
  rejectedQty: number;
  onActionPress?: () => void;
  actionTitle?: string;
}

export function QCGateCard({
  status,
  inspectedQty,
  passedQty,
  reworkQty,
  rejectedQty,
  onActionPress,
  actionTitle = 'View QC Breakdown',
}: QCGateCardProps) {
  const { tokens, mode } = useThemeStore();
  const { t } = useTranslation(['quality', 'common']);

  const getStatusBadge = () => {
    switch (status) {
      case 'passed':
        return <StatusBadge label="QC PASSED" variant="success" size="sm" dot />;
      case 'rework':
        return <StatusBadge label="REWORK REQUIRED" variant="danger" size="sm" dot />;
      case 'rejected':
        return <StatusBadge label="SCRAP REJECTED" variant="danger" size="sm" dot />;
      default:
        return <StatusBadge label="INSPECTION PENDING" variant="warning" size="sm" dot />;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: tokens.brandLight }]}>
            <ShieldCheck size={18} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
          </View>
          <View>
            <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
              {t('quality:qcGateOverview')}
            </AppText>
            <AppText variant="caption" color="secondary">
              100% Endline Inspection Equation
            </AppText>
          </View>
        </View>
        {getStatusBadge()}
      </View>

      <View style={[styles.statsRow, { backgroundColor: tokens.surfaceSecondary }]}>
        <View style={styles.statBox}>
          <AppText variant="caption" color="secondary">{t('quality:inspected')}</AppText>
          <AppText variant="label" bold mono>{inspectedQty}</AppText>
        </View>
        <View style={styles.statBox}>
          <AppText variant="caption" color="secondary">{t('quality:passed')}</AppText>
          <AppText variant="label" bold mono style={{ color: tokens.success }}>{passedQty}</AppText>
        </View>
        <View style={styles.statBox}>
          <AppText variant="caption" color="secondary">{t('quality:rework')}</AppText>
          <AppText variant="label" bold mono style={{ color: tokens.warning }}>{reworkQty}</AppText>
        </View>
        <View style={styles.statBox}>
          <AppText variant="caption" color="secondary">{t('quality:rejected')}</AppText>
          <AppText variant="label" bold mono style={{ color: tokens.danger }}>{rejectedQty}</AppText>
        </View>
      </View>

      {onActionPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onActionPress}
          style={styles.actionBtn}
        >
          <AppText variant="caption" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
            {actionTitle}
          </AppText>
          <ArrowRight size={14} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing[3.5],
    marginBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    justifyContent: 'space-around',
    marginBottom: spacing[2.5],
  },
  statBox: {
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1],
  },
});
