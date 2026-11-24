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
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const MEASUREMENT_SPECS = [
  { pom: 'Chest Width (1" below armhole)', spec: 54.0, tol: 1.0, actual: 54.2 },
  { pom: 'Total Body Length (HSP to hem)', spec: 72.0, tol: 1.5, actual: 72.5 },
  { pom: 'Across Shoulder Width', spec: 46.0, tol: 0.8, actual: 46.1 },
  { pom: 'Sleeve Length (shoulder to cuff)', spec: 22.0, tol: 0.8, actual: 21.8 },
  { pom: 'Neck Opening Circumference', spec: 42.0, tol: 0.5, actual: 42.3 },
  { pom: 'Bottom Hem Width', spec: 53.0, tol: 1.0, actual: 53.1 },
];

export default function MeasurementCheckScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('quality:measurementSpecs')} subtitle="Size L · Polo T-Shirt (PTS-001)" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText variant="h4" bold>Spec Tolerance Audit</AppText>
              <AppText variant="caption" color="secondary">Unit of Measure: Centimeters (cm)</AppText>
            </View>
            <StatusBadge label="PASS (6/6 POM)" variant="success" size="sm" />
          </View>
        </AppCard>

        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Points of Measure (POM)
        </AppText>

        {MEASUREMENT_SPECS.map((item, idx) => {
          const diff = Math.abs(item.actual - item.spec);
          const isPass = diff <= item.tol;
          return (
            <AppCard key={idx} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" bold>{item.pom}</AppText>
                  <AppText variant="caption" color="secondary">
                    Spec: {item.spec} cm · Tol: ±{item.tol} cm
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="label" mono bold style={{ color: isPass ? tokens.success : tokens.danger }}>
                    {item.actual} cm
                  </AppText>
                  <StatusBadge label={isPass ? 'PASS' : 'FAIL'} variant={isPass ? 'success' : 'danger'} size="sm" />
                </View>
              </View>
            </AppCard>
          );
        })}

        <AppButton title="Sign Off Measurement Spec Check" onPress={() => {
          Alert.alert('Measurement Check Approved', 'All 6 POM points comply with buyer tolerance limits.');
          router.back();
        }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
