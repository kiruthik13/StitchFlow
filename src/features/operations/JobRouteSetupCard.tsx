import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

interface Assignment {
  id: string;
  lineId: string;
  lineName: string;
  employeeName: string;
  role: 'operator' | 'supervisor' | 'qc-inspector' | 'packing-staff';
  shift: string;
}
interface Variant { size: string; color: string; remaining: number }
interface Allocation {
  requestId: string;
  remaining: number;
  sizes: string[];
  colors: string[];
  variants: Variant[];
  bundles: { id: string; bundleCode: string; size: string; color: string; quantity: number }[];
}
interface RouteDetails {
  cuttingLineId: string;
  status: string;
  maxRejectedQuantity: number;
  steps: { id: string; stageCode: string; lineName: string; role: string }[];
}
interface DraftStep { stageCode: string; lineId: string; role: Assignment['role']; assignmentIds: string[] }
type Duty = 'qc' | 'rework' | 'packing';

const dutyRoles: Record<Duty, Assignment['role']> = { qc: 'qc-inspector', rework: 'operator', packing: 'packing-staff' };
const recognizedStage = /^[a-z][a-z0-9-]{0,31}$/;

function toggle(items: string[], id: string) {
  return items.includes(id) ? items.filter(item => item !== id) : [...items, id];
}

export function JobRouteSetupCard({ jobId, canConfigureClosing }: { jobId: string; canConfigureClosing: boolean }) {
  const { t } = useTranslation(['production', 'common', 'errors']);
  const userId = useAuthStore(state => state.user?.id);
  const cache = useQueryClient();
  const key = ['job-route', userId, jobId];
  const endpoint = `/jobs/${encodeURIComponent(jobId)}`;
  const details = useQuery({ queryKey: key, queryFn: () => apiRequest<RouteDetails>(`${endpoint}/route`) });
  const allocationKey = ['job-allocation', userId, jobId];
  const allocation = useQuery({
    queryKey: allocationKey,
    queryFn: () => apiRequest<Allocation>(`${endpoint}/bundle-allocation`),
    enabled: details.data?.status === 'active',
  });
  const [bundleSelection, setBundleSelection] = useState<{ size: string; color: string; requestId: string } | null>(null);
  const [bundleQuantity, setBundleQuantity] = useState('');
  const generate = useMutation({
    mutationFn: (selected: NonNullable<typeof bundleSelection>) => apiRequest(`${endpoint}/bundles`, {
      method: 'POST', body: JSON.stringify({ ...selected, quantity: Number(bundleQuantity) }),
    }),
    onSuccess: () => {
      setBundleSelection(null);
      setBundleQuantity('');
      void cache.invalidateQueries({ queryKey: allocationKey });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [cutting, setCutting] = useState<string[]>([]);
  const [duties, setDuties] = useState<Record<Duty, string[]>>({ qc: [], rework: [], packing: [] });
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');
  const assignments = useQuery({
    queryKey: ['job-route-assignments', userId, jobId],
    queryFn: () => apiRequest<Assignment[]>(`${endpoint}/route-assignments`),
    enabled: open && !details.data?.steps.length,
  });

  const save = useMutation({
    mutationFn: () => apiRequest(`${endpoint}/route`, {
      method: 'POST',
      body: JSON.stringify({
        steps, cuttingAssignmentIds: cutting,
        duties: (Object.keys(duties) as Duty[]).flatMap(duty => duties[duty].map(assignmentId => ({ duty, assignmentId }))),
      }),
    }),
    onSuccess: () => {
      setOpen(false);
      void cache.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const savePolicy = useMutation({
    mutationFn: () => apiRequest(`${endpoint}/close-policy`, {
      method: 'PATCH', body: JSON.stringify({ maxRejectedQuantity: Number(limit), reason: reason.trim() }),
    }),
    onSuccess: () => {
      setLimit('');
      setReason('');
      void cache.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const all = assignments.data ?? [];
  const first = all.find(item => item.id === selected[0]);
  const stageAssignments = all.filter(item => (item.role === 'operator' || item.role === 'supervisor')
    && (!first || (item.role === first.role && item.lineId === first.lineId)));
  const cuttingAssignments = all.filter(item => item.role === 'operator' && item.lineId === details.data?.cuttingLineId);
  const saveStep = () => {
    const stageCode = stage.trim();
    if (!first || !recognizedStage.test(stageCode) || steps.length >= 32) return;
    setSteps(previous => [...previous, { stageCode, lineId: first.lineId, role: first.role, assignmentIds: selected }]);
    setStage('');
    setSelected([]);
  };
  const assignmentButton = (item: Assignment, active: boolean, onPress: () => void) => (
    <AppButton key={item.id} title={`${item.employeeName} · ${item.lineName} · ${item.shift}`}
      size="sm" variant={active ? 'primary' : 'outline'} onPress={onPress} />
  );

  return (
    <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
      <View style={{ gap: spacing[2] }}>
        <AppText variant="h4" bold>{t('production:routeSetup')}</AppText>
        {details.isError && <AppButton title={t('common:refresh')} onPress={() => void details.refetch()} />}
        {details.data?.steps.map((step, index) => (
          <AppText key={step.id} variant="bodySmall">{index + 1}. {step.stageCode} · {step.lineName} · {step.role}</AppText>
        ))}
        {!open && details.data && !details.data.steps.length && ['active', 'draft'].includes(details.data.status) && (
          <AppButton title={t('production:routeSetup')} onPress={() => setOpen(true)} />
        )}
        {open && <>
          {assignments.isLoading && <AppText>{t('common:loading')}</AppText>}
          {assignments.isError && <AppButton title={t('common:refresh')} onPress={() => void assignments.refetch()} />}
          {!assignments.isLoading && !all.length && <AppText>{t('production:noRouteAssignments')}</AppText>}
          {steps.map((step, index) => (
            <View key={index} style={{ gap: spacing[1] }}>
              <AppText variant="bodySmall">{index + 1}. {step.stageCode} · {all.find(item => item.id === step.assignmentIds[0])?.lineName}</AppText>
              <AppButton title={t('production:removeRouteStep')} variant="outline" size="sm"
                onPress={() => setSteps(current => current.filter((_, idx) => idx !== index))} />
            </View>
          ))}
          <AppInput label={t('production:routeStageCode')} value={stage} onChangeText={setStage}
            autoCapitalize="none" maxLength={32} />
          {stageAssignments.map(item => assignmentButton(item, selected.includes(item.id), () => setSelected(current => toggle(current, item.id))))}
          <AppButton title={t('production:addRouteStep')} disabled={!recognizedStage.test(stage.trim()) || !first || steps.length >= 32} onPress={saveStep} />
          <AppText variant="label">{t('production:cuttingEntry')}</AppText>
          {cuttingAssignments.map(item => assignmentButton(item, cutting.includes(item.id), () => setCutting(current => toggle(current, item.id))))}
          {(['qc', 'rework', 'packing'] as const).map(duty => (
            <View key={duty} style={{ gap: spacing[1] }}>
              <AppText variant="label">{t(`production:routeDuty_${duty}`)}</AppText>
              {all.filter(item => item.role === dutyRoles[duty]).map(item => assignmentButton(item, duties[duty].includes(item.id),
                () => setDuties(current => ({ ...current, [duty]: toggle(current[duty], item.id) }))))}
            </View>
          ))}
          <AppButton title={t('production:saveJobRoute')} disabled={!steps.length || !cutting.length || Object.values(duties).some(duty => !duty.length) || save.isPending}
            onPress={() => Alert.alert(t('production:saveJobRoute'), t('production:routeCannotEdit'), [
              { text: t('common:cancel'), style: 'cancel' },
              { text: t('common:confirm'), onPress: () => save.mutate() },
            ])} />
        </>}
        {details.data?.status === 'active' && allocation.data && <>
          <AppText variant="label">{t('production:allocateBundle')} · {allocation.data.remaining}</AppText>
          {allocation.data.bundles.map(bundle => (
            <AppText key={bundle.id} variant="bodySmall">
              {bundle.bundleCode} · {bundle.size} · {bundle.color} · {bundle.quantity}
            </AppText>
          ))}
          {allocation.data.remaining > 0 && (
            allocation.data.variants.length ? allocation.data.variants
              : allocation.data.sizes.flatMap(size => allocation.data!.colors.map(color => ({
                size, color, remaining: allocation.data!.remaining,
              }))).slice(0, 400)
          ).filter(variant => variant.remaining > 0).map(variant => (
            <AppButton key={JSON.stringify([variant.size, variant.color])} size="sm"
              title={`${variant.size} · ${variant.color}`}
              variant={bundleSelection?.size === variant.size && bundleSelection.color === variant.color ? 'primary' : 'outline'}
              onPress={() => {
                if (!allocation.data || generate.isPending) return;
                setBundleSelection({ size: variant.size, color: variant.color, requestId: allocation.data.requestId });
              }} />
          ))}
          {bundleSelection && <>
            <AppInput label={t('production:enterQuantity')} value={bundleQuantity} onChangeText={setBundleQuantity} keyboardType="numeric" />
            <AppButton title={t('production:allocateBundle')}
              disabled={generate.isPending || !Number.isInteger(Number(bundleQuantity)) || Number(bundleQuantity) <= 0}
              onPress={() => generate.mutate(bundleSelection)} />
          </>}
        </>}
        {canConfigureClosing && details.data?.status === 'draft' && <>
          <AppText variant="label">{t('production:jobClosePolicy')} · {details.data.maxRejectedQuantity}</AppText>
          <AppInput label={t('production:jobRejectionAllowance')} value={limit} onChangeText={setLimit} keyboardType="numeric" />
          <AppInput label={t('production:jobRejectionReason')} value={reason} onChangeText={setReason} />
          <AppButton title={t('production:saveClosePolicy')} disabled={savePolicy.isPending || !reason.trim()
            || !limit.trim() || !Number.isInteger(Number(limit)) || Number(limit) < 0}
            onPress={() => savePolicy.mutate()} />
        </>}
      </View>
    </AppCard>
  );
}
