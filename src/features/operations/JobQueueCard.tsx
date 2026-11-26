import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

interface Queue {
  stage: string;
  ordinal: number;
  pending: number;
  completedInWindow: number;
  estimatedQueueDays: number | null;
}
interface QueueReport {
  observationDays: number;
  queues: Queue[];
}
const stageLabels: Record<string, string> = {
  'sewing-out': 'production:sewing', quality: 'production:pendingQC',
  rework: 'production:reworkPieces', packing: 'production:packing',
};

export function JobQueueCard({ jobId }: { jobId: string }) {
  const { t } = useTranslation(['common', 'errors', 'production']);
  const userId = useAuthStore(state => state.user?.id);
  const report = useQuery({
    queryKey: ['job-queues', userId, jobId],
    queryFn: () => apiRequest<QueueReport>(`/analytics/jobs/${encodeURIComponent(jobId)}/queues`),
    enabled: !!userId,
  });
  return (
    <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
      <View style={{ gap: spacing[2] }}>
        <AppText variant="h4" bold>{t('production:bottleneckAnalytics')}</AppText>
        {report.isLoading && <AppText variant="caption">{t('common:loading')}</AppText>}
        {report.isError && <AppButton title={t('common:refresh')} size="sm" onPress={() => void report.refetch()} />}
        {report.data && <AppText variant="caption" color="secondary">
          {t('production:queueWindow', { days: report.data.observationDays })}
        </AppText>}
        {report.data?.queues.map(queue => (
          <View key={queue.ordinal} style={{ gap: spacing[1] }}>
            <AppText variant="label">{stageLabels[queue.stage] ? t(stageLabels[queue.stage]) : queue.stage}</AppText>
            <AppText variant="bodySmall" color="secondary">
              {t('production:queueCounts', { pending: queue.pending, completed: queue.completedInWindow })}
            </AppText>
            {!!queue.pending && <AppText variant="caption">
              {queue.estimatedQueueDays === null ? t('production:queueNoThroughput')
                : t('production:queueEstimate', { days: queue.estimatedQueueDays.toFixed(1) })}
            </AppText>}
          </View>
        ))}
      </View>
    </AppCard>
  );
}
