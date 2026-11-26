import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { ApiError, apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

type Action = 'inspect' | 'reinspect' | 'rework' | 'release' | 'pack';
type Field = 'passed' | 'rejected' | 'rework' | 'held' | 'fromRework' | 'fromHold' | 'quantity';
interface Balance {
  requestId: string;
  duty: 'qc' | 'rework' | 'packing';
  ready: boolean;
  quantity: number;
  inspected: number;
  passed: number;
  rejected: number;
  rework: number;
  reworked: number;
  held: number;
  released: number;
  packed: number;
}
const paths: Record<Action, string> = {
  inspect: '/quality/inspections', reinspect: '/quality/reinspections', rework: '/rework/complete',
  release: '/quality/releases', pack: '/cartons',
};
const disposition = ['passed', 'rejected', 'rework', 'held'] as const;

export function BundleDutyPanel({ bundleId }: { bundleId: string }) {
  const { t } = useTranslation(['common', 'errors', 'production']);
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<Field, string>>>({});
  const [carton, setCarton] = useState<string | null>(null);
  const key = ['bundle-duty', user?.id, bundleId];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await apiRequest<Balance>(`/quality/bundles/${encodeURIComponent(bundleId)}`);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 403) return null;
        throw error;
      }
    },
    enabled: !!user && ['operator', 'qc-inspector', 'packing-staff'].includes(user.role),
    staleTime: 0,
  });
  const submit = useMutation({
    mutationFn: ({ selected, body }: { selected: Action; body: object }) =>
      apiRequest<{ barcode?: string }>(paths[selected], { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: result => {
      setCarton(result.barcode ?? null);
      setAction(null);
      setRequestId(null);
      setFields({});
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['job', user?.id] });
    },
    onError: error => Alert.alert(t(error instanceof ApiError && error.statusCode === 0 ? 'errors:networkError' : 'errors:serverError')),
  });
  const balance = query.data;
  if (!balance && !query.isError) return null;
  if (query.isError) return <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />;
  if (!balance) return null;

  const options: Action[] = [];
  if (balance.ready) {
    if (balance.duty === 'qc') {
      if (balance.inspected < balance.quantity) options.push('inspect');
      if (balance.reworked || balance.held) options.push('reinspect');
      if (balance.passed > balance.released) options.push('release');
    }
    if (balance.duty === 'rework' && balance.rework > balance.reworked) options.push('rework');
    if (balance.duty === 'packing' && balance.released > balance.packed) options.push('pack');
  }
  const label = (part: Action | Field) => t(`production:bundleWorkflow_${part}`);
  const required: readonly Field[] = action === 'inspect' ? disposition
    : action === 'reinspect' ? [...disposition, 'fromRework', 'fromHold'] : ['quantity'];

  const confirm = () => {
    if (!requestId || !action || !options.includes(action) || submit.isPending || query.isFetching) return;
    const quantities = Object.fromEntries(required.map(field => [field, Number(fields[field] ?? '')]));
    if (Object.values(quantities).some(value => !Number.isInteger(value) || value < 0 || value > 100000000)
      || ('quantity' in quantities && !quantities.quantity)
      || (!('quantity' in quantities) && disposition.every(field => !quantities[field]))) {
      Alert.alert(t('errors:validationError'));
      return;
    }
    Alert.alert(label(action), t('common:confirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('common:confirm'), onPress: () => submit.mutate({
        selected: action, body: { bundleId, requestId, ...quantities },
      }) },
    ]);
  };

  return (
    <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
      <AppText variant="bodySmall">{label('passed')}: {balance.passed} · {label('release')}: {balance.released}</AppText>
      {!!carton && <AppText variant="code">{carton}</AppText>}
      <AppButton title={t('common:refresh')} size="sm" variant="outline" onPress={() => void query.refetch()} disabled={submit.isPending} />
      {options.map(item => <AppButton key={item} title={label(item)} size="sm" variant="outline"
        disabled={submit.isPending} onPress={() => { setAction(item); setRequestId(balance.requestId); setFields({}); }} />)}
      {action && options.includes(action) && <>
        {required.map(field => <AppInput key={field} label={label(field)} value={fields[field] ?? ''}
          onChangeText={value => setFields(current => ({ ...current, [field]: value }))} keyboardType="numeric" />)}
        <AppButton title={t('common:confirm')} disabled={submit.isPending || query.isFetching} onPress={confirm} />
      </>}
    </View>
  );
}
