import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

interface SectionHeaderProps {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, count, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color="secondary" uppercase bold style={styles.title}>
        {count !== undefined ? `${title} (${count})` : title}
      </AppText>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AppText variant="caption" color="brand" bold>
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  title: {
    letterSpacing: 0.8,
  },
});
