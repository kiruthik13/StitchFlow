import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface ReplayResponse {
  readOnly: true;
  job: { id: string; jobCode: string; status: string };
  events: Array<{ id: string; action: string; actorName?: string | null; recordedAt: string }>;
}

export default function ProductionReplayScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);
  const [cursor, setCursor] = useState(0);

  const query = useQuery({
    queryKey: ['production-replay', jobId],
    enabled: !isDemoMode && !!jobId,
    queryFn: () => apiRequest<ReplayResponse>(`/analytics/jobs/${jobId}/replay`),
  });

  const events = query.data?.events ?? [];
  const active = events[cursor];

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:productionReplay', { defaultValue: 'Production Replay (Read-Only)' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        {isDemoMode || !jobId || !events.length ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <AppCard padding={spacing[4]}>
            <AppText variant="h4" bold mono>{query.data?.job.jobCode}</AppText>
            <AppText variant="bodySmall" color="secondary">{`Event ${cursor + 1} of ${events.length}`}</AppText>
            {active && (
              <View style={{ marginTop: spacing[3] }}>
                <AppText variant="label" bold>{active.action}</AppText>
                <AppText variant="caption" color="secondary">
                  {`${active.actorName ?? 'System'} · ${new Date(active.recordedAt).toLocaleString()}`}
                </AppText>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
              <AppButton title="Prev" variant="outline" size="sm" disabled={cursor <= 0} onPress={() => setCursor((c) => Math.max(0, c - 1))} />
              <AppButton title="Next" size="sm" disabled={cursor >= events.length - 1} onPress={() => setCursor((c) => Math.min(events.length - 1, c + 1))} />
            </View>
          </AppCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
