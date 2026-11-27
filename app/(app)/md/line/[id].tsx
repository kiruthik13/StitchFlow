import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../../src/store/themeStore';
import { useAuthStore } from '../../../../src/store/authStore';
import { useDemoStore } from '../../../../src/store/demoStore';
import { apiRequest } from '../../../../src/services/api/apiClient';
import { AppHeader } from '../../../../src/design-system/components/AppHeader';
import { AppText } from '../../../../src/design-system/components/AppText';
import { AppCard } from '../../../../src/design-system/components/AppCard';
import { AppButton } from '../../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../../src/design-system/components/EmptyState';
import {
  DashboardSection,
  CompactMetricCard,
  WorkOrderPreview,
  DashboardSkeleton,
} from '../../../../src/design-system/components/dashboard';
import { spacing } from '../../../../src/design-system/tokens/spacing';
import { LINES, DEMO_USERS } from '../../../../src/fixtures/mockData';
import { Layers, Users, ClipboardList } from 'lucide-react-native';

interface LineDetailResponse {
  line: {
    id: string;
    factoryId: string;
    departmentId: string;
    code: string;
    name: string;
    capacity: number;
    stages: string[];
    isActive: boolean;
    factoryName: string;
    departmentName: string | null;
  };
  jobs: Array<{ id: string; jobCode: string; orderQuantity: number; status: string; targetDate: string; buyerName: string; styleName: string }>;
  staff: Array<{ id: string; employeeId: string; name: string; roleCode: string }>;
  issues: Array<{ id: string; category: string; machineCode: string; stoppageMinutes: number; description: string; resolvedAt: string | null }>;
}

export default function LineDetailScreen() {
  const params = useLocalSearchParams<{ id: string; factoryId?: string }>();
  const lineId = Array.isArray(params.id) ? params.id[0] : params.id;
  const factoryId = Array.isArray(params.factoryId) ? params.factoryId[0] : params.factoryId;
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const { jobs: demoJobs } = useDemoStore();

  const liveQuery = useQuery({
    queryKey: ['md-line-detail', user?.id, factoryId, lineId],
    enabled: !isDemoMode && !!factoryId && !!lineId,
    queryFn: () =>
      apiRequest<LineDetailResponse>(
        `/factories/${encodeURIComponent(factoryId!)}/lines/${encodeURIComponent(lineId!)}`,
      ),
  });

  const demoLine = LINES.find((l) => l.id === lineId) ?? LINES[0];
  const data: LineDetailResponse | undefined = isDemoMode
    ? {
        line: {
          id: demoLine.id,
          factoryId: demoLine.factoryId,
          departmentId: 'dept-sew',
          code: demoLine.code,
          name: demoLine.name,
          capacity: demoLine.capacity,
          stages: ['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing'],
          isActive: true,
          factoryName: demoLine.factoryId === 'factory-a' ? 'Factory A' : 'Factory B',
          departmentName: 'Sewing & Finishing',
        },
        jobs: demoJobs
          .filter((j) => j.lineId === demoLine.id)
          .map((j) => ({
            id: j.id,
            jobCode: j.jobCode,
            orderQuantity: j.orderQuantity,
            status: j.status,
            targetDate: j.targetDate,
            buyerName: j.buyerName,
            styleName: j.styleName,
          })),
        staff: DEMO_USERS.filter((u) => u.lineId === demoLine.id).map((u) => ({
          id: u.id,
          employeeId: u.id.toUpperCase(),
          name: u.name,
          roleCode: u.role,
        })),
        issues: [],
      }
    : liveQuery.data;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={data?.line.name ?? t('production:lines')}
        subtitle={data ? `${data.line.code} · ${data.line.factoryName}` : ''}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!isDemoMode && liveQuery.isLoading ? (
          <DashboardSkeleton />
        ) : !isDemoMode && liveQuery.isError ? (
          <View style={{ gap: spacing[3] }}>
            <EmptyState title={t('errors:serverError')} />
            <AppButton title={t('common:refresh')} onPress={() => void liveQuery.refetch()} />
          </View>
        ) : data ? (
          <>
            <View style={styles.grid}>
              <CompactMetricCard
                label={t('production:capacity')}
                value={data.line.capacity}
                tone="brand"
                icon={<Layers size={15} color={tokens.brand} />}
              />
              <CompactMetricCard
                label={t('production:lineStrength')}
                value={data.staff.length}
                tone="success"
                icon={<Users size={15} color={tokens.successText} />}
              />
            </View>

            <DashboardSection title={t('production:activeStages')} />
            <AppCard padding={spacing[3.5]}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
                {(data.line.stages ?? []).map((st) => (
                  <StatusBadge key={st} label={st} variant="info" size="sm" />
                ))}
              </View>
            </AppCard>

            <DashboardSection title={t('production:lineStrength')} count={data.staff.length} />
            {data.staff.length === 0 ? (
              <EmptyState title={t('common:noData')} />
            ) : (
              <View style={{ gap: spacing[2] }}>
                {data.staff.map((emp) => (
                  <AppCard key={emp.id} padding={spacing[3]}>
                    <View style={styles.rowBetween}>
                      <View>
                        <AppText variant="label" bold>{emp.name}</AppText>
                        <AppText variant="caption" color="secondary" mono>{emp.employeeId}</AppText>
                      </View>
                      <StatusBadge label={t(`common:roles.${emp.roleCode}`)} variant="brand" size="sm" />
                    </View>
                  </AppCard>
                ))}
              </View>
            )}

            <DashboardSection title={t('production:workOrders')} count={data.jobs.length} />
            {data.jobs.length === 0 ? (
              <EmptyState title={t('common:noData')} />
            ) : (
              <View style={{ gap: spacing[2] }}>
                {data.jobs.map((job) => (
                  <WorkOrderPreview
                    key={job.id}
                    code={job.jobCode}
                    title={`${job.styleName || ''} · ${job.buyerName || ''}`}
                    subtitle={`${job.orderQuantity.toLocaleString()} ${t('common:pieces')} · ${job.targetDate?.slice(0, 10) ?? ''}`}
                    statusLabel={job.status.toUpperCase()}
                    statusVariant={job.status === 'active' ? 'success' : 'warning'}
                    onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing[2.5] },
});
