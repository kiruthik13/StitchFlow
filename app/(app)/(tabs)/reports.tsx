import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { TODAY_SHIFT } from '../../../src/fixtures/mockData';
import { ROLE_DISPLAY_NAMES } from '../../../src/core/permissions';

const PRODUCTION_REPORTS = [
  { id: 'shift', title: 'Shift Summary Report', desc: "Today's shift production data" },
  { id: 'job', title: 'Job-wise Production Report', desc: 'Quantity breakdown by job' },
  { id: 'stage', title: 'Stage Summary Matrix', desc: 'WIP quantities by stage' },
  { id: 'quality', title: 'Quality Report', desc: 'DHU, Pass Rate, Rework %' },
  { id: 'efficiency', title: 'Efficiency Report', desc: 'SAM efficiency, Target vs Actual' },
  { id: 'bundle', title: 'Bundle Tracking Report', desc: 'Bundle movement history' },
  { id: 'rework', title: 'Rework Analysis Report', desc: 'Defect codes, rework trends' },
];

const STAGE_MATRIX = [
  { stage: 'Cutting', qty: 1200, wip: 0, done: 1200 },
  { stage: 'Sewing', qty: 1200, wip: 180, done: 800 },
  { stage: 'Kaja/Button', qty: 800, wip: 60, done: 740 },
  { stage: 'Ironing', qty: 740, wip: 240, done: 500 },
  { stage: 'QC', qty: 500, wip: 80, done: 420 },
  { stage: 'Packing', qty: 420, wip: 24, done: 196 },
];

export default function ReportsTabScreen() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const isSimpleRole = user?.role === 'operator' || user?.role === 'packing-staff';

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + spacing[3] }]}>
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>Reports</AppText>
        <AppText variant="caption" color="secondary">{ROLE_DISPLAY_NAMES[user?.role ?? 'operator']}</AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>

        {/* Demo export notice */}
        <View style={[styles.exportNotice, { backgroundColor: tokens.warningLight, borderColor: tokens.warning }]}>
          <AppText variant="label" bold style={{ color: tokens.warning }}>📤 Export Note</AppText>
          <AppText variant="caption" color="secondary">PDF/Excel export requires server connection. Available in production mode only.</AppText>
        </View>

        {isSimpleRole ? (
          <>
            {/* Simple role: My output */}
            <SectionHead label="My Output Today" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.statRow}>
                <StatBlock label="Completed" value="267" color={tokens.success} />
                <StatBlock label="Target" value="320" color={tokens.textPrimary} />
                <StatBlock label="Efficiency" value="83%" color={tokens.warning} />
              </View>
            </AppCard>

            <SectionHead label="Shift Summary" />
            <ShiftSummaryCard tokens={tokens} />
          </>
        ) : (
          <>
            {/* Full reports menu */}
            <SectionHead label="Production Reports" />
            {PRODUCTION_REPORTS.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelectedReport(selectedReport === r.id ? null : r.id)}
                activeOpacity={0.8}
                style={{ marginBottom: spacing[2] }}
              >
                <AppCard padding={spacing[4]}>
                  <View style={styles.reportRow}>
                    <AppText style={{ fontSize: 20, marginRight: spacing[3] }}>📊</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" bold>{r.title}</AppText>
                      <AppText variant="caption" color="secondary">{r.desc}</AppText>
                    </View>
                    <AppText color="secondary">{selectedReport === r.id ? '▼' : '›'}</AppText>
                  </View>

                  {/* Inline preview for selected report */}
                  {selectedReport === r.id && (
                    <View style={[styles.preview, { borderTopColor: tokens.border }]}>
                      {r.id === 'shift' && <ShiftSummaryCard tokens={tokens} />}
                      {r.id === 'stage' && <StageSummaryTable tokens={tokens} />}
                      {r.id === 'quality' && <QualitySummary tokens={tokens} />}
                      {r.id === 'efficiency' && <EfficiencySummary tokens={tokens} />}
                      {r.id !== 'shift' && r.id !== 'stage' && r.id !== 'quality' && r.id !== 'efficiency' && (
                        <AppText variant="caption" color="secondary">
                          Report data for "{r.title}" will be available in production mode.
                        </AppText>
                      )}
                    </View>
                  )}
                </AppCard>
              </TouchableOpacity>
            ))}

            {/* Export buttons */}
            <SectionHead label="Export" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <AppButton
                title="📄 Export PDF"
                variant="secondary"
                fullWidth
                style={{ marginBottom: spacing[2], opacity: 0.5 }}
                onPress={() => Alert.alert('Demo Mode', 'PDF export requires server connection. Not available in demo mode.')}
              />
              <AppButton
                title="📊 Export Excel"
                variant="secondary"
                fullWidth
                style={{ opacity: 0.5 }}
                onPress={() => Alert.alert('Demo Mode', 'Excel export requires server connection. Not available in demo mode.')}
              />
            </AppCard>

            {/* Dispatch summary */}
            {(user?.role === 'store-dispatch' || user?.role === 'factory-manager' || user?.role === 'md') && (
              <>
                <SectionHead label="Dispatch Register" />
                <AppCard padding={spacing[4]}>
                  <AppText variant="label" bold style={{ marginBottom: spacing[2] }}>Carton Dispatch Summary</AppText>
                  <View style={styles.statRow}>
                    <StatBlock label="Sealed" value="2" color={tokens.success} />
                    <StatBlock label="Dispatched" value="0" color={tokens.textPrimary} />
                    <StatBlock label="Pending" value="48" color={tokens.warning} />
                  </View>
                </AppCard>
              </>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

function ShiftSummaryCard({ tokens }: { tokens: any }) {
  const shift = TODAY_SHIFT;
  return (
    <View>
      <View style={[{ flexDirection: 'row', marginBottom: spacing[2] }]}>
        <StatBlock label="Target" value={String(shift.targetQty)} color={tokens.textPrimary} />
        <StatBlock label="Actual" value={String(shift.actualQty)} color={tokens.brand} />
        <StatBlock label="Packed" value={String(shift.packingQty)} color={tokens.success} />
        <StatBlock label="Rework" value={String(shift.reworkQty)} color={tokens.danger} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <StatBlock label="Efficiency" value={`${shift.efficiency}%`} color={tokens.warning} />
        <StatBlock label="Pace" value={`${shift.pacePerHour}/hr`} color={tokens.textPrimary} />
      </View>
    </View>
  );
}

function StageSummaryTable({ tokens }: { tokens: any }) {
  return (
    <View>
      {/* Header */}
      <View style={[styles.tableRow, { backgroundColor: tokens.surfaceSecondary }]}>
        <AppText variant="caption" bold style={{ flex: 2, color: tokens.textSecondary }}>Stage</AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>Total</AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>WIP</AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>Done</AppText>
      </View>
      {STAGE_MATRIX.map((s, i) => (
        <View key={s.stage} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? 'transparent' : tokens.surfaceSecondary }]}>
          <AppText variant="label" style={{ flex: 2 }}>{s.stage}</AppText>
          <AppText variant="label" mono style={{ flex: 1, textAlign: 'right', color: tokens.textPrimary }}>{s.qty}</AppText>
          <AppText variant="label" mono style={{ flex: 1, textAlign: 'right', color: tokens.warning }}>{s.wip}</AppText>
          <AppText variant="label" mono style={{ flex: 1, textAlign: 'right', color: tokens.success }}>{s.done}</AppText>
        </View>
      ))}
    </View>
  );
}

function QualitySummary({ tokens }: { tokens: any }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <StatBlock label="Inspected" value="200" color={tokens.textPrimary} />
      <StatBlock label="Passed" value="180" color={tokens.success} />
      <StatBlock label="Rework" value="15" color={tokens.warning} />
      <StatBlock label="Rejected" value="5" color={tokens.danger} />
    </View>
  );
}

function EfficiencySummary({ tokens }: { tokens: any }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <StatBlock label="SAM" value="14.5" color={tokens.textPrimary} />
      <StatBlock label="Efficiency" value="83.4%" color={tokens.warning} />
      <StatBlock label="Target" value="320" color={tokens.brand} />
      <StatBlock label="Actual" value="267" color={tokens.success} />
    </View>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[2] }}>
      {label}
    </AppText>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText style={{ fontSize: 20, fontWeight: '700', color, fontFamily: 'JetBrainsMono_700Bold' }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1 },
  scroll: { padding: spacing[4] },
  exportNotice: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[3] },
  statRow: { flexDirection: 'row' },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  preview: { borderTopWidth: 1, paddingTop: spacing[3], marginTop: spacing[3] },
  tableRow: { flexDirection: 'row', paddingVertical: spacing[1.5], paddingHorizontal: spacing[2], borderRadius: 4 },
});
