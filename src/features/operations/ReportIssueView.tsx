import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../services/api/apiClient';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

const ISSUE_CATEGORIES = [
  { key: 'machine', label: 'Machine Breakdown', icon: '⚙️' },
  { key: 'needle', label: 'Needle Breakage / Replacement', icon: '🪡' },
  { key: 'fabric', label: 'Fabric / Thread Quality Defect', icon: '🧵' },
  { key: 'power', label: 'Power / Compressor Interruption', icon: '⚡' },
  { key: 'trims', label: 'Missing Trims or Buttons', icon: '🔘' },
];

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

  const issuesQuery = useQuery({
    queryKey: ['production-issues', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<ProductionIssue[]>(`/production/issues?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const submitIssue = useMutation({
    mutationFn: () => apiRequest('/production/issues', {
      method: 'POST',
      body: JSON.stringify({
        factoryId,
        category,
        machineCode: machineNo.trim(),
        stoppageMinutes: Number(stoppageMinutes) || 0,
        description: description.trim() || category,
      }),
    }),
    onSuccess: () => {
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['production-issues', user?.id, factoryId] });
      Alert.alert(t('production:reportMachineStoppage'), machineNo, [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const resolveIssue = useMutation({
    mutationFn: (id: string) => apiRequest(`/production/issues/${id}/resolve`, { method: 'PATCH' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['production-issues', user?.id, factoryId] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const handleSubmit = () => {
    if (isDemoMode) {
      Alert.alert(
        t('production:reportMachineStoppage'),
        `${machineNo} · ${category} · ${stoppageMinutes} min`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
      return;
    }
    submitIssue.mutate();
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
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
        <AppInput label={t('production:machineCodeLabel')} value={machineNo} onChangeText={setMachineNo} />
        <AppInput label="MIN" value={stoppageMinutes} onChangeText={setStoppageMinutes} keyboardType="numeric" />
        <AppInput
          label={t('production:descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </AppCard>

      <AppButton
        title={t('common:confirm')}
        variant="danger"
        disabled={submitIssue.isPending || !machineNo.trim()}
        onPress={handleSubmit}
      />

      {!isDemoMode && issuesQuery.data && issuesQuery.data.length > 0 && (
        <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
          {issuesQuery.data.map((iss) => (
            <AppCard key={iss.id} padding={spacing[3]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" bold>{iss.machineCode} · {iss.category}</AppText>
                  <AppText variant="caption" color="secondary">{iss.description}</AppText>
                </View>
                <StatusBadge label={iss.status.toUpperCase()} variant={iss.status === 'resolved' ? 'success' : 'danger'} size="sm" />
              </View>
              {canResolve && iss.status === 'open' && (
                <View style={{ marginTop: spacing[2] }}>
                  <AppButton title={t('common:confirm')} size="sm" variant="outline" onPress={() => resolveIssue.mutate(iss.id)} />
                </View>
              )}
            </AppCard>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  catCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
