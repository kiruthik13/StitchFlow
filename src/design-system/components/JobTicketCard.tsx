import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { StatusBadge, jobStatusBadge } from './StatusBadge';
import { PressableScale } from './PressableScale';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { Job } from '../../core/types';
import { Tag } from 'lucide-react-native';

export interface JobTicketCardProps {
  job: Job;
  onPress?: () => void;
}

export function JobTicketCard({ job, onPress }: JobTicketCardProps) {
  const { tokens, mode } = useThemeStore();
  const { t } = useTranslation('common');
  const eff = job.efficiency;
  const effColor = eff >= 80 ? tokens.success : eff >= 70 ? tokens.warning : tokens.danger;

  return (
    <PressableScale
      scaleTo={0.98}
      haptic={onPress ? 'light' : 'none'}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.ticketContainer,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      {/* Top Tag Stub */}
      <View style={styles.stubRow}>
        <View style={styles.codeWrap}>
          <Tag size={13} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.4} />
          <AppText variant="code" mono bold style={{ color: tokens.textPrimary, marginLeft: 4 }}>
            {job.jobCode}
          </AppText>
        </View>
        <StatusBadge
          label={job.status.replace('-', ' ').toUpperCase()}
          variant={jobStatusBadge(job.status)}
          size="sm"
          dot
        />
      </View>

      {/* Main Body */}
      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
            {job.styleName}
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Buyer: {job.buyerName} · Line: {job.lineName}
          </AppText>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <AppText
            variant="label"
            mono
            bold
            style={{ color: effColor }}
          >
            {eff}%
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('efficiency')}
          </AppText>
        </View>
      </View>

      {/* Subtle Dashed Garment Seam Separator */}
      <View style={[styles.dashedDivider, { borderColor: tokens.border }]} />

      {/* Bottom Quantities Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statCell}>
          <AppText variant="caption" color="secondary">Order</AppText>
          <AppText variant="label" mono bold style={{ color: tokens.textPrimary }}>
            {job.orderQuantity.toLocaleString()}
          </AppText>
        </View>
        <View style={[styles.cellDivider, { backgroundColor: tokens.border }]} />
        <View style={styles.statCell}>
          <AppText variant="caption" color="secondary">Packed</AppText>
          <AppText variant="label" mono bold style={{ color: tokens.success }}>
            {job.packingQty.toLocaleString()}
          </AppText>
        </View>
        <View style={[styles.cellDivider, { backgroundColor: tokens.border }]} />
        <View style={styles.statCell}>
          <AppText variant="caption" color="secondary">Rework</AppText>
          <AppText variant="label" mono bold style={{ color: tokens.danger }}>
            {job.reworkQty.toLocaleString()}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ticketContainer: {
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3.5],
    marginBottom: spacing[2.5],
  },
  stubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2.5],
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: spacing[1],
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing[2],
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  cellDivider: {
    width: 1,
    height: '100%',
  },
});
