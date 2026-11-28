import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { EmptyState } from '../../design-system/components/EmptyState';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { radii } from '../../design-system/tokens/radii';
import { spacing } from '../../design-system/tokens/spacing';
import { formatQuantity } from '../../utils/formatters';

const DEMO_OPERATORS = [
  { id: 'op-1', name: 'Kavitha Selvam', skill: 'Grade A', currentPace: '142 pcs/hr' },
  { id: 'op-2', name: 'Murugan Perumal', skill: 'Grade A', currentPace: '135 pcs/hr' },
  { id: 'op-3', name: 'Devi Saravanan', skill: 'Grade B', currentPace: '118 pcs/hr' },
  { id: 'op-4', name: 'Praveen Chandran', skill: 'Grade B', currentPace: '122 pcs/hr' },
];

const STAGE_PRESETS = ['Cutting', 'Sewing', 'Kaja / Button', 'Ironing', 'QC Check', 'Packing'];

interface LiveBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  quantity: number;
}

interface TailorMapping {
  id: string;
  operatorName: string;
  employeeId?: string | null;
  operationName: string;
  machineCode: string;
}

interface WorkAssignment {
  id: string;
  bundleCode: string;
  jobCode: string;
  quantity: number;
  operatorName: string;
  stageName: string;
  status: string;
}

export function WorkAssignmentView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles } = useDemoStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();
  const { t } = useTranslation(['production', 'common', 'errors']);

  const [selectedDemoBundle, setSelectedDemoBundle] = useState(bundles[0]);
  const [selectedDemoOp, setSelectedDemoOp] = useState(DEMO_OPERATORS[0]);

  const [selectedLiveBundle, setSelectedLiveBundle] = useState<LiveBundle | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [stageName, setStageName] = useState('Sewing');

  const bundlesQuery = useQuery({
    queryKey: ['assign-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveBundle[]>(`/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const tailorsQuery = useQuery({
    queryKey: ['assign-tailors', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<TailorMapping[]>(`/masters/tailor-mappings?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['work-assignments', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<WorkAssignment[]>(`/production/work-assignments?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeBundle = selectedLiveBundle ?? bundlesQuery.data?.[0] ?? null;
  const existingAssignments = assignmentsQuery.data ?? [];
  const isDuplicateAssignment = !!activeBundle && existingAssignments.some(
    (a) =>
      a.bundleCode === activeBundle.bundleCode &&
      a.operatorName.trim().toLowerCase() === operatorName.trim().toLowerCase() &&
      a.stageName.trim().toLowerCase() === stageName.trim().toLowerCase() &&
      a.status !== 'completed',
  );

  const createAssignment = useMutation({
    mutationFn: () => {
      if (!activeBundle) throw new Error('Select a bundle');
      if (isDuplicateAssignment) throw new Error('This operator is already assigned to this bundle and stage.');
      return apiRequest('/production/work-assignments', {
        method: 'POST',
        body: JSON.stringify({
          factoryId,
          bundleId: activeBundle.id,
          operatorName: operatorName.trim(),
          stageName: stageName.trim(),
        }),
      });
    },
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(
        t('production:workAssignment'),
        `${activeBundle?.bundleCode ?? ''} → ${operatorName.trim()} (${stageName.trim()})`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  if (!isDemoMode) {
    const liveBundles = bundlesQuery.data ?? [];
    const liveTailors = tailorsQuery.data ?? [];

    return (
      <ScrollView contentContainerStyle={[styles.scroll, { gap: spacing[3] }]}>
        <SummaryStrip
          metrics={[
            { label: t('common:bundles'), value: liveBundles.length, tone: 'brand' },
            { label: 'Mapped Tailors', value: liveTailors.length, tone: 'default' },
            { label: 'Assignments', value: existingAssignments.length, tone: 'success' },
          ]}
        />

        {bundlesQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
        {!bundlesQuery.isLoading && liveBundles.length === 0 && (
          <EmptyState title={t('common:noData')} message="No active bundles available for assignment." />
        )}

        {liveBundles.length > 0 && (
          <>
            <SectionHeader title="1. Select Bundle" count={liveBundles.length} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {liveBundles.slice(0, 20).map((b) => {
                  const chosen = activeBundle?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setSelectedLiveBundle(b)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: chosen ? tokens.brand : tokens.surface,
                          borderColor: chosen ? tokens.brand : tokens.border,
                        },
                      ]}
                    >
                      <AppText variant="label" mono bold style={{ color: chosen ? tokens.textInverse : tokens.textPrimary }}>
                        {b.bundleCode}
                      </AppText>
                      <AppText variant="caption" style={{ color: chosen ? tokens.textInverse : tokens.textSecondary }}>
                        {formatQuantity(b.quantity)} · {b.jobCode}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {liveTailors.length > 0 && (
          <>
            <SectionHeader title="2. Quick-Pick Mapped Tailor" count={liveTailors.length} />
            <View style={{ gap: spacing[2] }}>
              {liveTailors.map((tm) => {
                const selected = operatorName.trim().toLowerCase() === tm.operatorName.trim().toLowerCase();
                return (
                  <TouchableOpacity
                    key={tm.id}
                    onPress={() => {
                      setOperatorName(tm.operatorName);
                      setStageName(tm.operationName);
                    }}
                    style={[
                      styles.operatorCard,
                      {
                        backgroundColor: selected ? tokens.brandLight : tokens.surface,
                        borderColor: selected ? tokens.brand : tokens.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="h4" bold>{tm.operatorName}</AppText>
                      <AppText variant="caption" color="secondary">{tm.operationName} · {tm.machineCode}</AppText>
                    </View>
                    {selected && <StatusBadge label="SELECTED" variant="brand" size="sm" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <AppCard padding={spacing[4]}>
          <AppInput label={t('production:operatorNameLabel')} value={operatorName} onChangeText={setOperatorName} />
          <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1.5] }}>
            Stage Preset
          </AppText>
          <View style={styles.presetRow}>
            {STAGE_PRESETS.map((st) => {
              const active = stageName.trim().toLowerCase() === st.toLowerCase();
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStageName(st)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: active ? tokens.brand : tokens.surfaceSecondary,
                      borderColor: active ? tokens.brand : tokens.border,
                    },
                  ]}
                >
                  <AppText variant="caption" bold={active} style={{ color: active ? tokens.textInverse : tokens.textPrimary }}>
                    {st}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ marginTop: spacing[2] }}>
            <AppInput label={t('production:operationNameLabel')} value={stageName} onChangeText={setStageName} />
          </View>
          {isDuplicateAssignment && (
            <AppText variant="caption" color="danger" bold>
              This operator is already assigned to {activeBundle?.bundleCode} for {stageName}.
            </AppText>
          )}
        </AppCard>

        <AppButton
          title={t('production:workAssignment')}
          loading={createAssignment.isPending}
          disabled={!activeBundle || !operatorName.trim() || !stageName.trim() || isDuplicateAssignment || createAssignment.isPending}
          onPress={() => createAssignment.mutate()}
        />

        {existingAssignments.length > 0 && (
          <View style={{ marginTop: spacing[2], gap: spacing[2.5] }}>
            <SectionHeader title="Active Floor Assignments" count={existingAssignments.length} />
            {existingAssignments.map((a) => (
              <StructuredRecordCard
                key={a.id}
                code={a.bundleCode}
                title={a.operatorName}
                subtitle={a.stageName}
                status={{
                  label: (a.status || 'assigned').toUpperCase(),
                  variant: a.status === 'completed' ? 'success' : 'brand',
                  dot: true,
                }}
                fields={[
                  { label: t('common:job'), value: a.jobCode || '—', mono: true },
                  { label: t('common:quantity'), value: formatQuantity(a.quantity), mono: true },
                ]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const handleDemoAssign = () => {
    Alert.alert(
      t('production:workAssignment'),
      `${selectedDemoBundle.bundleCode} → ${selectedDemoOp.name}`,
      [{ text: t('common:confirm'), onPress: () => router.back() }],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        {t('production:workAssignment')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {bundles.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setSelectedDemoBundle(b)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedDemoBundle.id === b.id ? tokens.brand : tokens.surface,
                  borderColor: selectedDemoBundle.id === b.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText variant="label" mono bold style={{ color: selectedDemoBundle.id === b.id ? tokens.textInverse : tokens.textPrimary }}>
                {b.bundleCode}
              </AppText>
              <AppText variant="caption" style={{ color: selectedDemoBundle.id === b.id ? tokens.textInverse : tokens.textSecondary }}>
                {formatQuantity(b.quantity)} · {b.currentStage}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
        {DEMO_OPERATORS.map((op) => (
          <TouchableOpacity
            key={op.id}
            onPress={() => setSelectedDemoOp(op)}
            style={[
              styles.operatorCard,
              {
                backgroundColor: selectedDemoOp.id === op.id ? tokens.brandLight : tokens.surface,
                borderColor: selectedDemoOp.id === op.id ? tokens.brand : tokens.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="h4" bold>{op.name}</AppText>
              <AppText variant="caption" color="secondary">{op.skill} · {op.currentPace}</AppText>
            </View>
            <StatusBadge label={op.skill} variant="info" size="sm" />
          </TouchableOpacity>
        ))}
      </View>

      <AppButton title={t('common:confirm')} onPress={handleDemoAssign} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.md, borderWidth: 1 },
  operatorCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: radii.md, borderWidth: 1 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  presetChip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1] },
});
