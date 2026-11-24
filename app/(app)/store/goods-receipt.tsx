import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function GoodsReceiptScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [poNumber, setPoNumber] = useState('PO-2026-9041');
  const [supplier, setSupplier] = useState('Vardhman Textiles Ltd');
  const [invoiceNo, setInvoiceNo] = useState('INV-77291');
  const [rollsReceived, setRollsReceived] = useState(12);
  const [totalMeters, setTotalMeters] = useState(1200);

  const handleSubmit = () => {
    Alert.alert(
      'Goods Receipt Note (GRN) Generated',
      `GRN #GRN-9821 created for ${totalMeters}m fabric from ${supplier}. Stock updated in Main Fabric Warehouse.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Goods Receipt Note (GRN)" subtitle="Raw Material Inward Receiving" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label="Purchase Order (PO) Number" value={poNumber} onChangeText={setPoNumber} />
          <AppInput label="Mill / Supplier Name" value={supplier} onChangeText={setSupplier} />
          <AppInput label="Delivery Challan / Invoice No" value={invoiceNo} onChangeText={setInvoiceNo} />
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper
            label="Fabric Rolls / Packaging Units"
            value={rollsReceived}
            min={1}
            max={100}
            step={1}
            onChange={setRollsReceived}
          />
          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper
              label="Total Quantity Measured (Meters)"
              value={totalMeters}
              min={100}
              max={10000}
              step={100}
              onChange={setTotalMeters}
            />
          </View>
        </AppCard>

        <AppButton title="Post Goods Receipt to Inventory" onPress={handleSubmit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
});
