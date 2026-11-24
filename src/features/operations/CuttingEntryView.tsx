import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { QuantityStepper } from '../../design-system/components/QuantityStepper';
import { spacing } from '../../design-system/tokens/spacing';
import { JOBS } from '../../fixtures/mockData';

export function CuttingEntryView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { addScan } = useDemoStore();

  const [selectedJob, setSelectedJob] = useState(JOBS[0]);
  const [rollNo, setRollNo] = useState('ROLL-9821');
  const [plyCount, setPlyCount] = useState(50);
  const [markerLength, setMarkerLength] = useState('6.4m');
  const [cutPieces, setCutPieces] = useState(200);

  const handleSubmit = () => {
    Alert.alert(
      'Cutting Entry Confirmed',
      `Cut ${cutPieces} pieces for ${selectedJob.jobCode} (${selectedJob.styleName}). Roll: ${rollNo}, Plies: ${plyCount}. Bundles generated for sewing.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppText variant="caption" color="secondary" uppercase>Selected Job Order</AppText>
        <AppText variant="h3" bold style={{ marginTop: 2 }}>{selectedJob.jobCode}</AppText>
        <AppText variant="bodySmall" color="secondary">{selectedJob.styleName} · {selectedJob.buyerName}</AppText>
      </AppCard>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppInput label="Fabric Roll / Batch Number" value={rollNo} onChangeText={setRollNo} />
        <AppInput label="Marker Table Length" value={markerLength} onChangeText={setMarkerLength} />

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper label="Layered Ply Count" value={plyCount} min={1} max={120} step={5} onChange={setPlyCount} />
        </View>

        <View style={{ marginTop: spacing[3] }}>
          <QuantityStepper label="Total Cut Pieces Generated" value={cutPieces} min={10} max={1000} step={20} onChange={setCutPieces} />
        </View>
      </AppCard>

      <AppButton title="Confirm Cutting & Generate Barcode Bundles" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
});
