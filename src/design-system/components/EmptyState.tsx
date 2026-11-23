import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title = 'No data', message, icon }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <AppText variant="h4" color="secondary" center>{title}</AppText>
      {message && <AppText variant="body" color="secondary" center style={styles.msg}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
  icon: { marginBottom: spacing[4] },
  msg: { marginTop: spacing[2] },
});
