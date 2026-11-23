import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { StatusBadge } from './StatusBadge';
import { spacing } from '../tokens/spacing';
import { ScanResult } from '../../core/types';

interface BarcodeResultCardProps {
  result: ScanResult;
}

export function BarcodeResultCard({ result }: BarcodeResultCardProps) {
  const { tokens } = useThemeStore();

  const statusVariant =
    result.status === 'success' ? 'success' : result.status === 'duplicate' ? 'warning' : 'danger';
  const statusLabel =
    result.status === 'success' ? 'Found' : result.status === 'duplicate' ? 'Duplicate' : result.status === 'not-found' ? 'Not Found' : 'Error';

  return (
    <AppCard>
      <View style={styles.row}>
        <AppText variant="caption" color="secondary">Code</AppText>
        <StatusBadge label={statusLabel} variant={statusVariant} size="sm" />
      </View>
      <AppText variant="code" mono bold style={{ color: tokens.textPrimary, marginBottom: spacing[1] }}>
        {result.code}
      </AppText>
      <AppText variant="caption" color="secondary">Type: {result.type}</AppText>

      {result.resolvedBundle && (
        <View style={[styles.bundleInfo, { borderTopColor: tokens.border }]}>
          <AppText variant="label" color="secondary">Bundle</AppText>
          <AppText variant="body" bold>{result.resolvedBundle.bundleCode}</AppText>
          <AppText variant="bodySmall" color="secondary">
            {result.resolvedBundle.styleName} · {result.resolvedBundle.color} · {result.resolvedBundle.size}
          </AppText>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  bundleInfo: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
});
