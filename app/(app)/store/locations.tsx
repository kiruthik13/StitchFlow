import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const RACK_ZONES = [
  { id: 'rk-1', zone: 'Zone A — Fabric Rolls', bin: 'BIN-A1 to A14', occupied: 82, totalRacks: 14, items: 'Cotton Piqué, Chino Fabric, Interlining', status: 'normal' },
  { id: 'rk-2', zone: 'Zone B — Trims & Accessories', bin: 'BIN-B1 to B24', occupied: 65, totalRacks: 24, items: 'Buttons, Sewing Threads, Brand Labels, Polybags', status: 'optimal' },
  { id: 'rk-3', zone: 'Zone C — WIP Production Buffer', bin: 'BAY-C1 to C6', occupied: 94, totalRacks: 6, items: 'Line 1 Cut Bundles, Semi-Stitched Panels', status: 'congested' },
  { id: 'rk-4', zone: 'Zone D — Finished Goods Warehouse', bin: 'BAY-D1 to D30', occupied: 78, totalRacks: 30, items: 'Sealed Export Cartons (Nordic Apparel, Zara)', status: 'normal' },
];

export default function StorageLocationsScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Storage Locations & Racks" subtitle="Factory A Warehouse Map" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Warehouse Zones & Capacity
        </AppText>

        {RACK_ZONES.map((rz) => {
          const occColor = rz.occupied > 90 ? tokens.danger : rz.occupied > 75 ? tokens.warning : tokens.success;
          return (
            <AppCard key={rz.id} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{rz.zone}</AppText>
                  <AppText variant="code" mono color="secondary">{rz.bin}</AppText>
                </View>
                <StatusBadge
                  label={rz.status.toUpperCase()}
                  variant={rz.status === 'congested' ? 'danger' : rz.status === 'optimal' ? 'success' : 'info'}
                  size="sm"
                />
              </View>

              <AppText variant="caption" color="secondary" style={{ marginTop: spacing[2] }}>
                Items Stored: {rz.items}
              </AppText>

              <View style={{ marginTop: spacing[3] }}>
                <View style={styles.barHeader}>
                  <AppText variant="caption" color="secondary">Occupancy Rate</AppText>
                  <AppText variant="label" mono bold style={{ color: occColor }}>{rz.occupied}%</AppText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: tokens.surfaceSecondary }]}>
                  <View style={[styles.progressFill, { backgroundColor: occColor, width: `${rz.occupied}%` as any }]} />
                </View>
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
