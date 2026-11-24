import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { spacing } from '../../../src/design-system/tokens/spacing';

const INLINE_STATIONS = [
  { id: 'st-1', name: 'Collar Runstitch', operator: 'Kavitha S.', line: 'Line 1' },
  { id: 'st-2', name: 'Sleeve Attachment', operator: 'Murugan P.', line: 'Line 1' },
  { id: 'st-3', name: 'Side Seam Overlock', operator: 'Devi S.', line: 'Line 1' },
  { id: 'st-4', name: 'Bottom Hemming', operator: 'Praveen C.', line: 'Line 1' },
];

export default function InlineQCScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedStation, setSelectedStation] = useState(INLINE_STATIONS[0]);
  const [checkedPieces, setCheckedPieces] = useState(10);
  const [defectsFound, setDefectsFound] = useState(0);

  const handleSubmit = () => {
    Alert.alert(
      'Inline Inspection Logged',
      `Station: ${selectedStation.name} (${selectedStation.operator}). Checked ${checkedPieces} pieces, ${defectsFound} defects found. Feedback sent to supervisor.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Inline QC Roving Audit" subtitle="In-Process Line Inspection" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppText variant="caption" color="secondary" uppercase style={styles.sectionTitle}>Select Workstation Being Audited</AppText>
        <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
          {INLINE_STATIONS.map((st) => (
            <TouchableOpacity
              key={st.id}
              onPress={() => setSelectedStation(st)}
              style={[
                styles.stationCard,
                {
                  backgroundColor: selectedStation.id === st.id ? tokens.brandLight : tokens.surface,
                  borderColor: selectedStation.id === st.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="h4" bold>{st.name}</AppText>
                <AppText variant="caption" color="secondary">Operator: {st.operator} · {st.line}</AppText>
              </View>
              <StatusBadge label={selectedStation.id === st.id ? 'SELECTED' : 'AUDIT'} variant={selectedStation.id === st.id ? 'brand' : 'neutral'} size="sm" />
            </TouchableOpacity>
          ))}
        </View>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <QuantityStepper
            label="Sample Pieces Inspected (Random 5-Piece / 10-Piece)"
            value={checkedPieces}
            min={5}
            max={50}
            step={5}
            onChange={setCheckedPieces}
          />
          <View style={{ marginTop: spacing[4] }}>
            <QuantityStepper
              label="Defective Pieces Discovered"
              value={defectsFound}
              min={0}
              max={checkedPieces}
              step={1}
              onChange={setDefectsFound}
            />
          </View>
        </AppCard>

        <AppButton title="Record Inline Audit Finding" onPress={handleSubmit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  sectionTitle: { letterSpacing: 0.8, marginBottom: spacing[2] },
  stationCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
