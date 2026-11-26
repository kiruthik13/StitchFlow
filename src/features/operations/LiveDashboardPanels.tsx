import React from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../core/types';

const metricLabels = {
  jobs: 'production:totalJobs', activeJobs: 'production:activeJobs', drafts: 'production:approvals',
  pastTarget: 'production:highRiskOrders', ordered: 'production:orderQuantity', cut: 'production:cuttingPieces',
  inspected: 'production:actualInspected', rework: 'production:reworkPieces', rejected: 'production:actualRejected',
  released: 'production:bundleWorkflow_release', packed: 'production:packingPieces', dispatched: 'production:actualDispatched',
  pendingShipments: 'inventory:dispatchManifest', incomingTransfers: 'inventory:interFactoryTransfer',
} as const;

type Metrics = Record<keyof typeof metricLabels, number>;
type Route = '/(app)/jobs' | '/(app)/(tabs)/scan' | '/(app)/store/goods-receipt' |
  '/(app)/store/inter-factory-transfer' | '/(app)/store/dispatch' | '/(app)/(tabs)/reports';
const shortcuts: Record<UserRole, { label: string; href: Route }[]> = {
  md: [{ label: 'reports:reportsAndLogs', href: '/(app)/(tabs)/reports' }, { label: 'production:workOrders', href: '/(app)/jobs' }],
  'factory-manager': [{ label: 'production:workOrders', href: '/(app)/jobs' }, { label: 'inventory:dispatchManifest', href: '/(app)/store/dispatch' }],
  supervisor: [{ label: 'production:workOrders', href: '/(app)/jobs' }, { label: 'common:scanBarcode', href: '/(app)/(tabs)/scan' }],
  operator: [{ label: 'common:scanBarcode', href: '/(app)/(tabs)/scan' }, { label: 'production:workOrders', href: '/(app)/jobs' }],
  'qc-inspector': [{ label: 'common:scanBarcode', href: '/(app)/(tabs)/scan' }, { label: 'reports:reportsAndLogs', href: '/(app)/(tabs)/reports' }],
  'store-dispatch': [
    { label: 'inventory:goodsReceipt', href: '/(app)/store/goods-receipt' },
    { label: 'inventory:interFactoryTransfer', href: '/(app)/store/inter-factory-transfer' },
    { label: 'inventory:dispatchManifest', href: '/(app)/store/dispatch' },
  ],
  'packing-staff': [{ label: 'common:scanBarcode', href: '/(app)/(tabs)/scan' }, { label: 'production:workOrders', href: '/(app)/jobs' }],
};
const metricsByRole: Record<UserRole, (keyof Metrics)[]> = {
  md: ['jobs', 'activeJobs', 'pastTarget', 'cut', 'rework', 'rejected', 'packed', 'dispatched'],
  'factory-manager': ['activeJobs', 'drafts', 'pastTarget', 'cut', 'rework', 'released', 'packed', 'dispatched'],
  supervisor: ['activeJobs', 'ordered', 'cut', 'inspected', 'rework', 'packed'],
  operator: ['activeJobs', 'ordered', 'cut', 'rework'],
  'qc-inspector': ['inspected', 'rework', 'rejected', 'released'],
  'store-dispatch': ['incomingTransfers', 'pendingShipments', 'packed', 'dispatched'],
  'packing-staff': ['released', 'packed', 'dispatched'],
};

export function LiveDashboardPanel() {
  const router = useRouter();
  const { t } = useTranslation(['common', 'production', 'inventory', 'reports']);
  const user = useAuthStore(state => state.user);
  const query = useQuery({
    queryKey: ['live-dashboard', user?.id],
    queryFn: () => apiRequest<Metrics>('/analytics/dashboard'),
    enabled: !!user,
    staleTime: 30000,
  });
  if (!user) return null;
  return (
    <View style={{ gap: spacing[3] }}>
      <AppText variant="h3" bold>{t(`common:roles.${user.role}`)}</AppText>
      {query.isLoading && <AppText>{t('common:loading')}</AppText>}
      {query.isError && <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />}
      {query.data && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {metricsByRole[user.role].map(key => (
          <AppCard key={key} padding={spacing[3]} style={{ flexGrow: 1, flexBasis: '46%' }}>
            <AppText variant="caption" color="secondary">{t(metricLabels[key])}</AppText>
            <AppText variant="h3" bold mono>{query.data![key].toLocaleString()}</AppText>
          </AppCard>
        ))}
      </View>}
      {shortcuts[user.role].map(item => <AppButton key={item.href} title={t(item.label)}
        onPress={() => router.push(item.href)} variant="outline" />)}
    </View>
  );
}

interface ReportJob {
  id: string;
  job_code: string;
  factory_name: string;
  order_quantity: number;
  target_date: string;
  cut: number;
  rework: number;
  packed: number;
  dispatched: number;
}
export function LiveReportsPanel() {
  const { t } = useTranslation(['common', 'production', 'reports', 'errors']);
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const query = useInfiniteQuery({
    queryKey: ['live-reports', user?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !!user,
    queryFn: ({ pageParam }) => apiRequest<ReportJob[]>(pageParam ? `/reports/jobs?after=${encodeURIComponent(pageParam)}` : '/reports/jobs'),
    getNextPageParam: page => page.length === 100 ? page[page.length - 1].id : undefined,
  });
  const exportReport = useMutation({
    mutationFn: async () => {
      const chunks: string[] = [];
      let cursor: string | null = null;
      // Keep shares bounded on phones. Each server page is individually scoped by the current session.
      for (let index = 0; index < 10; index++) {
        const page: { csv: string; nextCursor: string | null } = await apiRequest(
          cursor ? `/reports/jobs/export?after=${encodeURIComponent(cursor)}` : '/reports/jobs/export',
        );
        chunks.push(index ? page.csv.slice(page.csv.indexOf('\r\n') + 2) : page.csv);
        cursor = page.nextCursor;
        if (!cursor) break;
      }
      return chunks.join('\r\n');
    },
    onSuccess: csv => { void Share.share({ message: csv }).catch(() => {}); },
  });
  return (
    <View style={{ gap: spacing[3] }}>
      <AppButton title={t('production:shareJobCsv')} disabled={exportReport.isPending} onPress={() => exportReport.mutate()} />
      {exportReport.isError && <AppText>{t('errors:serverError')}</AppText>}
      {query.isLoading && <AppText>{t('common:loading')}</AppText>}
      {query.isError && <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />}
      {!query.isLoading && !query.isError && !query.data?.pages.some(page => page.length) && <AppText>{t('production:noJobsFound')}</AppText>}
      {query.data?.pages.flat().map(job => <AppCard key={job.id} padding={spacing[3]}>
        <AppText variant="h4" bold>{job.job_code}</AppText>
        <AppText variant="caption" color="secondary">{job.factory_name} · {job.target_date}</AppText>
        <AppText variant="bodySmall">{t('production:orderQuantity')}: {job.order_quantity} · {t('production:cuttingPieces')}: {job.cut}</AppText>
        <AppText variant="bodySmall">{t('production:reworkPieces')}: {job.rework} · {t('production:packingPieces')}: {job.packed} · {t('production:actualDispatched')}: {job.dispatched}</AppText>
        <AppButton title={t('common:details')} size="sm" variant="outline" onPress={() => router.push(`/(app)/jobs/${job.id}`)} />
      </AppCard>)}
      {query.hasNextPage && <AppButton title={t('production:loadMoreJobs')} disabled={query.isFetching}
        onPress={() => void query.fetchNextPage()} />}
    </View>
  );
}
