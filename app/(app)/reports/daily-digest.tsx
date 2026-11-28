import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface DailyDigest {
  reportDate: string;
  activeJobs: number;
  completedJobs: number;
  overdueJobs: number;
  qc: { inspected: number; passed: number; rework: number; rejected: number };
  packed: number;
  dispatched: number;
  openIssues: number;
}

export default function DailyDigestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { user, isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['daily-digest', user?.id, user?.factoryId],
    enabled: !isDemoMode && !!user,
    queryFn: () =>
      apiRequest<DailyDigest>(
        user?.factoryId ? `/analytics/daily-digest?factoryId=${encodeURIComponent(user.factoryId)}` : '/analytics/daily-digest',
      ),
  });

  const d = query.data;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:dailyDigest', { defaultValue: 'Production Daily Digest' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        {isDemoMode || !d ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <AppCard padding={spacing[4]}>
            <AppText variant="h4" bold>{d.reportDate}</AppText>
            <AppText variant="bodySmall">{`Active: ${d.activeJobs} · Completed: ${d.completedJobs} · Overdue: ${d.overdueJobs}`}</AppText>
            <AppText variant="bodySmall">{`QC: ${d.qc.inspected} Inspected / ${d.qc.passed} Passed / ${d.qc.rework} Rework / ${d.qc.rejected} Rejected`}</AppText>
            <AppText variant="bodySmall">{`Packed: ${d.packed} · Dispatched: ${d.dispatched} · Open Issues: ${d.openIssues}`}</AppText>
          </AppCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
