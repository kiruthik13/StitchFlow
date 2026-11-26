import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';
import { apiRequest } from '../../services/api/apiClient';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

const DEMO_OPERATORS = [
  { id: 'op-1', name: 'Kavitha Selvam', skill: 'Grade A', currentPace: '142 pcs/hr' },
  { id: 'op-2', name: 'Murugan Perumal', skill: 'Grade A', currentPace: '135 pcs/hr' },
  { id: 'op-3', name: 'Devi Saravanan', skill: 'Grade B', currentPace: '118 pcs/hr' },
  { id: 'op-4', name: 'Praveen Chandran', skill: 'Grade B', currentPace: '122 pcs/hr' },
];

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

  const createAssignment = useMutation({
    mutationFn: () => {
      if (!activeBundle) throw new Error('Select a bundle');
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
      void queryClient.invalidateQueries({ queryKey: ['work-assignments', user?.id, factoryId] });
      Alert.alert(t('production:workAssignment'), activeBundle?.bundleCode ?? '', [
        { text: t('common:confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (!isDemoMode) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>
          {t('production:workAssignment')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {(bundlesQuery.data ?? []).slice(0, 20).map((b) => {
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
                    {b.quantity} · {b.jobCode}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {tailorsQuery.data && tailorsQuery.data.length > 0 && (
          <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
            {tailorsQuery.data.map((tm) => (
              <TouchableOpacity
                key={tm.id}
                onPress={() => { setOperatorName(tm.operatorName); setStageName(tm.operationName); }}
                style={[
                  styles.operatorCard,
                  {
                    backgroundColor: operatorName === tm.operatorName ? tokens.brandLight : tokens.surface,
                    borderColor: operatorName === tm.operatorName ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{tm.operatorName}</AppText>
                  <AppText variant="caption" color="secondary">{tm.operationName} · {tm.machineCode}</AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label={t('production:operatorNameLabel')} value={operatorName} onChangeText={setOperatorName} />
          <AppInput label={t('production:operationNameLabel')} value={stageName} onChangeText={setStageName} />
        </AppCard>

        <AppButton
          title={t('common:confirm')}
          disabled={!activeBundle || !operatorName.trim() || !stageName.trim() || createAssignment.isPending}
          onPress={() => createAssignment.mutate()}
        />

        {assignmentsQuery.data && assignmentsQuery.data.length > 0 && (
          <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
            {assignmentsQuery.data.map((a) => (
              <AppCard key={a.id} padding={spacing[3]}>
                <AppText variant="code" mono bold>{a.bundleCode}</AppText>
                <AppText variant="bodySmall">{a.operatorName} · {a.stageName}</AppText>
              </AppCard>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const handleDemoAssign = () => {
    Alert.alert(
      t('production:workAssignment'),
      `${selectedDemoBundle.bundleCode} -> ${selectedDemoOp.name}`,
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
                {b.quantity} · {b.currentStage}
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
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
  operatorCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
