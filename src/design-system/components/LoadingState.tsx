import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const { tokens } = useThemeStore();
  return (
    <View style={styles.wrapper}>
      <ActivityIndicator size="large" color={tokens.brand} />
      <AppText variant="body" color="secondary" style={styles.msg}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
  msg: { marginTop: spacing[3] },
});
