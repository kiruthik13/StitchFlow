import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function ReinspectionScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);

  const totalReworkPieces = 15; // From standard equation: 180 passed, 15 rework, 5 rejected
  const [passedReworkQty, setPassedReworkQty] = useState(15);
  const [scrapQty, setScrapQty] = useState(0);

  const handleReleaseRework = () => {
    Alert.alert(
      'Reinspection Released',
      `Reinspected 15 rework pieces. ${passedReworkQty} pieces passed rectification! Additional release of ${passedReworkQty} pieces granted to Packing Department. (Cumulative Release: ${180 + passedReworkQty}/200).`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('quality:reinspection')} subtitle="Bundle BND-00523 · Rectified Batch" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase>Rework Inspection Safeguard Rule</AppText>
          <AppText variant="h4" bold style={{ marginTop: 2 }}>Initial Release: 180 pcs only</AppText>
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
            The 15 rework pieces returned from tailor Kavitha are now ready for secondary inspection.
          </AppText>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper
            label="Reinspected Pieces Passed (Now Released)"
            value={passedReworkQty}
            min={0}
            max={totalReworkPieces}
            step={1}
            onChange={(val) => {
              setPassedReworkQty(val);
              setScrapQty(totalReworkPieces - val);
            }}
          />

          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper
              label="Secondary Failure / Scrap"
              value={scrapQty}
              min={0}
              max={totalReworkPieces}
              step={1}
              onChange={(val) => {
                setScrapQty(val);
                setPassedReworkQty(totalReworkPieces - val);
              }}
            />
          </View>
        </AppCard>

        <View style={[styles.alertCard, { backgroundColor: tokens.brandLight, borderColor: tokens.brand, marginBottom: spacing[4] }]}>
          <AppText variant="label" bold style={{ color: tokens.brand }}>
            ✓ Additional Release: {passedReworkQty} pcs
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            Cumulative release after reinspection will become {180 + passedReworkQty} pieces.
          </AppText>
        </View>

        <AppButton title={`Release Additional ${passedReworkQty} Pieces`} onPress={handleReleaseRework} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  alertCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3] },
});
