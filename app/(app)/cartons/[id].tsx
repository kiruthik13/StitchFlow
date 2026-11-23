import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function CartonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useThemeStore();
  const { cartons, sealCarton, createCarton } = useDemoStore();
  const insets = useSafeAreaInsets();
  const [showSealConfirm, setShowSealConfirm] = useState(false);
  const [sealed, setSealed] = useState(false);

  const carton = cartons.find((c) => c.id === id);
  if (!carton) return <EmptyState title="Carton not found" />;

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
        rightEl={
          <StatusBadge
            label={isSealed ? 'SEALED' : 'OPEN'}
            variant={isSealed ? 'success' : 'warning'}
          />
        }
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>

        {/* Carton label preview */}
        <AppCard padding={spacing[5]} style={{ marginBottom: spacing[3], borderWidth: 2, borderColor: isSealed ? tokens.success : tokens.border }}>
          <AppText variant="caption" color="secondary" uppercase center style={{ letterSpacing: 1, marginBottom: spacing[2] }}>
            Carton Label
          </AppText>
          <AppText variant="kpi" center style={{ color: tokens.textPrimary, marginBottom: spacing[1] }}>
            {carton.cartonCode}
          </AppText>
          <AppText variant="body" center bold style={{ marginBottom: spacing[2] }}>
            {carton.styleName}
          </AppText>
          <View style={styles.labelRow}>
            <LabelCell label="Color" value={carton.color} />
            <LabelCell label="Size" value={carton.size} />
            <LabelCell label="Qty" value={String(carton.quantity)} />
          </View>
          <View style={[styles.labelRow, { marginTop: spacing[2], borderTopColor: tokens.border }]}>
            <LabelCell label="Job" value={carton.jobCode} mono />
            <LabelCell label="Packed By" value={carton.packedBy} />
            <LabelCell label="Date" value={carton.createdAt} />
          </View>

          {/* Barcode placeholder */}
          <View style={[styles.barcodePlaceholder, { borderColor: tokens.border }]}>
            <AppText variant="caption" color="secondary" center>
              ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
            </AppText>
            <AppText variant="codeSmall" mono center style={{ marginTop: 2 }}>
              {carton.cartonCode}
            </AppText>
          </View>
        </AppCard>

        {/* Details */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <Row label="Carton Code" value={carton.cartonCode} mono />
          <Row label="Job" value={carton.jobCode} mono />
          <Row label="Style" value={carton.styleName} />
          <Row label="Color" value={carton.color} />
          <Row label="Size" value={carton.size} />
          <Row label="Quantity" value={`${carton.quantity} pcs`} mono />
          <Row label="Packed By" value={carton.packedBy} />
          <Row label="Created" value={carton.createdAt} />
          <Row label="Status" value={isSealed ? 'Sealed' : 'Open'} isLast />
        </AppCard>

        {/* Seal action */}
        {!isSealed && (
          <AppButton
            title="🔒 Seal Carton"
            size="lg"
            fullWidth
            style={{ marginBottom: spacing[2] }}
            onPress={() => setShowSealConfirm(true)}
          />
        )}

        {isSealed && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3], alignItems: 'center' }}>
            <AppText style={{ fontSize: 32, marginBottom: spacing[2] }}>📦</AppText>
            <AppText variant="h4" bold center style={{ color: tokens.success }}>Carton Sealed</AppText>
            <AppText variant="caption" color="secondary" center>Ready for store handover and dispatch.</AppText>
          </AppCard>
        )}

      </ScrollView>

      <ConfirmSheet
        visible={showSealConfirm}
        title="Seal Carton"
        message={`Seal carton ${carton.cartonCode} with ${carton.quantity} pcs? This action cannot be undone.`}
        confirmLabel="Seal Carton"
        onConfirm={handleSeal}
        onCancel={() => setShowSealConfirm(false)}
      />
    </View>
  );
}

function LabelCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { tokens } = useThemeStore();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono={mono} style={{ color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function Row({ label, value, mono = false, isLast = false }: { label: string; value: string; mono?: boolean; isLast?: boolean }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={{ width: 90 }}>{label}</AppText>
      <AppText variant="label" mono={mono} style={{ flex: 1, color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  labelRow: { flexDirection: 'row', paddingTop: spacing[2] },
  barcodePlaceholder: { borderWidth: 1, borderRadius: 4, padding: spacing[3], marginTop: spacing[3], alignItems: 'center' },
  row: { flexDirection: 'row', paddingVertical: spacing[2] },
});
