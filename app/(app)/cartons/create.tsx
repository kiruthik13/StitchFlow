import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { JOBS, STYLES } from '../../../src/fixtures/mockData';

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['Navy', 'White', 'Black'];

export default function CreateCartonScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createCarton } = useDemoStore();
  const { t } = useTranslation(['packing', 'common']);

  const [selectedJob, setSelectedJob] = useState(JOBS[0]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedColor, setSelectedColor] = useState('Navy');
  const [quantity, setQuantity] = useState(50);

  const maxQcReleasedEligible = 180; // Standard QC release constraint

  const handleCreate = () => {
    const newCarton = createCarton({
      jobId: selectedJob.id,
      jobCode: selectedJob.jobCode,
      styleName: selectedJob.styleName,
      color: selectedColor,
      size: selectedSize,
      quantity,
      status: 'open',
      createdAt: new Date().toISOString(),
      packedBy: 'Anitha Raj (Packing)',
    });

    Alert.alert(
      'Carton Created & Barcode Ready',
      `Carton ${newCarton.cartonCode} initialized with ${quantity} pcs of ${selectedJob.styleName} (${selectedSize}, ${selectedColor}).`,
      [{ text: 'View Carton Label', onPress: () => router.replace(`/(app)/cartons/${newCarton.id}`) }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:cartonCreation')} subtitle={t('packing:packingOverview')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* QC Safeguard Banner */}
        <View style={[styles.alertCard, { backgroundColor: tokens.brandLight, borderColor: tokens.brand, marginBottom: spacing[3] }]}>
          <AppText variant="caption" bold style={{ color: tokens.brand }}>
            ✓ QC Release Verification: Maximum eligible packing = {maxQcReleasedEligible} pcs
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Never pack garments exceeding the QC-passed release authorization.
          </AppText>
        </View>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase>Production Job Order</AppText>
          <AppText variant="h3" bold style={{ marginTop: 2 }}>{selectedJob.jobCode}</AppText>
          <AppText variant="bodySmall" color="secondary">{selectedJob.styleName} · {selectedJob.buyerName}</AppText>
        </AppCard>

        {/* Size Selection */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>
            Select Garment Size
          </AppText>
          <View style={styles.chipRow}>
            {SIZES.map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => setSelectedSize(sz)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedSize === sz ? tokens.brand : tokens.surface,
                    borderColor: selectedSize === sz ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText variant="label" bold style={{ color: selectedSize === sz ? '#FFFFFF' : tokens.textPrimary }}>
                  {sz}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="caption" color="secondary" uppercase style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
            Select Colorway
          </AppText>
          <View style={styles.chipRow}>
            {COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                onPress={() => setSelectedColor(col)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedColor === col ? tokens.brand : tokens.surface,
                    borderColor: selectedColor === col ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText variant="label" bold style={{ color: selectedColor === col ? '#FFFFFF' : tokens.textPrimary }}>
                  {col}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </AppCard>

        {/* Quantity Stepper */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[4] }}>
          <QuantityStepper
            label="Carton Piece Count (Standard Export Pack)"
            value={quantity}
            min={10}
            max={maxQcReleasedEligible}
            step={10}
            onChange={setQuantity}
          />
        </AppCard>

        <AppButton title={`Generate Carton Barcode (${quantity} Pieces)`} onPress={handleCreate} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  alertCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3] },
  chipRow: { flexDirection: 'row', gap: spacing[2] },
  chip: { width: 50, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
