import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarClock,
  ClipboardList,
  Layers,
  ShieldCheck,
  TrendingUp,
  PackageSearch,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  Box,
  Truck,
} from 'lucide-react-native';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import { TODAY_SHIFT } from '../../../src/fixtures/mockData';
import { ROLE_DISPLAY_NAMES } from '../../../src/core/permissions';

interface ReportDefinition {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  category: 'floor' | 'quality' | 'tracking';
}

const PRODUCTION_REPORTS: ReportDefinition[] = [
  { id: 'shift', title: 'Shift Summary Report', desc: "Today's shift output vs planned target", icon: CalendarClock, category: 'floor' },
  { id: 'job', title: 'Job-wise Production Report', desc: 'Quantity breakdown by work order and line', icon: ClipboardList, category: 'floor' },
  { id: 'stage', title: 'Stage Summary Matrix', desc: 'Active WIP and completed quantities across stages', icon: Layers, category: 'floor' },
  { id: 'quality', title: 'Quality & Inspection Report', desc: 'Pass rate, DHU, rework and rejection counts', icon: ShieldCheck, category: 'quality' },
  { id: 'efficiency', title: 'Line Efficiency Analysis', desc: 'SAM efficiency, pace, and performance targets', icon: TrendingUp, category: 'quality' },
  { id: 'bundle', title: 'Bundle Tracking History', desc: 'Complete QR scan lifecycle across stations', icon: PackageSearch, category: 'tracking' },
  { id: 'rework', title: 'Rework & Defect Log', desc: 'Top defect codes, reinspection loop metrics', icon: RefreshCw, category: 'tracking' },
];

const STAGE_MATRIX = [
  { stage: 'Cutting', qty: 1200, wip: 0, done: 1200 },
  { stage: 'Sewing', qty: 1200, wip: 180, done: 800 },
  { stage: 'Kaja/Button', qty: 800, wip: 60, done: 740 },
  { stage: 'Ironing', qty: 740, wip: 240, done: 500 },
  { stage: 'QC Inspection', qty: 500, wip: 80, done: 420 },
  { stage: 'Packing', qty: 420, wip: 24, done: 196 },
];

export default function ReportsTabScreen() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedReport, setSelectedReport] = useState<string | null>('shift');

  const isSimpleRole = user?.role === 'operator' || user?.role === 'packing-staff';

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      {/* Refined Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
              Reports & Logs
            </AppText>
            <AppText variant="caption" color="secondary">
              Production analytics and shift records
            </AppText>
          </View>
          <StatusBadge
            label={ROLE_DISPLAY_NAMES[user?.role ?? 'operator']}
            variant="neutral"
            size="sm"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline Demo Export Notice */}
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: tokens.surfaceSecondary,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={[styles.noticeIconWrap, { backgroundColor: tokens.warningLight }]}>
            <Info size={16} color={tokens.warning} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" bold style={{ color: tokens.textPrimary }}>
              DEMO EXPORT NOTICE
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              Standard PDF and Excel exports require a live StitchFlow enterprise server. Previewing with floor mock datasets.
            </AppText>
          </View>
        </View>

        {isSimpleRole ? (
          <>
            {/* Operator / Packer Output View */}
            <SectionHead label="My Shift Performance" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.statGrid}>
                <StatCell label="Completed" value="267" unit="pcs" color={tokens.success} />
                <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
                <StatCell label="Target" value="320" unit="pcs" color={tokens.textPrimary} />
                <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
                <StatCell label="Efficiency" value="83.4" unit="%" color={tokens.warning} />
              </View>
            </AppCard>

            <SectionHead label="Line Shift Summary" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <ShiftSummaryCard tokens={tokens} />
            </AppCard>
          </>
        ) : (
          <>
            {/* Full Industrial Reports Directory */}
            <SectionHead label="Floor Reports Directory" />
            <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
              {PRODUCTION_REPORTS.map((r) => {
                const isExpanded = selectedReport === r.id;
                const IconComponent = r.icon;
                return (
                  <AppCard
                    key={r.id}
                    padding={spacing[3.5]}
                    style={[
                      styles.reportItemCard,
                      isExpanded && { borderColor: tokens.brand, borderWidth: 1.5 },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setSelectedReport(isExpanded ? null : r.id)}
                      activeOpacity={0.8}
                      style={styles.reportRow}
                    >
                      <View
                        style={[
                          styles.reportIconBox,
                          {
                            backgroundColor: isExpanded ? tokens.brand : tokens.brandLight,
                          },
                        ]}
                      >
                        <IconComponent
                          size={18}
                          color={isExpanded ? tokens.textInverse : tokens.brand}
                          strokeWidth={2}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing[3] }}>
                        <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
                          {r.title}
                        </AppText>
                        <AppText variant="caption" color="secondary" numberOfLines={1}>
                          {r.desc}
                        </AppText>
                      </View>
                      <View style={[styles.chevronWrap, { backgroundColor: tokens.surfaceSecondary }]}>
                        {isExpanded ? (
                          <ChevronDown size={16} color={tokens.textPrimary} strokeWidth={2} />
                        ) : (
                          <ChevronRight size={16} color={tokens.textSecondary} strokeWidth={2} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Report Preview Surface */}
                    {isExpanded && (
                      <View style={[styles.previewArea, { borderTopColor: tokens.border }]}>
                        {r.id === 'shift' && <ShiftSummaryCard tokens={tokens} />}
                        {r.id === 'stage' && <StageSummaryTable tokens={tokens} />}
                        {r.id === 'quality' && <QualitySummary tokens={tokens} />}
                        {r.id === 'efficiency' && <EfficiencySummary tokens={tokens} />}
                        {r.id !== 'shift' &&
                          r.id !== 'stage' &&
                          r.id !== 'quality' &&
                          r.id !== 'efficiency' && (
                            <View style={styles.emptyPreview}>
                              <Info size={16} color={tokens.textSecondary} />
                              <AppText variant="caption" color="secondary" style={{ marginLeft: spacing[2] }}>
                                Full granular ledger for "{r.title}" connects in production mode.
                              </AppText>
                            </View>
                          )}
                      </View>
                    )}
                  </AppCard>
                );
              })}
            </View>

            {/* Export Actions */}
            <SectionHead label="Data Export & Archiving" />
            <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.exportGrid}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    Alert.alert(
                      'StitchFlow Demo',
                      'PDF export generation requires active sync with StitchFlow Cloud server.'
                    )
                  }
                  style={[
                    styles.exportButton,
                    {
                      backgroundColor: tokens.surfaceSecondary,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <FileText size={18} color={tokens.brand} strokeWidth={2} />
                  <AppText variant="label" bold style={{ color: tokens.textPrimary, marginLeft: spacing[2] }}>
                    Export PDF
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    Alert.alert(
                      'StitchFlow Demo',
                      'Excel (.xlsx) worksheet export requires active sync with StitchFlow Cloud server.'
                    )
                  }
                  style={[
                    styles.exportButton,
                    {
                      backgroundColor: tokens.surfaceSecondary,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <FileSpreadsheet size={18} color={tokens.brand} strokeWidth={2} />
                  <AppText variant="label" bold style={{ color: tokens.textPrimary, marginLeft: spacing[2] }}>
                    Export Excel
                  </AppText>
                </TouchableOpacity>
              </View>
            </AppCard>

            {/* Dispatch Register for Authorized Roles */}
            {(user?.role === 'store-dispatch' ||
              user?.role === 'factory-manager' ||
              user?.role === 'md') && (
                <>
                  <SectionHead label="Dispatch Movement Register" />
                  <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
                    <View style={styles.dispatchHeader}>
                      <Truck size={16} color={tokens.brand} />
                      <AppText variant="label" bold style={{ marginLeft: spacing[2] }}>
                        Finished Goods Dispatch Register
                      </AppText>
                    </View>
                    <View style={styles.statGrid}>
                      <StatCell label="Sealed Cartons" value="2" unit="ctn" color={tokens.success} />
                      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
                      <StatCell label="Dispatched" value="0" unit="ctn" color={tokens.textPrimary} />
                      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
                      <StatCell label="Pending Verification" value="48" unit="ctn" color={tokens.warning} />
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
    <View style={styles.shiftContainer}>
      <View style={styles.statGrid}>
        <StatCell label="Shift Target" value={String(shift.targetQty)} unit="pcs" color={tokens.textPrimary} />
        <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
        <StatCell label="Actual Output" value={String(shift.actualQty)} unit="pcs" color={tokens.brand} />
        <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
        <StatCell label="Packed" value={String(shift.packingQty)} unit="pcs" color={tokens.success} />
      </View>

      <View style={[styles.hDivider, { backgroundColor: tokens.border }]} />

      <View style={styles.statGrid}>
        <StatCell label="Rework" value={String(shift.reworkQty)} unit="pcs" color={tokens.danger} />
        <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
        <StatCell label="Efficiency" value={`${shift.efficiency}`} unit="%" color={tokens.warning} />
        <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
        <StatCell label="Run Pace" value={`${shift.pacePerHour}`} unit="/hr" color={tokens.textPrimary} />
      </View>
    </View>
  );
}

function StageSummaryTable({ tokens }: { tokens: any }) {
  return (
    <View style={styles.tableContainer}>
      <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: tokens.surfaceSecondary }]}>
        <AppText variant="caption" bold style={{ flex: 2, color: tokens.textSecondary }}>
          STAGE
        </AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>
          TOTAL
        </AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>
          WIP
        </AppText>
        <AppText variant="caption" bold style={{ flex: 1, textAlign: 'right', color: tokens.textSecondary }}>
          DONE
        </AppText>
      </View>
      {STAGE_MATRIX.map((s, i) => (
        <View
          key={s.stage}
          style={[
            styles.tableRow,
            { backgroundColor: i % 2 === 0 ? 'transparent' : tokens.surfaceSecondary },
          ]}
        >
          <AppText variant="label" style={{ flex: 2, color: tokens.textPrimary }}>
            {s.stage}
          </AppText>
          <AppText variant="label" mono bold style={{ flex: 1, textAlign: 'right', color: tokens.textPrimary }}>
            {s.qty}
          </AppText>
          <AppText variant="label" mono bold style={{ flex: 1, textAlign: 'right', color: tokens.warning }}>
            {s.wip}
          </AppText>
          <AppText variant="label" mono bold style={{ flex: 1, textAlign: 'right', color: tokens.success }}>
            {s.done}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function QualitySummary({ tokens }: { tokens: any }) {
  return (
    <View style={styles.statGrid}>
      <StatCell label="Inspected" value="200" unit="pcs" color={tokens.textPrimary} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Passed" value="180" unit="pcs" color={tokens.success} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Rework" value="15" unit="pcs" color={tokens.warning} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Rejected" value="5" unit="pcs" color={tokens.danger} />
    </View>
  );
}

function EfficiencySummary({ tokens }: { tokens: any }) {
  return (
    <View style={styles.statGrid}>
      <StatCell label="SAM Std" value="14.5" unit="m" color={tokens.textPrimary} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Efficiency" value="83.4" unit="%" color={tokens.warning} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Target" value="320" unit="pcs" color={tokens.brand} />
      <View style={[styles.vertSep, { backgroundColor: tokens.border }]} />
      <StatCell label="Actual" value="267" unit="pcs" color={tokens.success} />
    </View>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <AppText
      variant="caption"
      color="secondary"
      uppercase
      bold
      style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[2] }}
    >
      {label}
    </AppText>
  );
}

function StatCell({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <View style={styles.statCell}>
      <AppText variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.statValueRow}>
        <AppText variant="h3" bold style={{ color, fontVariant: ['tabular-nums'] }}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="caption" color="secondary" style={{ marginLeft: 2, marginBottom: 2 }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    padding: spacing[4],
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[2.5],
  },
  noticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportItemCard: {
    marginBottom: 0,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  reportIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewArea: {
    borderTopWidth: 1,
    paddingTop: spacing[3],
    marginTop: spacing[3],
  },
  emptyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  vertSep: {
    width: 1,
    height: 28,
    opacity: 0.6,
  },
  hDivider: {
    height: 1,
    marginVertical: spacing[3],
    opacity: 0.6,
  },
  shiftContainer: {
    paddingVertical: spacing[1],
  },
  tableContainer: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2.5],
    alignItems: 'center',
  },
  tableHeaderRow: {
    paddingVertical: spacing[1.5],
  },
  exportGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
  },
  dispatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
});
