import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppText } from '../../../src/design-system/components/AppText';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

interface PassportResponse {
  passport: {
    id: string;
    barcodeValue: string;
    jobCode: string;
    buyerName?: string | null;
    styleName?: string | null;
    size: string;
    color: string;
    originalQuantity: number;
    currentAvailableQuantity: number;
    factoryName?: string | null;
    unitName?: string | null;
    lineName?: string | null;
    previousOperation?: string | null;
    nextEligibleOperation?: string | null;
    qcStatus: string;
    packingStatus: string;
    dispatchStatus: string;
  };
  timeline: Array<{
    id: string;
    operation: string;
    actorName?: string | null;
    actorRole?: string | null;
    timestamp: string;
  }>;
}

export default function GarmentPassportScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useThemeStore();
  const { isDemoMode } = useAuthStore();
  const { t } = useTranslation(['common', 'production']);

  const query = useQuery({
    queryKey: ['bundle-passport', bundleId],
    enabled: !isDemoMode && !!bundleId,
    queryFn: () => apiRequest<PassportResponse>(`/bundles/${bundleId}/passport`),
  });

  const p = query.data?.passport;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:digitalPassport', { defaultValue: 'Digital Garment Passport' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}>
        {!bundleId || isDemoMode ? (
          <EmptyState title={t('common:noData')} />
        ) : query.isLoading ? (
          <AppText>{t('common:loading')}</AppText>
        ) : !p ? (
          <EmptyState title={t('common:noData')} />
        ) : (
          <>
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppText variant="h4" bold mono>{p.barcodeValue}</AppText>
              <AppText variant="bodySmall" color="secondary">
                {p.jobCode} · {p.buyerName ?? '—'} · {p.styleName ?? '—'}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                {p.size} · {p.color} · {p.currentAvailableQuantity}/{p.originalQuantity} pcs
              </AppText>
              <View style={styles.badgeRow}>
                <StatusBadge label={`QC: ${p.qcStatus.toUpperCase()}`} variant="brand" size="sm" />
                <StatusBadge label={`PACK: ${p.packingStatus.toUpperCase()}`} variant="info" size="sm" />
                <StatusBadge label={`DISP: ${p.dispatchStatus.toUpperCase()}`} variant="success" size="sm" />
              </View>
            </AppCard>
            <AppCard padding={spacing[4]}>
              <AppText variant="label" bold style={{ marginBottom: spacing[2] }}>
                {t('production:lifecycleTimeline', { defaultValue: 'Lifecycle Timeline' })}
              </AppText>
              {query.data?.timeline.map((ev) => (
                <View key={ev.id} style={[styles.eventRow, { borderBottomColor: tokens.border }]}>
                  <AppText variant="label">{ev.operation}</AppText>
                  <AppText variant="caption" color="secondary">
                    {ev.actorName ?? 'System'} ({ev.actorRole ?? '—'}) · {new Date(ev.timestamp).toLocaleString()}
                  </AppText>
                </View>
              ))}
            </AppCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] },
  eventRow: { paddingVertical: spacing[2], borderBottomWidth: StyleSheet.hairlineWidth },
});
