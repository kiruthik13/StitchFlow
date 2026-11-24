import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
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
import { validateQCReconciliation } from '../../../src/utils/qcCalculations';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function EndlineQCScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bundles } = useDemoStore();
  const { t } = useTranslation(['quality', 'common']);

  const bundle = bundles[0];
  const totalInspected = 200;
  const [passedQty, setPassedQty] = useState(180);
  const [reworkQty, setReworkQty] = useState(15);
  const [rejectedQty, setRejectedQty] = useState(5);

  const validation = validateQCReconciliation(totalInspected, passedQty, reworkQty, rejectedQty);

  const handleSubmit = () => {
    if (!validation.isValid) {
      Alert.alert('QC Reconciliation Mismatch', validation.error);
      return;
    }

    Alert.alert(
      'Endline QC Decision Recorded',
      `Total: ${totalInspected} pcs. Passed: ${passedQty}, Rework: ${reworkQty}, Rejected: ${rejectedQty}. Initial released batch: ${passedQty} pcs only.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('quality:endlineQC')} subtitle={`${bundle.bundleCode} · ${bundle.styleName}`} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">Total Bundle Qty</AppText>
              <AppText variant="h3" bold>{totalInspected} pcs</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color="secondary">Standard Equation</AppText>
              <AppText variant="code" mono bold style={{ color: validation.isValid ? tokens.success : tokens.danger }}>
                {passedQty} + {reworkQty} + {rejectedQty} = {passedQty + reworkQty + rejectedQty}
              </AppText>
            </View>
          </View>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper label="1. Passed Quantity (Eligible for Release)" value={passedQty} min={0} max={totalInspected} step={5} onChange={setPassedQty} />

          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper label="2. Rework Quantity (To Tailors)" value={reworkQty} min={0} max={totalInspected} step={1} onChange={setReworkQty} />
          </View>

          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper label="3. Rejected / Scrap Quantity" value={rejectedQty} min={0} max={totalInspected} step={1} onChange={setRejectedQty} />
          </View>
        </AppCard>

        {!validation.isValid && (
          <View style={[styles.errorCard, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
            <AppText variant="caption" style={{ color: tokens.danger }}>
              ⚠ {validation.error}
            </AppText>
          </View>
        )}

        <AppButton title={`Release ${passedQty} Passed Pieces to Packing`} onPress={handleSubmit} disabled={!validation.isValid} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[3] },
});
