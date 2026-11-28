import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface ExceptionItem {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  bundleCode?: string | null;
  lineName?: string | null;
  affectedQuantity: number;
  rootCause: string;
  recommendedAction: string;
}

export default function ExceptionCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['production-exceptions', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<{ exceptions: ExceptionItem[] }>(`/analytics/exceptions?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  const ackMutation = useMutation({
    mutationFn: (exceptionId: string) =>
      apiRequest(`/analytics/exceptions/${encodeURIComponent(exceptionId)}/acknowledge?factoryId=${encodeURIComponent(user!.factoryId!)}`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('common:success'), t('production:exceptionAcknowledged', { defaultValue: 'Exception acknowledged' }));
    },
    onError: (err: Error) => Alert.alert(t('common:error', { defaultValue: 'Error' }), err.message),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:exceptionCenter', { defaultValue: 'Exception Center' })} showBack onBack={() => router.back()} />
      <FlatList
        data={isDemoMode ? [] : (query.data?.exceptions ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        ListEmptyComponent={<EmptyState title={t('common:noData')} />}
        renderItem={({ item }) => (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.row}>
              <AppText variant="label" bold>{item.type.replace(/_/g, ' ').toUpperCase()}</AppText>
              <StatusBadge label={item.severity.toUpperCase()} variant={item.severity === 'critical' ? 'danger' : 'warning'} size="sm" />
            </View>
            <AppText variant="bodySmall" color="secondary">{item.rootCause}</AppText>
            <AppText variant="caption" style={{ color: tokens.brand, marginTop: spacing[1] }}>{item.recommendedAction}</AppText>
            {['supervisor', 'factory-manager', 'md'].includes(user?.role ?? '') && (
              <AppButton
                title={t('common:acknowledge', { defaultValue: 'Acknowledge' })}
                variant="outline"
                size="sm"
                style={{ marginTop: spacing[2] }}
                disabled={ackMutation.isPending}
                onPress={() => ackMutation.mutate(item.id)}
              />
            )}
          </AppCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
});
