import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const PACKING_LOGS = [
  { id: 'log-1', cartonCode: 'CTN-10045', job: 'JOB-1001', style: 'Polo T-Shirt', size: 'L', color: 'Navy', qty: 50, packedBy: 'Anitha Raj', time: '11:45 AM', date: '2026-11-24' },
  { id: 'log-2', cartonCode: 'CTN-10046', job: 'JOB-1001', style: 'Polo T-Shirt', size: 'M', color: 'White', qty: 50, packedBy: 'Anitha Raj', time: '10:20 AM', date: '2026-11-24' },
  { id: 'log-3', cartonCode: 'CTN-10047', job: 'JOB-1002', style: 'Chino Trousers', size: '32', color: 'Khaki', qty: 40, packedBy: 'Priya Mani', time: '09:15 AM', date: '2026-11-24' },
];

export default function PackingHistoryScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Packing Audit History" subtitle="Cartons Sealed & Inspected Log" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {PACKING_LOGS.map((item) => (
          <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{item.cartonCode}</AppText>
                <AppText variant="bodySmall" bold style={{ marginTop: 2 }}>{item.style} ({item.size}, {item.color})</AppText>
                <AppText variant="caption" color="secondary">{item.job} · Qty: {item.qty} pcs</AppText>
                <AppText variant="caption" color="secondary">Packed by {item.packedBy} at {item.time}</AppText>
              </View>
              <StatusBadge label="VERIFIED" variant="success" size="sm" />
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
