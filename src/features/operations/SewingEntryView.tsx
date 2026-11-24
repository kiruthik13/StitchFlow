import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

export function SewingEntryView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles, submitProductionQty } = useDemoStore();

  const sewingBundles = bundles.filter((b) => b.currentStage === 'Sewing' || b.status === 'sewing');
  const [selectedBundle, setSelectedBundle] = useState(sewingBundles[0] || bundles[0]);
  const [sewnQty, setSewnQty] = useState(selectedBundle ? selectedBundle.quantity : 40);

  const handleSubmit = () => {
    submitProductionQty(selectedBundle.id, sewnQty, 'Sewing');
    Alert.alert(
      'Sewing Output Recorded',
      `Recorded ${sewnQty} pieces for ${selectedBundle.bundleCode}. Forwarded to Kaja/Button stage.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        Select Bundle from Line
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {sewingBundles.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => { setSelectedBundle(b); setSewnQty(b.quantity); }}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedBundle.id === b.id ? tokens.brand : tokens.surface,
                  borderColor: selectedBundle.id === b.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText variant="label" mono bold style={{ color: selectedBundle.id === b.id ? '#FFFFFF' : tokens.textPrimary }}>
                {b.bundleCode}
              </AppText>
              <AppText variant="caption" style={{ color: selectedBundle.id === b.id ? '#FFFFFF' : tokens.textSecondary }}>
                {b.size} · {b.color}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <View style={styles.rowBetween}>
          <View>
            <AppText variant="h3" bold mono>{selectedBundle.bundleCode}</AppText>
            <AppText variant="bodySmall" color="secondary">{selectedBundle.styleName} · {selectedBundle.jobCode}</AppText>
          </View>
          <StatusBadge label={selectedBundle.status.toUpperCase()} variant="info" size="sm" />
        </View>

        <View style={{ marginTop: spacing[4] }}>
          <QuantityStepper
            label="Sewing Completed Pieces"
            value={sewnQty}
            min={1}
            max={selectedBundle.quantity}
            step={1}
            onChange={setSewnQty}
          />
        </View>
      </AppCard>

      <AppButton title="Submit Sewing Out Entry" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
