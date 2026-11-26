import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import { BUYERS, STYLES, LINES } from '../../../src/fixtures/mockData';

interface MasterOption { id: string; name: string; code: string; isActive?: boolean }

export default function CreateJobScreen() {
  const router = useRouter();
  const { tokens } = useThemeStore();
  const { t } = useTranslation('production');
  const { t: tc } = useTranslation('common');
  const { addJob } = useDemoStore();
  const { user, isDemoMode, serverPermissions } = useAuthStore();
  const factory = user?.factoryId;
  const canCreate = serverPermissions.includes('CAN_MANAGE_JOBS');
  const queryClient = useQueryClient();
  const encodedFactory = encodeURIComponent(factory ?? '');
  const masters = useQuery({
    queryKey: ['job-form', user?.id, factory],
    enabled: !isDemoMode && canCreate && !!factory,
    queryFn: async () => {
      const [buyers, styles, hierarchy] = await Promise.all([
        apiRequest<MasterOption[]>(`/masters/buyers?factoryId=${encodedFactory}`),
        apiRequest<MasterOption[]>(`/masters/styles?factoryId=${encodedFactory}`),
        apiRequest<{ lines: MasterOption[] }>(`/factories/${encodedFactory}/hierarchy`),
      ]);
      return { buyers: buyers.filter(item => item.isActive), styles: styles.filter(item => item.isActive), lines: hierarchy.lines };
    },
  });
  const buyers = isDemoMode ? BUYERS : masters.data?.buyers ?? [];
  const garmentStyles = isDemoMode ? STYLES : masters.data?.styles ?? [];
  const lines = isDemoMode ? LINES : masters.data?.lines ?? [];

  const [jobNumber, setJobNumber] = useState(() => isDemoMode ? `JOB-${Math.floor(1000 + Math.random() * 9000)}` : '');
  const [buyerId, setBuyerId] = useState(isDemoMode ? BUYERS[0].id : '');
  const [styleId, setStyleId] = useState(isDemoMode ? STYLES[0].id : '');
  const [lineId, setLineId] = useState(isDemoMode ? LINES[0].id : '');
  const [targetQuantity, setTargetQuantity] = useState(isDemoMode ? '500' : '');
  const [sam, setSam] = useState(isDemoMode ? '18.5' : '');
  const [targetDate, setTargetDate] = useState(isDemoMode ? '2026-12-05' : '');
  const [startDate, setStartDate] = useState('');
  const [colorInput, setColors] = useState('');
  const [variantInput, setVariants] = useState('');
  const [sizeInput, setSizes] = useState('');
  const { t: te } = useTranslation('errors');
  const mutation = useMutation({
    mutationFn: (body: object) => apiRequest<{ id: string }>('/jobs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
      router.replace(`/(app)/jobs/${id}`);
    },
    onError: () => Alert.alert(te('serverError')),
  });

  const handleCreate = () => {
    const qty = Number(targetQuantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100000000) {
      Alert.alert(te('validationError'));
      return;
    }
    if (!isDemoMode) {
      const split = (text: string) => [...new Set(text.split(',').map(value => value.trim()).filter(Boolean))];
      const sizes = split(sizeInput);
      const colors = split(colorInput);
      if (mutation.isPending || !canCreate || !factory) return;
      if (!jobNumber.trim() || !buyers.some(b => b.id === buyerId) || !garmentStyles.some(s => s.id === styleId)
        || !lines.some(l => l.id === lineId) || !startDate || !targetDate || !sizes.length || !colors.length) {
        Alert.alert(te('validationError'));
        return;
      }
      const variantRows = variantInput.split(/\r?\n/).filter(row => row.trim());
      const items = variantRows.map(row => {
        const [size, color, amount, extra] = row.split(',').map(value => value.trim());
        return { size, color, quantity: Number(amount), extra };
      });
      if (items.length && (items.some(item => item.extra !== undefined || !sizes.includes(item.size)
        || !colors.includes(item.color) || !Number.isInteger(item.quantity) || item.quantity <= 0)
        || items.reduce((total, item) => total + item.quantity, 0) !== qty)) {
        Alert.alert(te('validationError'));
        return;
      }
      mutation.mutate({ factoryId: factory, jobCode: jobNumber.trim(), buyerId, styleId, lineId,
        orderQuantity: qty, startDate, targetDate, sizes, colors,
        ...(items.length ? { items: items.map(({ size, color, quantity }) => ({ size, color, quantity })) } : {}) });
      return;
    }

    const selectedBuyer = BUYERS.find((b) => b.id === buyerId) || BUYERS[0];
    const selectedStyle = STYLES.find((s) => s.id === styleId) || STYLES[0];
    const selectedLine = LINES.find((l) => l.id === lineId) || LINES[0];
    addJob({
      jobNumber, buyerName: selectedBuyer.name, styleName: selectedStyle.name, lineName: selectedLine.name,
      targetQuantity: qty, completedQuantity: 0, sam: parseFloat(sam) || 18.5, targetDate, status: 'active',
    });
    Alert.alert('Job Created', `Job ${jobNumber} successfully queued for production.`,
      [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('createJob') || 'Create Production Job'} showBack onBack={() => router.back()} />

      {!isDemoMode && (!canCreate || !factory || masters.isLoading || masters.isError) && (
        <AppText variant="body" style={{ margin: spacing[4] }}>
          {!canCreate || !factory ? te('unauthorized') : masters.isError ? te('serverError') : tc('loading')}
        </AppText>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Job Specifications
          </AppText>

          <AppInput
            label="Job Number"
            value={jobNumber}
            onChangeText={setJobNumber}
            style={styles.input}
          />

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Select Buyer
          </AppText>
          <View style={styles.chipRow}>
            {buyers.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => setBuyerId(b.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: buyerId === b.id ? tokens.brand : tokens.border,
                    backgroundColor: buyerId === b.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={buyerId === b.id ? 'brand' : 'secondary'}
                  style={buyerId === b.id ? styles.bold : undefined}
                >
                  {b.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Select Garment Style
          </AppText>
          <View style={styles.chipRow}>
            {garmentStyles.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setStyleId(s.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: styleId === s.id ? tokens.brand : tokens.border,
                    backgroundColor: styleId === s.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={styleId === s.id ? 'brand' : 'secondary'}
                  style={styleId === s.id ? styles.bold : undefined}
                >
                  {s.name} ({s.code})
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Target Order Quantity (Pcs)"
            value={targetQuantity}
            onChangeText={setTargetQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          {isDemoMode ? <AppInput
            label="Standard Allowed Minutes (SAM)"
            value={sam}
            onChangeText={setSam}
            keyboardType="numeric"
            style={styles.input}
          /> : <>
            <AppInput label={t('jobStartDate')} value={startDate} onChangeText={setStartDate} style={styles.input} />
            <AppInput label={t('jobColors')} value={colorInput} onChangeText={setColors} style={styles.input} />
            <AppInput label={t('jobSizes')} value={sizeInput} onChangeText={setSizes} style={styles.input} />
            <AppInput label={t('jobVariantRows')} value={variantInput} onChangeText={setVariants} multiline style={styles.input} />
          </>}

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Allocated Line
          </AppText>
          <View style={styles.chipRow}>
            {lines.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => setLineId(l.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: lineId === l.id ? tokens.brand : tokens.border,
                    backgroundColor: lineId === l.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={lineId === l.id ? 'brand' : 'secondary'}
                  style={lineId === l.id ? styles.bold : undefined}
                >
                  {l.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Target Delivery Date (YYYY-MM-DD)"
            value={targetDate}
            onChangeText={setTargetDate}
            style={styles.input}
          />

          <View style={styles.actions}>
            <AppButton
              title={isDemoMode ? t('confirmCreate') : t('saveDraftJob')}
              disabled={!isDemoMode && (!factory || !canCreate || !masters.data || mutation.isPending)}
              onPress={handleCreate}
              variant="primary"
            />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  card: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  fieldLabel: {
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  input: {
    marginTop: spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  bold: {
    fontWeight: '700',
  },
  actions: {
    marginTop: spacing[5],
  },
});
