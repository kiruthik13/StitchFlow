import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { StatusBadge, jobStatusBadge } from '../../../src/design-system/components/StatusBadge';
import { FilterBar } from '../../../src/design-system/components/FilterBar';
import { SearchField } from '../../../src/design-system/components/SearchField';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { Job } from '../../../src/core/types';

// filters translated in render

export default function JobsIndexScreen() {
  const { tokens } = useThemeStore();
  const { jobs } = useDemoStore();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common']);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = jobs.filter((j) => {
    const matchStatus = filter === 'all' || j.status === filter;
    const matchSearch =
      search === '' ||
      j.jobCode.toLowerCase().includes(search.toLowerCase()) ||
      j.styleName.toLowerCase().includes(search.toLowerCase()) ||
      j.buyerName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:workOrdersAndJobs')} showBack />
      <View style={styles.filters}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={t('production:jobSearch')}
        />
        <View style={{ marginTop: spacing[2] }}>
          <FilterBar options={[
            { key: 'all', label: t('common:all') },
            { key: 'active', label: t('common:active') },
            { key: 'on-hold', label: t('common:onHold') },
            { key: 'completed', label: t('common:completed') },
          ]} selected={filter} onSelect={setFilter} />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title={t('production:noJobsFound')} />}
        renderItem={({ item }) => <JobRow job={item} onPress={() => router.push(`/(app)/jobs/${item.id}`)} tokens={tokens} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
      />
    </View>
  );
}

function JobRow({ job, onPress, tokens }: { job: Job; onPress: () => void; tokens: any }) {
  const prog = Math.round((job.packingQty / job.orderQuantity) * 100);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <AppCard padding={spacing[4]}>
        <View style={styles.jobHeader}>
          <View>
            <AppText variant="code" mono bold style={{ color: tokens.textPrimary }}>{job.jobCode}</AppText>
            <AppText variant="bodySmall" color="secondary">{job.buyerName}</AppText>
          </View>
          <StatusBadge label={job.status.replace('-', ' ').toUpperCase()} variant={jobStatusBadge(job.status)} size="sm" />
        </View>
        <AppText variant="body" bold style={{ marginTop: spacing[1], marginBottom: spacing[2] }}>{job.styleName}</AppText>
        <View style={styles.stats}>
          <Stat label="Order" value={String(job.orderQuantity)} tokens={tokens} />
          <Stat label="Cut" value={String(job.cuttingQty)} tokens={tokens} />
          <Stat label="Packed" value={String(job.packingQty)} tokens={tokens} />
          <Stat label="Eff." value={`${job.efficiency}%`} tokens={tokens} />
        </View>
        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: tokens.surfaceSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: tokens.brand, width: `${prog}%` as any }]} />
        </View>
        <View style={styles.footer}>
          <AppText variant="caption" color="secondary">Target: {job.targetDate}</AppText>
          <AppText variant="caption" color={prog >= 80 ? 'success' : prog >= 50 ? 'warning' : 'danger'} mono>{prog}% packed</AppText>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function Stat({ label, value, tokens }: { label: string; value: string; tokens: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label" mono bold style={{ color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { padding: spacing[4] },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stats: { flexDirection: 'row', marginBottom: spacing[2] },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: spacing[1] },
  progressFill: { height: '100%', borderRadius: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
});
