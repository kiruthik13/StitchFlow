import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { invalidateOperationalFlow } from '../../services/api/useFactoryUpdates';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { FilterBar } from '../../design-system/components/FilterBar';
import {
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../design-system/components/StructuredRecordCard';
import { radii } from '../../design-system/tokens/radii';
import { spacing } from '../../design-system/tokens/spacing';
import { formatDateTime } from '../../utils/formatters';

const ISSUE_CATEGORIES = [
  { key: 'machine', label: 'Machine Breakdown', icon: '⚙️' },
  { key: 'needle', label: 'Needle Breakage / Replacement', icon: '🪡' },
  { key: 'fabric', label: 'Fabric / Thread Quality Defect', icon: '🧵' },
  { key: 'power', label: 'Power / Compressor Interruption', icon: '⚡' },
  { key: 'trims', label: 'Missing Trims or Buttons', icon: '🔘' },
];

const STOPPAGE_PRESETS = ['5', '15', '30', '60'];

interface ProductionIssue {
  id: string;
  category: string;
  machineCode: string;
  stoppageMinutes: number;
  description: string;
  status: 'open' | 'resolved';
  reportedByName: string;
  createdAt: string;
}

interface TailorStation {
  id: string;
  machineCode: string;
  operationName: string;
  lineName: string;
}

export function ReportIssueView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user, serverPermissions } = useAuthStore();
  const factoryId = user?.factoryId;
  const canResolve = serverPermissions.includes('CAN_MANAGE_JOBS');
  const queryClient = useQueryClient();

  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].key);
  const [machineNo, setMachineNo] = useState('M-L1-08');
  const [description, setDescription] = useState('');
  const [stoppageMinutes, setStoppageMinutes] = useState('15');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const issuesQuery = useQuery({
    queryKey: ['production-issues', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<ProductionIssue[]>(`/production/issues?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const stationsQuery = useQuery({
    queryKey: ['tailor-mappings', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<TailorStation[]>(`/masters/tailor-mappings?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const parsedMinutes = Number(stoppageMinutes);
  const validMinutes = Number.isInteger(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= 1440;

  const submitIssue = useMutation({
    mutationFn: () => apiRequest('/production/issues', {
      method: 'POST',
      body: JSON.stringify({
        factoryId,
        category,
        machineCode: machineNo.trim().toUpperCase(),
        stoppageMinutes: parsedMinutes,
        description: description.trim() || (ISSUE_CATEGORIES.find(c => c.key === category)?.label ?? category),
      }),
    }),
    onSuccess: () => {
      setDescription('');
      invalidateOperationalFlow(queryClient);
      Alert.alert(
        t('production:reportMachineStoppage'),
        `${machineNo.trim().toUpperCase()} · ${parsedMinutes} min downtime logged.`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const resolveIssue = useMutation({
    mutationFn: (id: string) => apiRequest(`/production/issues/${id}/resolve`, { method: 'PATCH' }),
    onSuccess: () => invalidateOperationalFlow(queryClient),
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const handleSubmit = () => {
    if (!machineNo.trim()) {
      Alert.alert(t('errors:validationError'), 'Please enter or select a machine code.');
      return;
    }
    if (!validMinutes) {
      Alert.alert(t('errors:validationError'), 'Stoppage minutes must be a whole number between 0 and 1440.');
      return;
    }
    if (isDemoMode) {
      Alert.alert(
        t('production:reportMachineStoppage'),
        `${machineNo.trim().toUpperCase()} · ${category} · ${stoppageMinutes} min`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
      return;
    }
    submitIssue.mutate();
  };

  const allIssues = issuesQuery.data ?? [];
  const openCount = allIssues.filter((i) => i.status === 'open').length;
  const resolvedCount = allIssues.filter((i) => i.status === 'resolved').length;
  const totalDowntime = allIssues.reduce((sum, i) => sum + Number(i.stoppageMinutes || 0), 0);
  const filteredIssues = allIssues.filter((i) => statusFilter === 'all' || i.status === statusFilter);
  const quickMachines = Array.from(
    new Set((stationsQuery.data ?? []).map((s) => s.machineCode).filter(Boolean)),
  ).slice(0, 8);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {!isDemoMode && allIssues.length > 0 && (
        <SummaryStrip
          style={{ marginBottom: spacing[3] }}
          metrics={[
            { label: 'Open Issues', value: openCount, tone: openCount > 0 ? 'danger' : 'success' },
            { label: 'Resolved', value: resolvedCount, tone: 'success' },
            { label: 'Total Downtime', value: `${totalDowntime} min`, tone: 'warning' },
          ]}
        />
      )}

      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        {t('production:reportMachineStoppage')}
      </AppText>
      <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
        {ISSUE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={[
              styles.catCard,
              {
                backgroundColor: category === cat.key ? tokens.dangerLight : tokens.surface,
                borderColor: category === cat.key ? tokens.danger : tokens.border,
              },
            ]}
          >
            <AppText style={{ fontSize: 20 }}>{cat.icon}</AppText>
            <AppText variant="label" bold style={{ marginLeft: spacing[2], color: category === cat.key ? tokens.danger : tokens.textPrimary }}>
              {cat.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        {quickMachines.length > 0 && (
          <View style={{ marginBottom: spacing[2.5] }}>
            <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1.5] }}>
              Quick-Pick Factory Machine
            </AppText>
            <View style={styles.presetRow}>
              {quickMachines.map((code) => {
                const active = machineNo.trim().toUpperCase() === code.toUpperCase();
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setMachineNo(code)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active ? tokens.brand : tokens.surfaceSecondary,
                        borderColor: active ? tokens.brand : tokens.border,
                      },
                    ]}
                  >
                    <AppText variant="caption" mono bold style={{ color: active ? tokens.textInverse : tokens.textPrimary }}>
                      {code}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <AppInput label={t('production:machineCodeLabel')} value={machineNo} onChangeText={setMachineNo} autoCapitalize="characters" />

        <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1.5] }}>
          Downtime Duration (Minutes)
        </AppText>
        <View style={[styles.presetRow, { marginBottom: spacing[2] }]}>
          {STOPPAGE_PRESETS.map((min) => {
            const active = stoppageMinutes === min;
            return (
              <TouchableOpacity
                key={min}
                onPress={() => setStoppageMinutes(min)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? tokens.danger : tokens.surfaceSecondary,
                    borderColor: active ? tokens.danger : tokens.border,
                  },
                ]}
              >
                <AppText variant="caption" mono bold style={{ color: active ? tokens.textInverse : tokens.textPrimary }}>
                  {min}m
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
        <AppInput label="Downtime (MIN)" value={stoppageMinutes} onChangeText={setStoppageMinutes} keyboardType="numeric" />
        <AppInput
          label={t('production:descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe breakdown symptom or repair required..."
          multiline
        />
      </AppCard>

      <AppButton
        title={t('production:reportMachineStoppage')}
        variant="danger"
        loading={submitIssue.isPending}
        disabled={submitIssue.isPending || !machineNo.trim() || !validMinutes}
        onPress={handleSubmit}
      />

      {!isDemoMode && allIssues.length > 0 && (
        <View style={{ marginTop: spacing[4], gap: spacing[2.5] }}>
          <SectionHeader title="Reported Machine Stoppages" count={filteredIssues.length} />
          <FilterBar
            selected={statusFilter}
            onSelect={(k) => setStatusFilter(k as 'all' | 'open' | 'resolved')}
            options={[
              { key: 'all', label: `${t('common:all')} (${allIssues.length})` },
              { key: 'open', label: `Open (${openCount})` },
              { key: 'resolved', label: `Resolved (${resolvedCount})` },
            ]}
          />
          {filteredIssues.map((iss) => (
            <StructuredRecordCard
              key={iss.id}
              code={iss.machineCode}
              title={ISSUE_CATEGORIES.find((c) => c.key === iss.category)?.label ?? iss.category}
              subtitle={iss.reportedByName}
              status={{
                label: iss.status.toUpperCase(),
                variant: iss.status === 'resolved' ? 'success' : 'danger',
                dot: true,
              }}
              fields={[
                { label: 'Downtime', value: `${iss.stoppageMinutes} min`, mono: true, tone: iss.status === 'open' ? 'danger' : 'default' },
                { label: t('common:date'), value: formatDateTime(iss.createdAt) },
              ]}
              highlight={iss.description ? { label: t('production:descriptionLabel'), value: iss.description, tone: 'info' } : undefined}
            >
              {canResolve && iss.status === 'open' && (
                <AppButton
                  title="Mark Resolved"
                  size="sm"
                  variant="outline"
                  loading={resolveIssue.isPending}
                  onPress={() => resolveIssue.mutate(iss.id)}
                />
              )}
            </StructuredRecordCard>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4] },
  catCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3.5], borderRadius: radii.md, borderWidth: 1 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  presetChip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1] },
});
