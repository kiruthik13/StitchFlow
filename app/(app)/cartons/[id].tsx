import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface LiveCarton {
  id: string;
  barcode: string;
  jobCode?: string;
  size?: string;
  color?: string;
  quantity?: number;
  receivedAt: string | null;
  approvedAt: string | null;
}

export default function CartonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const { cartons, sealCarton } = useDemoStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const [showSealConfirm, setShowSealConfirm] = useState(false);
  const [sealed, setSealed] = useState(false);

  const liveCartonsQuery = useQuery({
    queryKey: ['dispatch-cartons', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<LiveCarton[]>(`/packing/cartons?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  if (!isDemoMode) {
    if (liveCartonsQuery.isLoading) return <EmptyState title={t('common:loading')} />;
    const liveCarton = liveCartonsQuery.data?.find((c) => c.id === id);
    if (!liveCarton) return <EmptyState title={t('common:noData')} />;
    const statusLabel = liveCarton.approvedAt ? 'APPROVED' : liveCarton.receivedAt ? 'RECEIVED' : 'PACKED';

    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader
          title={liveCarton.barcode}
          subtitle={liveCarton.jobCode ?? ''}
          showBack
          rightEl={<StatusBadge label={statusLabel} variant={liveCarton.receivedAt ? 'success' : 'warning'} />}
        />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
          <AppCard padding={spacing[5]} style={{ marginBottom: spacing[3], borderWidth: 1, borderColor: tokens.border }}>
            <AppText variant="caption" color="secondary" uppercase center style={{ letterSpacing: 1, marginBottom: spacing[2] }}>
              {t('packing:cartonLabel')}
            </AppText>
            <AppText variant="kpi" center style={{ color: tokens.textPrimary, marginBottom: spacing[1] }}>
              {liveCarton.barcode}
            </AppText>
            <AppText variant="body" center bold>
              {`${liveCarton.size ?? '-'} · ${liveCarton.color ?? '-'} · ${liveCarton.quantity ?? 0}`}
            </AppText>
          </AppCard>
          <AppButton
            title={t('common:share')}
            onPress={() => void Share.share({ title: liveCarton.barcode, message: `${liveCarton.barcode} | ${liveCarton.jobCode ?? ''} | ${liveCarton.size ?? ''} | ${liveCarton.color ?? ''} | QTY ${liveCarton.quantity ?? 0}` })}
          />
        </ScrollView>
      </View>
    );
  }

  const carton = cartons.find((c) => c.id === id);
  if (!carton) return <EmptyState title={t('common:noData')} />;

  const handleSeal = () => {
    sealCarton(carton.id);
    setShowSealConfirm(false);
    setSealed(true);
  };

  const isSealed = carton.status === 'sealed' || sealed;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={carton.cartonCode}
        subtitle={`${carton.styleName} · ${carton.color} · ${carton.size}`}
        showBack
        rightEl={<StatusBadge label={isSealed ? 'SEALED' : 'OPEN'} variant={isSealed ? 'success' : 'warning'} />}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[5]} style={{ marginBottom: spacing[3], borderWidth: 2, borderColor: isSealed ? tokens.success : tokens.border }}>
          <AppText variant="caption" color="secondary" uppercase center style={{ letterSpacing: 1, marginBottom: spacing[2] }}>
            {t('packing:cartonLabel')}
          </AppText>
          <AppText variant="kpi" center style={{ color: tokens.textPrimary, marginBottom: spacing[1] }}>
            {carton.cartonCode}
          </AppText>
          <AppText variant="body" center bold style={{ marginBottom: spacing[2] }}>
            {carton.styleName}
          </AppText>
          <View style={styles.labelRow}>
            <AppText variant="bodySmall" color="secondary">{carton.color} · {carton.size} · {carton.quantity}</AppText>
          </View>
        </AppCard>

        {!isSealed && (
          <AppButton title={t('packing:sealCarton')} onPress={() => setShowSealConfirm(true)} />
        )}
      </ScrollView>

      <ConfirmSheet
        visible={showSealConfirm}
        title={t('packing:sealCarton')}
        message={carton.cartonCode}
        confirmLabel={t('common:confirm')}
        onConfirm={handleSeal}
        onCancel={() => setShowSealConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  labelRow: { alignItems: 'center', marginTop: spacing[2] },
});
