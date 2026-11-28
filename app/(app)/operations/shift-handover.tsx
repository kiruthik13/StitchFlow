import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
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
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface ShiftHandoverSummary {
  activeJobs: number;
  pendingWipPieces: number;
  openRework: number;
  pendingInspections: number;
  openExceptions: number;
  criticalExceptions: number;
}

export default function ShiftHandoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['shift-handover', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<ShiftHandoverSummary>(`/workflow/shift-handover?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  const ackMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/workflow/shift-handover/acknowledge?factoryId=${encodeURIComponent(user!.factoryId!)}`, {
        method: 'POST',
        body: JSON.stringify({ shiftLabel: 'Incoming Shift' }),
      }),
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('common:success'), t('production:shiftHandoverAck', { defaultValue: 'Shift handover acknowledged' }));
    },
  });

  const d = query.data;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:shiftHandover', { defaultValue: 'Shift Handover' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        {isDemoMode || !d ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <AppCard padding={spacing[4]}>
            <AppText variant="bodySmall">{`Active Jobs: ${d.activeJobs}`}</AppText>
            <AppText variant="bodySmall">{`Pending WIP: ${d.pendingWipPieces} pcs`}</AppText>
            <AppText variant="bodySmall">{`Open Rework: ${d.openRework} pcs`}</AppText>
            <AppText variant="bodySmall">{`Pending Inspections: ${d.pendingInspections} pcs`}</AppText>
            <AppText variant="bodySmall">{`Open Exceptions: ${d.openExceptions} (${d.criticalExceptions} critical)`}</AppText>
            <AppButton
              title={t('production:acknowledgeHandover', { defaultValue: 'Acknowledge Shift Handover' })}
              style={{ marginTop: spacing[4] }}
              loading={ackMutation.isPending}
              onPress={() => ackMutation.mutate()}
            />
          </AppCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
