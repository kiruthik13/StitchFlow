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
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface SkillRow {
  employeeId: string;
  name: string;
  role: string;
  lineName?: string | null;
  operation?: string | null;
  skillLevel: string;
}

export default function SkillMatrixScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['planning-skills', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user?.factoryId,
    queryFn: () => apiRequest<{ skills: SkillRow[] }>(`/planning/skills?factoryId=${encodeURIComponent(user!.factoryId!)}`),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:skillMatrix', { defaultValue: 'Employee Skill Matrix' })} showBack onBack={() => router.back()} />
      <FlatList
        data={isDemoMode ? [] : (query.data?.skills ?? [])}
        keyExtractor={(item) => `${item.employeeId}:${item.operation ?? 'any'}`}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        ListEmptyComponent={<EmptyState title={t('common:noData')} />}
        renderItem={({ item }) => (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.row}>
              <AppText variant="label" bold>{item.name}</AppText>
              <StatusBadge label={item.skillLevel.toUpperCase()} variant="brand" size="sm" />
            </View>
            <AppText variant="bodySmall" color="secondary">
              {item.employeeId} · {item.lineName ?? 'Unassigned'} · {item.operation ?? item.role}
            </AppText>
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
