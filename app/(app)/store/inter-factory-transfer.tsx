import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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

export default function InterFactoryTransferScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [transferState, setTransferState] = useState<'pending_sender' | 'in_transit' | 'received'>('in_transit');
  const [senderConfirmed, setSenderConfirmed] = useState(true);
  const [receiverConfirmed, setReceiverConfirmed] = useState(false);
  const [transferMeters, setTransferMeters] = useState(400);

  const handleReceiverConfirm = () => {
    setReceiverConfirmed(true);
    setTransferState('received');
    Alert.alert(
      'Transfer Receipt Confirmed',
      'Receiver confirmed physical count of 400m Chino fabric. Goods added to Factory B inventory.'
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Inter-Factory Stock Transfer" subtitle="TRF-2026-0042 · Separate Confirmations" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* Origin and Destination Card */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.flowRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="secondary">Dispatching Facility</AppText>
              <AppText variant="h4" bold>Factory A (Chennai)</AppText>
              <StatusBadge label={senderConfirmed ? 'DISPATCHED' : 'PENDING'} variant={senderConfirmed ? 'success' : 'warning'} size="sm" />
            </View>
            <AppText style={{ fontSize: 24, marginHorizontal: spacing[2] }}>➔</AppText>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="caption" color="secondary">Receiving Facility</AppText>
              <AppText variant="h4" bold>Factory B (CBE)</AppText>
              <StatusBadge label={receiverConfirmed ? 'RECEIVED' : 'IN TRANSIT'} variant={receiverConfirmed ? 'success' : 'info'} size="sm" />
            </View>
          </View>
        </AppCard>

        {/* Transfer Item Details */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="label" bold>Chino Fabric Roll Batch (CT-002)</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>Material Code: MAT-CHINO-BEIGE</AppText>

          <View style={{ marginTop: spacing[3] }}>
            <QuantityStepper
              label="Transfer Quantity (Meters)"
              value={transferMeters}
              min={50}
              max={2000}
              step={50}
              onChange={setTransferMeters}
            />
          </View>
        </AppCard>

        {/* Dual Confirmation Matrix */}
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Dual Confirmation Safeguard
        </AppText>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[4] }}>
          <View style={styles.confirmRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold>1. Sender Confirmation</AppText>
              <AppText variant="caption" color="secondary">Store Incharge (Chennai) · Sealed Vehicle TN-04-AC-7890</AppText>
            </View>
            <StatusBadge label="VERIFIED" variant="success" size="sm" />
          </View>

          <View style={[styles.confirmRow, { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold>2. Receiver Confirmation</AppText>
              <AppText variant="caption" color="secondary">Receiving Store (Coimbatore) · Physical Count Audit</AppText>
            </View>
            <StatusBadge label={receiverConfirmed ? 'CONFIRMED' : 'AWAITING'} variant={receiverConfirmed ? 'success' : 'warning'} size="sm" />
          </View>
        </AppCard>

        {!receiverConfirmed ? (
          <AppButton title="Confirm Physical Receipt & Unload" onPress={handleReceiverConfirm} />
        ) : (
          <AppButton title="Transfer Fully Reconciled" variant="outline" disabled />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
