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
import {
  DetailField,
  SectionHeader,
  StructuredRecordCard,
} from '../../../src/design-system/components/StructuredRecordCard';
import { radii } from '../../../src/design-system/tokens/radii';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatDateTime, formatQuantity } from '../../../src/utils/formatters';

interface LiveCarton {
  id: string;
  barcode: string;
  jobCode?: string;
  styleName?: string;
  buyerName?: string;
  factoryName?: string;
  bundleCode?: string;
  size?: string;
  color?: string;
  quantity?: number;
  packedByName?: string;
  createdAt?: string | null;
  receivedAt: string | null;
  approvedAt: string | null;
  dispatchedAt?: string | null;
  gatePass?: string | null;
}

const BAR_WIDTHS = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 4, 1, 2];

function BarcodeStrip({ code, color }: { code: string; color: string }) {
  return (
    <View style={styles.barcodeWrap}>
      <View style={styles.barsRow}>
        {BAR_WIDTHS.map((w, idx) => (
          <View
            key={idx}
            style={{
              width: w,
              height: 44,
              backgroundColor: idx % 2 === 0 ? color : 'transparent',
              marginHorizontal: 1,
            }}
          />
        ))}
      </View>
      <AppText variant="code" mono bold center style={{ letterSpacing: 1.5, marginTop: spacing[1.5], color }}>
        {code}
      </AppText>
    </View>
  );
}

function formatCartonShareText(data: {
  barcode: string;
  status: string;
  jobCode?: string;
  styleName?: string;
  buyerName?: string;
  factoryName?: string;
  bundleCode?: string;
  size?: string;
  color?: string;
  quantity: number;
  packedBy?: string;
  gatePass?: string | null;
}) {
  return [
    'StitchFlow — Export Carton Label',
    `Carton Barcode : ${data.barcode}`,
    `Status         : ${data.status}`,
    `Work Order     : ${data.jobCode || '—'}`,
    `Style          : ${data.styleName || '—'}`,
    ...(data.buyerName ? [`Buyer          : ${data.buyerName}`] : []),
    ...(data.factoryName ? [`Factory        : ${data.factoryName}`] : []),
    ...(data.bundleCode ? [`Source Bundle  : ${data.bundleCode}`] : []),
    `Size / Color   : ${data.size || '—'} / ${data.color || '—'}`,
    `Net Quantity   : ${formatQuantity(data.quantity)}`,
    ...(data.packedBy ? [`Packed By      : ${data.packedBy}`] : []),
    ...(data.gatePass ? [`Gate Pass      : ${data.gatePass}`] : []),
  ].join('\n');
}

export default function CartonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const { cartons, sealCarton } = useDemoStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common', 'inventory']);
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

    const statusInfo = liveCarton.dispatchedAt
      ? { label: 'DISPATCHED', variant: 'success' as const }
      : liveCarton.approvedAt
      ? { label: 'APPROVED FOR DISPATCH', variant: 'brand' as const }
      : liveCarton.receivedAt
      ? { label: 'RECEIVED IN STORE', variant: 'info' as const }
      : { label: 'PACKED', variant: 'warning' as const };

    const specFields: DetailField[] = [
      { label: t('common:job'), value: liveCarton.jobCode || '—', mono: true },
      { label: t('common:style'), value: liveCarton.styleName || '—' },
      { label: t('common:size'), value: liveCarton.size || '—' },
      { label: t('common:color'), value: liveCarton.color || '—' },
      { label: t('common:quantity'), value: formatQuantity(liveCarton.quantity ?? 0), mono: true, tone: 'brand' },
      { label: t('common:bundle'), value: liveCarton.bundleCode || '—', mono: true },
    ];
    if (liveCarton.buyerName) {
      specFields.push({ label: 'Buyer', value: liveCarton.buyerName });
    }
    if (liveCarton.factoryName) {
      specFields.push({ label: t('common:factory'), value: liveCarton.factoryName });
    }
    if (liveCarton.packedByName) {
      specFields.push({ label: 'Packed By', value: liveCarton.packedByName, fullWidth: true });
    }

    const timelineFields: DetailField[] = [
      { label: 'Packed At', value: formatDateTime(liveCarton.createdAt), fullWidth: true },
      { label: 'Store Received', value: formatDateTime(liveCarton.receivedAt), fullWidth: true },
      { label: 'Dispatch Approved', value: formatDateTime(liveCarton.approvedAt), fullWidth: true },
      { label: 'Dispatched At', value: formatDateTime(liveCarton.dispatchedAt), fullWidth: true },
    ];

    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader
          title={liveCarton.barcode}
          subtitle={liveCarton.styleName || liveCarton.jobCode || t('packing:cartonLabel')}
          showBack
          rightEl={<StatusBadge label={statusInfo.label} variant={statusInfo.variant} size="sm" dot />}
        />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
          {/* Industrial Carton Label Header + Barcode */}
          <AppCard padding={spacing[4]} style={{ borderWidth: 1.5, borderColor: tokens.brand }}>
            <View style={styles.labelTopRow}>
              <AppText variant="caption" bold uppercase style={{ color: tokens.brand, letterSpacing: 1 }}>
                STITCHFLOW · {t('packing:cartonLabel')}
              </AppText>
              <StatusBadge label={statusInfo.label} variant={statusInfo.variant} size="sm" />
            </View>
            <View style={[styles.divider, { backgroundColor: tokens.border }]} />
            <BarcodeStrip code={liveCarton.barcode} color={tokens.textPrimary} />
          </AppCard>

          <SectionHeader title="Carton Specifications" />
          <StructuredRecordCard
            code={liveCarton.jobCode}
            title={liveCarton.styleName || liveCarton.jobCode || liveCarton.barcode}
            subtitle={liveCarton.factoryName}
            status={{ label: formatQuantity(liveCarton.quantity ?? 0), variant: 'brand' }}
            fields={specFields}
            highlight={
              liveCarton.gatePass
                ? { label: t('inventory:gatePass'), value: liveCarton.gatePass, mono: true, tone: 'success' }
                : undefined
            }
          />

          <SectionHeader title="Handover & Dispatch Timeline" />
          <StructuredRecordCard
            title="Lifecycle Audit Trail"
            status={{ label: statusInfo.label, variant: statusInfo.variant, dot: true }}
            fields={timelineFields}
          />

          <AppButton
            title={t('common:share')}
            onPress={() =>
              void Share.share({
                title: `Carton Label · ${liveCarton.barcode}`,
                message: formatCartonShareText({
                  barcode: liveCarton.barcode,
                  status: statusInfo.label,
                  jobCode: liveCarton.jobCode,
                  styleName: liveCarton.styleName,
                  buyerName: liveCarton.buyerName,
                  factoryName: liveCarton.factoryName,
                  bundleCode: liveCarton.bundleCode,
                  size: liveCarton.size,
                  color: liveCarton.color,
                  quantity: liveCarton.quantity ?? 0,
                  packedBy: liveCarton.packedByName,
                  gatePass: liveCarton.gatePass,
                }),
              })
            }
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
  const demoStatus = isSealed ? 'SEALED' : 'OPEN';

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={carton.cartonCode}
        subtitle={`${carton.styleName} · ${carton.color} · ${carton.size}`}
        showBack
        rightEl={<StatusBadge label={demoStatus} variant={isSealed ? 'success' : 'warning'} size="sm" dot />}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8], gap: spacing[3] }]}>
        <AppCard padding={spacing[4]} style={{ borderWidth: 1.5, borderColor: isSealed ? tokens.success : tokens.brand }}>
          <View style={styles.labelTopRow}>
            <AppText variant="caption" bold uppercase style={{ color: tokens.brand, letterSpacing: 1 }}>
              STITCHFLOW · {t('packing:cartonLabel')}
            </AppText>
            <StatusBadge label={demoStatus} variant={isSealed ? 'success' : 'warning'} size="sm" />
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.border }]} />
          <BarcodeStrip code={carton.cartonCode} color={tokens.textPrimary} />
        </AppCard>

        <SectionHeader title="Carton Specifications" />
        <StructuredRecordCard
          code={carton.jobCode}
          title={carton.styleName}
          status={{ label: formatQuantity(carton.quantity), variant: 'brand' }}
          fields={[
            { label: t('common:job'), value: carton.jobCode, mono: true },
            { label: t('common:style'), value: carton.styleName },
            { label: t('common:size'), value: carton.size },
            { label: t('common:color'), value: carton.color },
            { label: t('common:quantity'), value: formatQuantity(carton.quantity), mono: true, tone: 'brand' },
            { label: 'Packed By', value: carton.packedBy },
          ]}
        />

        <AppButton
          title={t('common:share')}
          variant="outline"
          onPress={() =>
            void Share.share({
              title: `Carton Label · ${carton.cartonCode}`,
              message: formatCartonShareText({
                barcode: carton.cartonCode,
                status: demoStatus,
                jobCode: carton.jobCode,
                styleName: carton.styleName,
                size: carton.size,
                color: carton.color,
                quantity: carton.quantity,
                packedBy: carton.packedBy,
              }),
            })
          }
        />

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
  labelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
    opacity: 0.7,
  },
  barcodeWrap: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: radii.md,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
