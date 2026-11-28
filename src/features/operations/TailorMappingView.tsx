import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { EmptyState } from '../../design-system/components/EmptyState';
import { FilterBar } from '../../design-system/components/FilterBar';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { spacing } from '../../design-system/tokens/spacing';

interface TailorMappingRecord {
  id: string;
  lineId: string;
  lineName: string;
  operatorName: string;
  employeeId?: string | null;
  operationName: string;
  machineCode: string;
  targetPace: number;
  actualPace: number;
  status: 'optimal' | 'slow' | 'inactive';
  isActive: boolean;
}

const DEMO_TAILOR_MAPPINGS = [
  { id: 'tm-1', tailor: 'Kavitha Selvam', operation: 'Collar Band & Attach', machine: 'M-L1-02', targetPace: '45 pcs/hr', actualPace: '48 pcs/hr', status: 'optimal' },
  { id: 'tm-2', tailor: 'Murugan Perumal', operation: 'Sleeve Overlock Join', machine: 'M-L1-05', targetPace: '55 pcs/hr', actualPace: '52 pcs/hr', status: 'optimal' },
  { id: 'tm-3', tailor: 'Devi Saravanan', operation: 'Front Placket Stitch', machine: 'M-L1-07', targetPace: '40 pcs/hr', actualPace: '31 pcs/hr', status: 'slow' },
  { id: 'tm-4', tailor: 'Praveen Chandran', operation: 'Bottom Hemming', machine: 'M-L1-11', targetPace: '65 pcs/hr', actualPace: '68 pcs/hr', status: 'optimal' },
];

export function TailorMappingView() {
  const { tokens } = useThemeStore();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user, serverPermissions } = useAuthStore();
  const factoryId = user?.factoryId;
  const canEdit = serverPermissions.includes('CAN_MANAGE_JOBS');
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'optimal' | 'slow'>('all');
  const [lineId, setLineId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operationName, setOperationName] = useState('');
  const [machineCode, setMachineCode] = useState('');
  const [targetPace, setTargetPace] = useState('45');

  const mappingsQuery = useQuery({
    queryKey: ['tailor-mappings', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<TailorMappingRecord[]>(`/masters/tailor-mappings?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const linesQuery = useQuery({
    queryKey: ['factory-lines', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId && canEdit,
    queryFn: async () => (await apiRequest<{ lines: Array<{ id: string; name: string }> }>(`/factories/${encodeURIComponent(factoryId!)}/hierarchy`)).lines,
  });

  const showErr = (err: Error) => {
    const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
    Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
  };

  const parsedPace = Number(targetPace);
  const validPace = Number.isInteger(parsedPace) && parsedPace > 0 && parsedPace <= 500;

  const createMapping = useMutation({
    mutationFn: () => {
      if (!validPace) throw new Error('Target pace must be between 1 and 500 pcs/hr.');
      return apiRequest('/masters/tailor-mappings', {
        method: 'POST',
        body: JSON.stringify({
          factoryId,
          lineId: lineId || linesQuery.data?.[0]?.id,
          operatorName: operatorName.trim(),
          operationName: operationName.trim(),
          machineCode: machineCode.trim().toUpperCase(),
          targetPace: parsedPace,
        }),
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setOperatorName('');
      setOperationName('');
      setMachineCode('');
      invalidateOperationalFlow(queryClient);
    },
    onError: showErr,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'optimal' | 'slow' }) =>
      apiRequest(`/masters/tailor-mappings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidateOperationalFlow(queryClient),
    onError: showErr,
  });

  if (isDemoMode) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          {t('production:tailorMapping')}
        </AppText>

        {DEMO_TAILOR_MAPPINGS.map((item) => (
          <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <AppText variant="h4" bold>{item.tailor}</AppText>
                <AppText variant="label" color="brand" bold style={{ marginTop: 2 }}>{item.operation}</AppText>
                <AppText variant="caption" color="secondary">{item.machine}</AppText>
              </View>
              <StatusBadge label={item.status.toUpperCase()} variant={item.status === 'optimal' ? 'success' : 'warning'} size="sm" />
            </View>

            <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="secondary">{t('production:targetPaceLabel')}</AppText>
                <AppText variant="label" bold>{item.targetPace}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="secondary">{t('production:actualPaceLabel')}</AppText>
                <AppText variant="label" bold style={{ color: item.status === 'optimal' ? tokens.success : tokens.warning }}>{item.actualPace}</AppText>
              </View>
              <TouchableOpacity onPress={() => Alert.alert(t('production:rebalanceStation'), item.tailor)}>
                <AppText variant="label" color="brand" style={{ paddingTop: spacing[1] }}>{t('production:rebalanceStation')}</AppText>
              </TouchableOpacity>
            </View>
          </AppCard>
        ))}
      </ScrollView>
    );
  }

  const allMappings = mappingsQuery.data ?? [];
  const optimalCount = allMappings.filter((m) => m.status === 'optimal').length;
  const slowCount = allMappings.filter((m) => m.status === 'slow').length;
  const filteredMappings = allMappings.filter((m) => statusFilter === 'all' || m.status === statusFilter);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { gap: spacing[3] }]}>
      <SummaryStrip
        metrics={[
          { label: 'Stations', value: allMappings.length, tone: 'brand' },
          { label: 'Optimal', value: optimalCount, tone: 'success' },
          { label: 'Slow / Bottleneck', value: slowCount, tone: slowCount > 0 ? 'warning' : 'default' },
        ]}
      />

      {canEdit && (
        <AppButton
          title={showForm ? t('common:cancel') : t('production:addMasterRecord')}
          variant={showForm ? 'outline' : 'primary'}
          onPress={() => setShowForm((v) => !v)}
        />
      )}

      {showForm && (
        <AppCard padding={spacing[4]}>
          <AppInput label={t('production:operatorNameLabel')} value={operatorName} onChangeText={setOperatorName} />
          <AppInput label={t('production:operationNameLabel')} value={operationName} onChangeText={setOperationName} />
          <AppInput label={t('production:machineCodeLabel')} value={machineCode} onChangeText={setMachineCode} autoCapitalize="characters" />
          <AppInput label={`${t('production:targetPaceLabel')} (pcs/hr)`} value={targetPace} onChangeText={setTargetPace} keyboardType="number-pad" />
          {linesQuery.data && linesQuery.data.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] }}>
              {linesQuery.data.map((l) => (
                <AppButton
                  key={l.id}
                  title={l.name}
                  size="sm"
                  variant={(lineId || linesQuery.data?.[0]?.id) === l.id ? 'primary' : 'outline'}
                  onPress={() => setLineId(l.id)}
                />
              ))}
            </View>
          )}
          <AppButton
            title={t('common:confirm')}
            loading={createMapping.isPending}
            disabled={createMapping.isPending || !operatorName.trim() || !operationName.trim() || !machineCode.trim() || !validPace}
            onPress={() => createMapping.mutate()}
          />
        </AppCard>
      )}

      {allMappings.length > 0 && (
        <FilterBar
          selected={statusFilter}
          onSelect={(k) => setStatusFilter(k as 'all' | 'optimal' | 'slow')}
          options={[
            { key: 'all', label: `${t('common:all')} (${allMappings.length})` },
            { key: 'optimal', label: `Optimal (${optimalCount})` },
            { key: 'slow', label: `Slow (${slowCount})` },
          ]}
        />
      )}

      {mappingsQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
      {!mappingsQuery.isLoading && filteredMappings.length === 0 && (
        <EmptyState title={t('common:noData')} message="No tailor-to-machine mappings match this filter." />
      )}

      {filteredMappings.length > 0 && <SectionHeader title={t('production:tailorMapping')} count={filteredMappings.length} />}

      {filteredMappings.map((item) => {
        const effPct = Math.round((item.actualPace / Math.max(1, item.targetPace)) * 100);
        return (
          <StructuredRecordCard
            key={item.id}
            code={item.machineCode}
            title={item.operatorName}
            subtitle={`${item.operationName} · ${item.lineName}`}
            status={{
              label: item.status.toUpperCase(),
              variant: item.status === 'optimal' ? 'success' : 'warning',
              dot: true,
            }}
            fields={[
              { label: t('production:targetPaceLabel'), value: `${item.targetPace} pcs/hr`, mono: true },
              {
                label: t('production:actualPaceLabel'),
                value: `${item.actualPace} pcs/hr`,
                mono: true,
                tone: item.status === 'optimal' ? 'success' : 'warning',
              },
              {
                label: 'Station Efficiency',
                value: `${effPct}%`,
                mono: true,
                tone: effPct >= 95 ? 'success' : effPct >= 80 ? 'warning' : 'danger',
              },
              { label: t('common:line'), value: item.lineName },
            ]}
          >
            {canEdit && (
              <AppButton
                title={t('production:rebalanceStation')}
                size="sm"
                variant="outline"
                disabled={toggleStatus.isPending}
                onPress={() => toggleStatus.mutate({ id: item.id, status: item.status === 'optimal' ? 'slow' : 'optimal' })}
              />
            )}
          </StructuredRecordCard>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
});
