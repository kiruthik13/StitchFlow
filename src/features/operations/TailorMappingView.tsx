import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../services/api/apiClient';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { StatusBadge } from '../../design-system/components/StatusBadge';
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

  const createMapping = useMutation({
    mutationFn: () => apiRequest('/masters/tailor-mappings', {
      method: 'POST',
      body: JSON.stringify({
        factoryId,
        lineId: lineId || linesQuery.data?.[0]?.id,
        operatorName: operatorName.trim(),
        operationName: operationName.trim(),
        machineCode: machineCode.trim(),
        targetPace: Number(targetPace) || 40,
      }),
    }),
    onSuccess: () => {
      setShowForm(false);
      setOperatorName('');
      setOperationName('');
      setMachineCode('');
      void queryClient.invalidateQueries({ queryKey: ['tailor-mappings', user?.id, factoryId] });
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'optimal' | 'slow' }) =>
      apiRequest(`/masters/tailor-mappings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tailor-mappings', user?.id, factoryId] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
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

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {canEdit && (
        <View style={{ marginBottom: spacing[3] }}>
          <AppButton title={t('production:addMasterRecord')} onPress={() => setShowForm((v) => !v)} />
        </View>
      )}

      {showForm && (
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label={t('production:operatorNameLabel')} value={operatorName} onChangeText={setOperatorName} />
          <AppInput label={t('production:operationNameLabel')} value={operationName} onChangeText={setOperationName} />
          <AppInput label={t('production:machineCodeLabel')} value={machineCode} onChangeText={setMachineCode} />
          <AppInput label={t('production:targetPaceLabel')} value={targetPace} onChangeText={setTargetPace} keyboardType="number-pad" />
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
            disabled={createMapping.isPending || !operatorName.trim() || !operationName.trim() || !machineCode.trim()}
            onPress={() => createMapping.mutate()}
          />
        </AppCard>
      )}

      {mappingsQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
      {mappingsQuery.data?.map((item) => (
        <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <AppText variant="h4" bold>{item.operatorName}</AppText>
              <AppText variant="label" color="brand" bold style={{ marginTop: 2 }}>{item.operationName}</AppText>
              <AppText variant="caption" color="secondary">{item.lineName} · {item.machineCode}</AppText>
            </View>
            <StatusBadge
              label={item.status.toUpperCase()}
              variant={item.status === 'optimal' ? 'success' : 'warning'}
              size="sm"
            />
          </View>
          <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">{t('production:targetPaceLabel')}</AppText>
              <AppText variant="label" bold>{item.targetPace}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">{t('production:actualPaceLabel')}</AppText>
              <AppText variant="label" bold style={{ color: item.status === 'optimal' ? tokens.success : tokens.warning }}>
                {item.actualPace}
              </AppText>
            </View>
            {canEdit && (
              <AppButton
                title={t('production:rebalanceStation')}
                size="sm"
                variant="outline"
                onPress={() => toggleStatus.mutate({ id: item.id, status: item.status === 'optimal' ? 'slow' : 'optimal' })}
              />
            )}
          </View>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
});
