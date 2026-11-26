import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/store/authStore';
import { LiveMastersPanel, MasterTab } from '../../../src/features/operations/LiveMastersPanel';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { FilterBar } from '../../../src/design-system/components/FilterBar';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { BUYERS, STYLES, LINES } from '../../../src/fixtures/mockData';

const TABS = [
  { key: 'buyers', label: 'Buyers' },
  { key: 'styles', label: 'Styles' },
  { key: 'lines', label: 'Lines' },
  { key: 'stages', label: 'Stages' },
  { key: 'locations', label: 'Locations' },
  { key: 'cutting-masters', label: 'Cutting Masters' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'ranks', label: 'Ranks' },
  { key: 'configs', label: 'Configs' },
];

const STAGES_MASTER = [
  { id: 'stg-1', code: 'CUT', name: 'Fabric Cutting', seq: 1, sam: 4.5, qcRequired: false },
  { id: 'stg-2', code: 'SEW', name: 'Sewing Assembly', seq: 2, sam: 12.0, qcRequired: true },
  { id: 'stg-3', code: 'KAJ', name: 'Kaja / Buttoning', seq: 3, sam: 2.5, qcRequired: false },
  { id: 'stg-4', code: 'IRN', name: 'Thread Trimming & Ironing', seq: 4, sam: 3.2, qcRequired: true },
  { id: 'stg-5', code: 'QC', name: 'Endline Quality Inspection', seq: 5, sam: 1.8, qcRequired: true },
  { id: 'stg-6', code: 'PCK', name: 'Final Garment Packing', seq: 6, sam: 2.0, qcRequired: false },
];

const STORAGE_LOCATIONS = [
  { id: 'loc-1', code: 'LOC-RAW-A1', name: 'Main Fabric Warehouse A1', type: 'Raw Material', racks: 14, capacity: '12,000 m' },
  { id: 'loc-2', code: 'LOC-TRM-B2', name: 'Accessories & Trims Store B2', type: 'Trims', racks: 24, capacity: '50,000 pcs' },
  { id: 'loc-3', code: 'LOC-WIP-L1', name: 'Line 1 WIP Buffer Bay', type: 'WIP Buffer', racks: 6, capacity: '1,500 bundles' },
  { id: 'loc-4', code: 'LOC-FG-BAY1', name: 'Finished Goods Dispatch Bay 1', type: 'Finished Goods', racks: 30, capacity: '800 cartons' },
];

export default function MastersScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const demo = useAuthStore(state => state.isDemoMode);
  const [activeTab, setActiveTab] = useState('buyers');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:masters')} subtitle="Configuration & Standards" showBack onBack={() => router.back()} />
      <View style={{ padding: spacing[4], paddingBottom: spacing[2] }}>
        <FilterBar options={TABS} selected={activeTab} onSelect={setActiveTab} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {!demo ? <LiveMastersPanel key={activeTab} tab={activeTab as MasterTab} /> : <>
        {activeTab === 'buyers' && (
          <View>
            <View style={styles.headerRow}>
              <AppText variant="caption" color="secondary" uppercase>Buyer Master ({BUYERS.length})</AppText>
              <AppButton title="+ Add Buyer" size="sm" onPress={() => Alert.alert('Add Buyer', 'Buyer creation form is prepared for API sync.')} />
            </View>
            {BUYERS.map((b) => (
              <AppCard key={b.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{b.name}</AppText>
                    <AppText variant="caption" color="secondary">Code: {b.code} · Country: {b.country}</AppText>
                  </View>
                  <StatusBadge label="ACTIVE" variant="success" size="sm" />
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {activeTab === 'styles' && (
          <View>
            <View style={styles.headerRow}>
              <AppText variant="caption" color="secondary" uppercase>Style / Dress Master ({STYLES.length})</AppText>
              <AppButton title="+ Add Style" size="sm" onPress={() => Alert.alert('Add Style', 'Style configuration form is prepared for API sync.')} />
            </View>
            {STYLES.map((s) => (
              <AppCard key={s.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{s.name}</AppText>
                    <AppText variant="caption" color="secondary">Code: {s.code} · Category: {s.category}</AppText>
                    <AppText variant="caption" color="secondary">Sizes: {s.sizes.join(', ')}</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="label" mono bold style={{ color: tokens.brand }}>{s.samValue} SAM</AppText>
                    <AppText variant="caption" color="secondary">Standard Min</AppText>
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {activeTab === 'lines' && (
          <View>
            <View style={styles.headerRow}>
              <AppText variant="caption" color="secondary" uppercase>Production Line Master ({LINES.length})</AppText>
              <AppButton title="+ Add Line" size="sm" onPress={() => Alert.alert('Add Line', 'Line configuration form is prepared for API sync.')} />
            </View>
            {LINES.map((l) => (
              <AppCard key={l.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{l.name}</AppText>
                    <AppText variant="caption" color="secondary">Code: {l.code} · Factory: Factory A</AppText>
                    <AppText variant="caption" color="secondary">Capacity: {l.capacity} pcs/day</AppText>
                  </View>
                  <StatusBadge label="RUNNING" variant="success" size="sm" />
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {activeTab === 'stages' && (
          <View>
            <View style={styles.headerRow}>
              <AppText variant="caption" color="secondary" uppercase>Production Stage Sequences</AppText>
              <AppText variant="caption" color="secondary">6 Standard Stages</AppText>
            </View>
            {STAGES_MASTER.map((stg) => (
              <AppCard key={stg.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={[styles.seqBadge, { backgroundColor: tokens.surfaceSecondary }]}>
                    <AppText variant="label" mono bold>{stg.seq}</AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <AppText variant="label" bold>{stg.name}</AppText>
                    <AppText variant="caption" color="secondary">Code: {stg.code} · Benchmark: {stg.sam} SAM</AppText>
                  </View>
                  <StatusBadge label={stg.qcRequired ? 'QC GATE' : 'STANDARD'} variant={stg.qcRequired ? 'warning' : 'neutral'} size="sm" />
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {activeTab === 'locations' && (
          <View>
            <View style={styles.headerRow}>
              <AppText variant="caption" color="secondary" uppercase>Storage Locations & Racks</AppText>
              <AppButton title="+ Add Location" size="sm" onPress={() => Alert.alert('Add Location', 'Storage location configuration.')} />
            </View>
            {STORAGE_LOCATIONS.map((loc) => (
              <AppCard key={loc.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" bold>{loc.name}</AppText>
                    <AppText variant="code" mono color="secondary">{loc.code}</AppText>
                    <AppText variant="caption" color="secondary">{loc.racks} Racks · Capacity: {loc.capacity}</AppText>
                  </View>
                  <StatusBadge label={loc.type} variant="info" size="sm" />
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {(activeTab === 'cutting-masters' || activeTab === 'contacts' || activeTab === 'ranks' || activeTab === 'configs') && (
          <AppCard padding={spacing[4]}>
            <AppText variant="h4" bold>{TABS.find((tabItem) => tabItem.key === activeTab)?.label}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>
              {t('production:masters')}
            </AppText>
          </AppCard>
        )}
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seqBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
