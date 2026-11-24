import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';
import { STOCK_ITEMS } from '../../fixtures/mockData';

export function StockMovementView({ mode }: { mode: 'input-in' | 'input-out' | 'output-in' | 'output-out' }) {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { t } = useTranslation(['inventory', 'common']);

  const titles: Record<string, { title: string; subtitle: string; source: string; dest: string }> = {
    'input-in': { title: 'Raw Material Goods Inward', subtitle: 'Receive fabric/trims into store', source: 'Supplier / Mill', dest: 'Main Store' },
    'input-out': { title: 'Issue Inputs to Production', subtitle: 'Dispatch materials to cutting/lines', source: 'Main Store', dest: 'Cutting Bay / Line 1' },
    'output-in': { title: 'Receive Output in Store', subtitle: 'Receive finished cartons from packing', source: 'Packing Department', dest: 'Finished Goods Bay' },
    'output-out': { title: 'Finished Goods Dispatch Out', subtitle: 'Ship packed orders to buyer freight', source: 'Finished Goods Bay', dest: 'Buyer Logistic Hub' },
  };

  const config = titles[mode] || titles['input-in'];
  const [selectedItem, setSelectedItem] = useState(STOCK_ITEMS[0]);
  const [qty, setQty] = useState(50);
  const [referenceDoc, setReferenceDoc] = useState('DOC-2026-8812');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    Alert.alert(
      `${config.title} Successful`,
      `Recorded movement of ${qty} ${selectedItem.unit} of ${selectedItem.name} from ${config.source} to ${config.dest}. Reference: ${referenceDoc}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>Movement Type</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{config.title}</AppText>
        <AppText variant="bodySmall" color="secondary">{config.subtitle}</AppText>

        <View style={styles.flowRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="secondary">Source Origin</AppText>
            <AppText variant="label" bold>{config.source}</AppText>
          </View>
          <AppText style={{ fontSize: 20 }}>➔</AppText>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="caption" color="secondary">Destination Stage</AppText>
            <AppText variant="label" bold>{config.dest}</AppText>
          </View>
        </View>
      </AppCard>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppInput label="Reference Document / Invoice / DC No" value={referenceDoc} onChangeText={setReferenceDoc} />

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper
            label={`Transaction Quantity (${selectedItem.unit})`}
            value={qty}
            min={1}
            max={5000}
            step={10}
            onChange={setQty}
          />
        </View>

        <AppInput
          label="Transfer Notes / Vehicle No"
          value={notes}
          onChangeText={setNotes}
          placeholder="E.g. Container TN-09-AB-1234, inspected by Store Incharge"
        />
      </AppCard>

      <AppButton title={`Confirm & Post ${config.title}`} onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
});
