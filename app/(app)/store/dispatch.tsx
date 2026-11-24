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
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { CARTONS } from '../../../src/fixtures/mockData';

export default function DispatchScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [truckNo, setTruckNo] = useState('TN-11-BX-5521');
  const [containerSeal, setContainerSeal] = useState('SEAL-EU-99214');
  const [forwarder, setForwarder] = useState('Maersk Logistics / DHL Global Forwarding');

  const sealedCartons = CARTONS.filter((c) => c.status === 'sealed');
  const totalGarments = sealedCartons.reduce((acc, c) => acc + c.quantity, 0);

  const handleDispatch = () => {
    Alert.alert(
      'Export Shipment Dispatched',
      `Manifest #DSP-7721 created. ${sealedCartons.length} cartons (${totalGarments} garments) loaded onto ${truckNo}. Seal: ${containerSeal}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Order Dispatch & Freight" subtitle="Outward Shipment Manifest" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">Sealed Cartons</AppText>
              <AppText variant="h3" bold>{sealedCartons.length} Cartons</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color="secondary">Total Garments</AppText>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>{totalGarments} pcs</AppText>
            </View>
          </View>
        </AppCard>

        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label="Logistics Carrier / Freight Forwarder" value={forwarder} onChangeText={setForwarder} />
          <AppInput label="Vehicle / Truck Registration Number" value={truckNo} onChangeText={setTruckNo} />
          <AppInput label="Customs / Container Bolt Seal Number" value={containerSeal} onChangeText={setContainerSeal} />
        </AppCard>

        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Carton Loading Checklist
        </AppText>

        {sealedCartons.map((c) => (
          <AppCard key={c.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.cartonRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · Size: {c.size} · {c.quantity} pcs</AppText>
              </View>
              <StatusBadge label="READY TO LOAD" variant="success" size="sm" />
            </View>
          </AppCard>
        ))}

        <View style={{ marginTop: spacing[3] }}>
          <AppButton title="Sign Off Shipment & Gate Pass" onPress={handleDispatch} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
