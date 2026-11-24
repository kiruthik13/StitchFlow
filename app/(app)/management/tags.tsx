import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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

const REPRINT_REQUESTS = [
  { id: 'req-1', bundleCode: 'BND-00521', reason: 'Torn barcode tag during washing', requestedBy: 'Ramesh Kumar (Supervisor)', date: '2026-11-24 10:15', status: 'Pending' },
  { id: 'req-2', bundleCode: 'BND-00524', reason: 'Ink smudge, scanner cannot read', requestedBy: 'Kavitha (Operator)', date: '2026-11-24 11:30', status: 'Approved' },
];

export default function TagReprintScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState(REPRINT_REQUESTS);

  const handleApprove = (id: string) => {
    setRequests(requests.map((r) => r.id === id ? { ...r, status: 'Approved' } : r));
    Alert.alert('Tag Reprint Approved', 'Reprint token sent to Zebra thermal tag printer.');
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Tag Print & Reprint" subtitle="Barcode & QR Hang-Tag Management" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Reprint Requests Queue ({requests.filter((r) => r.status === 'Pending').length} Pending)
        </AppText>

        {requests.map((req) => (
          <AppCard key={req.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{req.bundleCode}</AppText>
                <AppText variant="bodySmall" bold style={{ marginTop: 2 }}>{req.reason}</AppText>
                <AppText variant="caption" color="secondary">{req.requestedBy}</AppText>
                <AppText variant="caption" color="secondary">{req.date}</AppText>
              </View>
              <StatusBadge label={req.status.toUpperCase()} variant={req.status === 'Approved' ? 'success' : 'warning'} size="sm" />
            </View>

            {req.status === 'Pending' && (
              <View style={{ marginTop: spacing[3], flexDirection: 'row', gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <AppButton title="Approve & Print" size="sm" onPress={() => handleApprove(req.id)} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton title="Reject" size="sm" variant="outline" onPress={() => Alert.alert('Rejected', 'Request dismissed.')} />
                </View>
              </View>
            )}
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
