import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';

export function KajaIroningEntryView({ type }: { type: 'kaja' | 'ironing' }) {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles, submitProductionQty } = useDemoStore();
  const { t } = useTranslation(['production', 'common']);

  const isKaja = type === 'kaja';
  const title = isKaja ? 'Kaja / Button Attachment' : 'Thread Trimming & Ironing';
  const stageName = isKaja ? 'Kaja/Button' : 'Ironing';

  const [selectedBundle, setSelectedBundle] = useState(bundles[0]);
  const [completedQty, setCompletedQty] = useState(selectedBundle.quantity);

  const handleSubmit = () => {
    submitProductionQty(selectedBundle.id, completedQty, stageName);
    Alert.alert(
      `${title} Confirmed`,
      `Processed ${completedQty} pieces for ${selectedBundle.bundleCode}. Forwarded to next station.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>{stageName} Work Station</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{title}</AppText>
        <AppText variant="bodySmall" color="secondary">Bundle: {selectedBundle.bundleCode} · {selectedBundle.styleName}</AppText>
      </AppCard>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <QuantityStepper
          label={`${stageName} Completed Quantity`}
          value={completedQty}
          min={1}
          max={selectedBundle.quantity}
          step={5}
          onChange={setCompletedQty}
        />
      </AppCard>

      <AppButton title={`Submit ${stageName} Output`} onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
});
