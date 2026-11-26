import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

export type MasterTab =
  | 'buyers'
  | 'styles'
  | 'locations'
  | 'lines'
  | 'stages'
  | 'cutting-masters'
  | 'contacts'
  | 'ranks'
  | 'configs';

interface MasterRecord {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  phone?: string;
  specialization?: string;
  contactType?: string;
  email?: string;
  company?: string;
  levelOrder?: number;
  baseRate?: number;
  configKey?: string;
  configValue?: string;
  description?: string;
}

export function LiveMastersPanel({ tab }: { tab: MasterTab }) {
  const { t } = useTranslation(['production', 'errors', 'common', 'inventory']);
  const { user, serverPermissions } = useAuthStore();
  const factory = user?.factoryId;
  const canEdit = serverPermissions.includes('CAN_MANAGE_JOBS');
  const cache = useQueryClient();
  const key = ['live-master', user?.id, factory, tab];

  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [extraA, setExtraA] = useState('');
  const [extraB, setExtraB] = useState('');
  const [extraC, setExtraC] = useState('');
  const [extraD, setExtraD] = useState('');

  const [specStyle, setSpecStyle] = useState<string | null>(null);
  const [size, setSize] = useState('');
  const [point, setPoint] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');

  const data = useQuery({
    queryKey: key,
    enabled: !!factory && tab !== 'stages',
    queryFn: async () => {
      if (tab === 'lines') {
        return (await apiRequest<{ lines: MasterRecord[] }>(`/factories/${encodeURIComponent(factory!)}/hierarchy`)).lines;
      }
      return apiRequest<MasterRecord[]>(`/masters/${tab}?factoryId=${encodeURIComponent(factory!)}`);
    },
  });

  const buildPayload = () => {
    if (tab === 'configs') {
      return {
        factoryId: factory,
        configKey: code.trim(),
        configValue: name.trim(),
        description: extraA.trim() || undefined,
      };
    }
    const base: Record<string, unknown> = {
      ...(editing === 'new' ? { factoryId: factory } : {}),
      code: code.trim(),
      name: name.trim(),
      ...(editing !== 'new' && tab !== 'locations' ? { isActive: active } : {}),
    };
    if (tab === 'cutting-masters') {
      base.phone = extraA.trim() || undefined;
      base.specialization = extraB.trim() || undefined;
    } else if (tab === 'contacts') {
      base.contactType = extraA.trim() || 'other';
      base.phone = extraB.trim() || undefined;
      base.email = extraC.trim() || undefined;
      base.company = extraD.trim() || undefined;
    } else if (tab === 'ranks') {
      base.levelOrder = Number(extraA) || 1;
      base.baseRate = Number(extraB) || 0;
    }
    return base;
  };

  const save = useMutation({
    mutationFn: () => {
      if (tab === 'configs') {
        return apiRequest('/masters/configs', { method: 'PUT', body: JSON.stringify(buildPayload()) });
      }
      return apiRequest(editing === 'new' ? `/masters/${tab}` : `/masters/${tab}/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: JSON.stringify(buildPayload()),
      });
    },
    onSuccess: () => {
      setEditing(null);
      void cache.invalidateQueries({ queryKey: key });
      void cache.invalidateQueries({ queryKey: ['job-form', user?.id, factory] });
      void cache.invalidateQueries({ queryKey: ['cut-stock-options', user?.id, factory] });
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const spec = useMutation({
    mutationFn: () => apiRequest(`/masters/styles/${specStyle}/measurement-specs`, {
      method: 'POST',
      body: JSON.stringify({
        size: size.trim(),
        point: point.trim(),
        minimumMm: Number(minimum),
        maximumMm: Number(maximum),
      }),
    }),
    onSuccess: () => {
      setSpecStyle(null);
      setSize('');
      setPoint('');
      setMinimum('');
      setMaximum('');
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  if (!factory) return <AppText>{t('errors:unauthorized')}</AppText>;
  if (tab === 'stages') return <AppText>{t('production:routeSetup')}</AppText>;

  const beginEdit = (item?: MasterRecord) => {
    setEditing(item?.id ?? 'new');
    if (tab === 'configs') {
      setCode(item?.configKey ?? '');
      setName(item?.configValue ?? '');
      setExtraA(item?.description ?? '');
      setExtraB('');
    } else {
      setCode(item?.code ?? '');
      setName(item?.name ?? '');
      setActive(item?.isActive !== false);
      if (tab === 'cutting-masters') {
        setExtraA(item?.phone ?? '');
        setExtraB(item?.specialization ?? '');
      } else if (tab === 'contacts') {
        setExtraA(item?.contactType ?? 'other');
        setExtraB(item?.phone ?? '');
        setExtraC(item?.email ?? '');
        setExtraD(item?.company ?? '');
      } else if (tab === 'ranks') {
        setExtraA(item?.levelOrder ? String(item.levelOrder) : '1');
        setExtraB(item?.baseRate !== undefined ? String(item.baseRate) : '0');
      } else {
        setExtraA('');
        setExtraB('');
      }
    }
  };

  return (
    <View style={{ gap: spacing[3] }}>
      {canEdit && tab !== 'lines' && (
        <AppButton title={t('production:addMasterRecord')} onPress={() => beginEdit()} />
      )}

      {editing && (
        <AppCard padding={spacing[3]}>
          <AppInput
            label={tab === 'configs' ? t('production:configKeyLabel') : t('production:masterRecordCode')}
            value={code}
            onChangeText={setCode}
          />
          <AppInput
            label={tab === 'configs' ? t('production:configValueLabel') : t('production:masterRecordName')}
            value={name}
            onChangeText={setName}
          />

          {tab === 'configs' && (
            <AppInput label={t('production:descriptionLabel')} value={extraA} onChangeText={setExtraA} />
          )}

          {tab === 'cutting-masters' && (
            <>
              <AppInput label={t('production:phoneLabel')} value={extraA} onChangeText={setExtraA} />
              <AppInput label={t('production:specializationLabel')} value={extraB} onChangeText={setExtraB} />
            </>
          )}

          {tab === 'contacts' && (
            <>
              <AppInput label={t('production:contactTypeLabel')} value={extraA} onChangeText={setExtraA} placeholder="buyer | supplier | logistics | internal | other" />
              <AppInput label={t('production:phoneLabel')} value={extraB} onChangeText={setExtraB} />
              <AppInput label={t('production:emailLabel')} value={extraC} onChangeText={setExtraC} />
              <AppInput label={t('production:companyLabel')} value={extraD} onChangeText={setExtraD} />
            </>
          )}

          {tab === 'ranks' && (
            <>
              <AppInput label={t('production:levelOrderLabel')} value={extraA} onChangeText={setExtraA} keyboardType="number-pad" />
              <AppInput label={t('production:baseRateLabel')} value={extraB} onChangeText={setExtraB} keyboardType="decimal-pad" />
            </>
          )}

          {editing !== 'new' && tab !== 'locations' && tab !== 'configs' && (
            <AppButton
              title={t(active ? 'common:active' : 'production:inactiveMaster')}
              variant="outline"
              onPress={() => setActive(value => !value)}
            />
          )}

          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <View style={{ flex: 1 }}>
              <AppButton
                title={t('common:confirm')}
                disabled={save.isPending || !code.trim() || !name.trim()}
                onPress={() => save.mutate()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title={t('common:cancel')} variant="outline" onPress={() => setEditing(null)} />
            </View>
          </View>
        </AppCard>
      )}

      {data.isLoading && <AppText>{t('common:loading')}</AppText>}
      {data.isError && <AppButton title={t('common:refresh')} onPress={() => void data.refetch()} />}

      {data.data?.map(item => (
        <AppCard key={item.id} padding={spacing[3]}>
          <AppText variant="h4" bold>{tab === 'configs' ? item.configKey : item.name}</AppText>
          <AppText variant="code">{tab === 'configs' ? item.configValue : item.code}</AppText>
          {tab === 'cutting-masters' && (item.specialization || item.phone) && (
            <AppText variant="caption" color="secondary">
              {[item.specialization, item.phone].filter(Boolean).join(' · ')}
            </AppText>
          )}
          {tab === 'contacts' && (
            <AppText variant="caption" color="secondary">
              {[item.contactType, item.company, item.phone, item.email].filter(Boolean).join(' · ')}
            </AppText>
          )}
          {tab === 'ranks' && (
            <AppText variant="caption" color="secondary">
              {`L${item.levelOrder ?? 1} · ${item.baseRate ?? 0}`}
            </AppText>
          )}
          {tab === 'configs' && item.description && (
            <AppText variant="caption" color="secondary">{item.description}</AppText>
          )}
          {item.isActive === false && <AppText variant="caption">{t('production:inactiveMaster')}</AppText>}

          {canEdit && tab !== 'lines' && (
            <AppButton
              title={t('production:editMasterRecord')}
              size="sm"
              variant="outline"
              onPress={() => beginEdit(item)}
            />
          )}

          {canEdit && tab === 'styles' && item.isActive && (
            <AppButton
              title={t('production:addMeasurementSpec')}
              size="sm"
              variant="outline"
              onPress={() => {
                setSpecStyle(item.id);
                setSize('');
                setPoint('');
                setMinimum('');
                setMaximum('');
              }}
            />
          )}

          {specStyle === item.id && (
            <>
              <AppInput label={t('production:jobSizes')} value={size} onChangeText={setSize} />
              <AppInput label={t('production:measurementPoint')} value={point} onChangeText={setPoint} />
              <AppInput label={t('production:measurementMinimum')} value={minimum} onChangeText={setMinimum} keyboardType="decimal-pad" />
              <AppInput label={t('production:measurementMaximum')} value={maximum} onChangeText={setMaximum} keyboardType="decimal-pad" />
              <AppButton
                title={t('common:confirm')}
                disabled={
                  spec.isPending || !size.trim() || !point.trim() ||
                  !minimum.trim() || !maximum.trim() ||
                  !Number.isFinite(Number(minimum)) || !Number.isFinite(Number(maximum)) ||
                  Number(minimum) < 0 || Number(maximum) < Number(minimum)
                }
                onPress={() => spec.mutate()}
              />
            </>
          )}
        </AppCard>
      ))}
    </View>
  );
}
