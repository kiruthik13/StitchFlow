import { RawInventoryPanel } from '../../../src/features/operations/RawInventoryPanel';
import { useAuthStore } from '../../../src/store/authStore';
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

const AUDIT_ITEMS = [
  { id: 'aud-1', name: 'Cotton Piqué Fabric (Navy)', code: 'MAT-PIQ-001', bookQty: 1850, unit: 'm', counted: 1850 },
  { id: 'aud-2', name: 'Chino Fabric (Khaki)', code: 'MAT-CHN-002', bookQty: 320, unit: 'm', counted: 310 }, // 10m shortage
  { id: 'aud-3', name: 'Polyester Sewing Thread (40/2)', code: 'TRM-THR-BLK', bookQty: 240, unit: 'spools', counted: 240 },
  { id: 'aud-4', name: 'Resin Buttons (4-hole, Navy)', code: 'TRM-BTN-NVY', bookQty: 5000, unit: 'pcs', counted: 4980 }, // 20 pcs variance
];

export default function PhysicalStockCountScreen() {
  const demo = useAuthStore(state => state.isDemoMode);
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['inventory', 'common']);
  const [counts, setCounts] = useState(AUDIT_ITEMS);

  const handleUpdateCount = (id: string, newCount: number) => {
    setCounts(counts.map((c) => c.id === id ? { ...c, counted: newCount } : c));
  };

  const handleReconcile = () => {
    Alert.alert(
      'Stock Audit Posted',
      'Cyclic inventory count recorded. Discrepancy report filed for manager review.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('inventory:stockCount')} subtitle={demo ? "Cyclic Inventory Reconciliation" : undefined} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!demo ? <RawInventoryPanel mode="count" /> : <>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Stock Items Count Verification
        </AppText>

        {counts.map((item) => {
          const diff = item.counted - item.bookQty;
          return (
            <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{item.name}</AppText>
                  <AppText variant="caption" color="secondary">Code: {item.code}</AppText>
                  <AppText variant="caption" color="secondary">Book Qty: {item.bookQty} {item.unit}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" color="secondary">Discrepancy</AppText>
                  <AppText variant="label" mono bold style={{ color: diff === 0 ? tokens.success : tokens.danger }}>
                    {diff === 0 ? 'MATCH' : `${diff} ${item.unit}`}
                  </AppText>
                </View>
              </View>

              <View style={{ marginTop: spacing[3] }}>
                <QuantityStepper
                  label={`Physical Counted (${item.unit})`}
                  value={item.counted}
                  min={0}
                  max={item.bookQty * 2}
                  step={item.unit === 'pcs' ? 10 : 5}
                  onChange={(val) => handleUpdateCount(item.id, val)}
                />
              </View>
            </AppCard>
          );
        })}

        <AppButton title="Post Audit & Adjust Discrepancies" onPress={handleReconcile} />
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
