import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface TaskItem {
  id: string;
  bundleCode: string;
  jobCode: string;
  operation: string;
  availableQuantity: number;
  waitingHours: number;
  location: string;
  priority: 'critical' | 'high' | 'normal';
  actionRoute: string;
}

export default function SmartTaskInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['smart-task-inbox', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<{ tasks: TaskItem[] }>(`/workflow/task-inbox?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:smartTaskInbox', { defaultValue: 'Smart Task Inbox' })} showBack onBack={() => router.back()} />
      <FlatList
        data={isDemoMode ? [] : (query.data?.tasks ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        ListEmptyComponent={<EmptyState title={t('common:noData')} />}
        renderItem={({ item }) => (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.row}>
              <AppText variant="label" bold mono>{item.bundleCode}</AppText>
              <StatusBadge
                label={item.priority.toUpperCase()}
                variant={item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'brand'}
                size="sm"
              />
            </View>
            <AppText variant="bodySmall" color="secondary">
              {item.jobCode} · {item.operation} · {item.availableQuantity} pcs · {item.waitingHours}h
            </AppText>
            <AppButton
              title={t('common:open', { defaultValue: 'Scan / Open' })}
              size="sm"
              style={{ marginTop: spacing[2] }}
              onPress={() => router.push(item.actionRoute as never)}
            />
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
