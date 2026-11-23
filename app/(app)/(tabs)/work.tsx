import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge, jobStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { FilterBar } from '../../../src/design-system/components/FilterBar';
import { GarmentTicketCard } from '../../../src/design-system/components/GarmentTicketCard';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { typography } from '../../../src/design-system/tokens/typography';
import { FACTORIES, JOBS, CARTONS, STOCK_ITEMS } from '../../../src/fixtures/mockData';

const JOB_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'on-hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

const BUNDLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function WorkTabScreen() {
  const { user } = useAuthStore();
  const role = user?.role;

  if (!user) return null;
  if (role === 'md') return <MDFactoriesWork />;
  if (role === 'factory-manager') return <FMWork />;
  if (role === 'supervisor') return <SupervisorWork />;
  if (role === 'operator') return <OperatorWork />;
  if (role === 'qc-inspector') return <QCWork />;
  if (role === 'store-dispatch') return <StoreWork />;
  if (role === 'packing-staff') return <PackingWork />;
  return <OperatorWork />;
}

// ── MD: Factory Overview ──────────────────────────────────────────────────────
function MDFactoriesWork() {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Factories" tokens={tokens} insets={insets} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {FACTORIES.map((f) => {
          const eff = f.id === 'factory-a' ? 82 : 68;
          return (
            <AppCard key={f.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
              <AppText variant="h4" bold>{f.name}</AppText>
              <AppText variant="caption" color="secondary">{f.location}</AppText>
              <View style={styles.row}>
                <StatItem label="Lines" value={`${f.activeLines}/${f.totalLines}`} />
                <StatItem label="Capacity" value={String(f.capacity)} />
                <StatItem label="Efficiency" value={`${eff}%`} color={eff >= 80 ? tokens.success : tokens.warning} />
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── FM: Jobs Management ───────────────────────────────────────────────────────
function FMWork() {
  const { tokens } = useThemeStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Jobs & Orders" tokens={tokens} insets={insets}
        rightEl={<AppButton title="+ Create" size="sm" onPress={() => router.push('/(app)/jobs/')} />}
      />
      <View style={{ padding: spacing[4] }}>
        <FilterBar options={JOB_FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[styles.scroll, { paddingTop: 0 }]}
        ListEmptyComponent={<EmptyState title="No jobs" />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        renderItem={({ item: job }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/jobs/${job.id}`)} activeOpacity={0.8}>
            <AppCard padding={spacing[3]}>
              <View style={styles.spaceBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{job.jobCode}</AppText>
                  <AppText variant="bodySmall" color="secondary">{job.styleName} · {job.buyerName}</AppText>
                </View>
                <StatusBadge label={job.status.replace('-', ' ')} variant={jobStatusBadge(job.status)} size="sm" />
              </View>
              <View style={styles.row}>
                <StatItem label="Order" value={String(job.orderQuantity)} />
                <StatItem label="Packed" value={String(job.packingQty)} />
                <StatItem label="Eff." value={`${job.efficiency}%`} color={job.efficiency >= 80 ? tokens.success : tokens.warning} />
              </View>
            </AppCard>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Supervisor: Lines & Bundles ───────────────────────────────────────────────
function SupervisorWork() {
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Jobs & Bundles" tokens={tokens} insets={insets} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>Line 1 Bundles</AppText>
        {bundles.filter((b) => b.lineId === 'line-1').map((b) => (
          <TouchableOpacity key={b.id} onPress={() => router.push(`/(app)/bundles/${b.id}`)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
            <AppCard padding={spacing[3]}>
              <View style={styles.spaceBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                  <AppText variant="caption" color="secondary">{b.jobCode} · {b.styleName} · {b.color} · {b.size}</AppText>
                  <AppText variant="caption" color="secondary">Stage: {b.currentStage} · Qty: {b.quantity}</AppText>
                </View>
                <StatusBadge label={b.status.replace('-', ' ').toUpperCase()} variant={b.status === 'qc-pending' ? 'warning' : b.status === 'packed' ? 'success' : b.status === 'rework' ? 'danger' : 'info'} size="sm" />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Operator: My Work ─────────────────────────────────────────────────────────
function OperatorWork() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');

  const myBundles = bundles.filter((b) => b.operatorId === user?.id || b.lineId === 'line-1');
  const filtered = filter === 'all' ? myBundles
    : filter === 'in-progress' ? myBundles.filter((b) => ['sewing', 'kaja', 'ironing', 'cutting'].includes(b.status))
    : myBundles.filter((b) => ['packed', 'qc-passed', 'packing'].includes(b.status));

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="My Assigned Work" tokens={tokens} insets={insets} />
      <View style={{ padding: spacing[4] }}>
        <FilterBar options={BUNDLE_FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[styles.scroll, { paddingTop: 0 }]}
        ListEmptyComponent={<EmptyState title="No bundles assigned" message="Scan a barcode to get started." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        renderItem={({ item: b }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/bundles/${b.id}`)} activeOpacity={0.8}>
            <AppCard padding={spacing[3]}>
              <View style={styles.spaceBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                  <AppText variant="caption" color="secondary">{b.jobCode} · {b.color} · {b.size} · {b.quantity} pcs</AppText>
                  <AppText variant="caption" color="secondary">Stage: {b.currentStage}</AppText>
                </View>
                <StatusBadge label={b.status.replace('-', ' ').toUpperCase()} variant={b.status === 'rework' ? 'danger' : b.status === 'packed' || b.status === 'qc-passed' ? 'success' : 'info'} size="sm" />
              </View>
            </AppCard>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── QC: Inspection Queue ──────────────────────────────────────────────────────
function QCWork() {
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pending = bundles.filter((b) => b.status === 'qc-pending');

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Inspection Queue" tokens={tokens} insets={insets} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {pending.length === 0
          ? <EmptyState title="Queue empty" message="All bundles inspected." />
          : pending.map((b) => (
              <TouchableOpacity key={b.id} onPress={() => router.push(`/(app)/inspections/${b.id}`)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
                <AppCard padding={spacing[3]}>
                  <View style={styles.spaceBetween}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="code" mono bold>{b.bundleCode}</AppText>
                      <AppText variant="caption" color="secondary">{b.styleName} · {b.color} · {b.size} · {b.quantity} pcs</AppText>
                    </View>
                    <StatusBadge label="PENDING" variant="warning" size="sm" />
                  </View>
                </AppCard>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </View>
  );
}

// ── Store: Movements ──────────────────────────────────────────────────────────
function StoreWork() {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();
  const lowStock = STOCK_ITEMS.filter((s) => s.currentStock < s.minimumStock);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Stock & Movements" tokens={tokens} insets={insets} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {lowStock.map((s) => (
          <View key={s.id} style={[styles.alertCard, { backgroundColor: tokens.dangerLight, borderColor: tokens.danger }]}>
            <AppText variant="label" bold style={{ color: tokens.danger }}>⚠ LOW STOCK</AppText>
            <AppText variant="body">{s.name}</AppText>
            <AppText variant="caption" color="secondary">{s.currentStock} / {s.minimumStock} {s.unit} min · {s.locationName}</AppText>
          </View>
        ))}
        <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[2] }}>All Stock Items</AppText>
        {STOCK_ITEMS.map((s) => (
          <AppCard key={s.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.spaceBetween}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" bold>{s.name}</AppText>
                <AppText variant="caption" color="secondary">{s.code} · {s.locationName}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="label" mono bold style={{ color: s.currentStock < s.minimumStock ? tokens.danger : tokens.success }}>{s.currentStock}</AppText>
                <AppText variant="caption" color="secondary">{s.unit}</AppText>
              </View>
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Packing: Assigned Work ────────────────────────────────────────────────────
function PackingWork() {
  const { tokens } = useThemeStore();
  const { bundles } = useDemoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedSize, setSelectedSize] = useState('L');
  const packBundles = bundles.filter((b) => ['packing', 'packed'].includes(b.status));

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <WorkHeader title="Assigned Packing" tokens={tokens} insets={insets} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}>
        {packBundles.map((b) => (
          <View key={b.id} style={{ marginBottom: spacing[3] }}>
            <GarmentTicketCard
              bundle={b}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              showPackAction={b.status === 'packing'}
              onPackAction={() => router.push(`/(app)/bundles/${b.id}`)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────
function WorkHeader({ title, tokens, insets, rightEl }: { title: string; tokens: any; insets: any; rightEl?: React.ReactNode }) {
  return (
    <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + spacing[3] }]}>
      <AppText variant="h3" bold style={{ flex: 1, color: tokens.textPrimary }}>{title}</AppText>
      {rightEl}
    </View>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: spacing[2] }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: color ?? tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1 },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  row: { flexDirection: 'row', marginTop: spacing[2] },
  alertCard: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[2] },
});
