import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useThemeStore } from '../../../store/themeStore';
import { AppCard } from '../AppCard';
import { AppText } from '../AppText';
import { StatusBadge } from '../StatusBadge';
type BadgeVariant = React.ComponentProps<typeof StatusBadge>['variant'];
import { PressableScale } from '../PressableScale';
import { spacing } from '../../tokens/spacing';
import { radii } from '../../tokens/radii';

export interface PipelineStageItem {
  key: string;
  label: string;
  quantity: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}

export function StagePipeline({
  stages,
  maxTotal,
}: {
  stages: PipelineStageItem[];
  maxTotal?: number;
}) {
  const { tokens } = useThemeStore();
  const ceiling = maxTotal && maxTotal > 0 ? maxTotal : Math.max(1, ...stages.map((s) => s.quantity));

  const colorFor = (tone?: PipelineStageItem['tone']) => {
    if (tone === 'success') return tokens.success;
    if (tone === 'warning') return tokens.warning;
    if (tone === 'danger') return tokens.danger;
    return tokens.brand;
  };

  return (
    <AppCard padding={spacing[4]}>
      <View style={{ gap: spacing[2.5] }}>
        {stages.map((stage) => {
          const pct = Math.min(100, Math.round((stage.quantity / ceiling) * 100));
          const barColor = colorFor(stage.tone);
          return (
            <View key={stage.key}>
              <View style={styles.stageTop}>
                <AppText variant="caption" bold style={{ color: tokens.textPrimary, flex: 1 }} numberOfLines={1}>
                  {stage.label}
                </AppText>
                <AppText variant="caption" mono bold style={{ color: tokens.textPrimary }}>
                  {stage.quantity.toLocaleString()}
                </AppText>
              </View>
              <View style={[styles.stageTrack, { backgroundColor: tokens.surfaceSecondary }]}>
                <View style={[styles.stageFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

export function QualitySummaryCard({
  inspected,
  passed,
  rework,
  rejected,
  released,
  labels,
}: {
  inspected: number;
  passed: number;
  rework: number;
  rejected: number;
  released?: number;
  labels: {
    passed: string;
    rework: string;
    rejected: string;
    released?: string;
    passRate: string;
  };
}) {
  const { tokens } = useThemeStore();
  const total = Math.max(1, inspected);
  const passPct = inspected > 0 ? Math.round((passed / total) * 100) : 0;
  const rewPct = inspected > 0 ? Math.round((rework / total) * 100) : 0;
  const rejPct = inspected > 0 ? Math.max(0, 100 - passPct - rewPct) : 0;

  return (
    <AppCard padding={spacing[4]}>
      <View style={styles.qualHeader}>
        <AppText variant="caption" color="secondary" uppercase bold>
          {labels.passRate}
        </AppText>
        <AppText style={[styles.passRateNum, { color: tokens.successText }]}>{passPct}%</AppText>
      </View>

      <View style={[styles.segmentedBar, { backgroundColor: tokens.surfaceSecondary }]}>
        {inspected > 0 && (
          <>
            {passPct > 0 && <View style={{ flex: passPct, backgroundColor: tokens.success }} />}
            {rewPct > 0 && <View style={{ flex: rewPct, backgroundColor: tokens.warning }} />}
            {rejPct > 0 && <View style={{ flex: rejPct, backgroundColor: tokens.danger }} />}
          </>
        )}
      </View>

      <View style={styles.qualGrid}>
        <View style={styles.qualCell}>
          <View style={[styles.dot, { backgroundColor: tokens.success }]} />
          <View>
            <AppText variant="caption" color="secondary">{labels.passed}</AppText>
            <AppText variant="label" mono bold>{passed.toLocaleString()}</AppText>
          </View>
        </View>
        <View style={styles.qualCell}>
          <View style={[styles.dot, { backgroundColor: tokens.warning }]} />
          <View>
            <AppText variant="caption" color="secondary">{labels.rework}</AppText>
            <AppText variant="label" mono bold>{rework.toLocaleString()}</AppText>
          </View>
        </View>
        <View style={styles.qualCell}>
          <View style={[styles.dot, { backgroundColor: tokens.danger }]} />
          <View>
            <AppText variant="caption" color="secondary">{labels.rejected}</AppText>
            <AppText variant="label" mono bold>{rejected.toLocaleString()}</AppText>
          </View>
        </View>
      </View>

      {released !== undefined && labels.released ? (
        <View style={[styles.releaseFoot, { borderTopColor: tokens.border }]}>
          <AppText variant="caption" color="secondary">{labels.released}</AppText>
          <AppText variant="label" mono bold style={{ color: tokens.brand }}>
            {released.toLocaleString()}
          </AppText>
        </View>
      ) : null}
    </AppCard>
  );
}

export function ProductionTrendChart({
  bars,
}: {
  bars: Array<{ label: string; value: number; tone?: 'brand' | 'success' | 'warning' }>;
}) {
  const { tokens } = useThemeStore();
  if (bars.length === 0) return null;
  const maxVal = Math.max(1, ...bars.map((b) => b.value));

  return (
    <AppCard padding={spacing[4]}>
      <View style={styles.chartRow}>
        {bars.map((b) => {
          const heightPct = Math.max(8, Math.round((b.value / maxVal) * 100));
          const col = b.tone === 'success' ? tokens.success : b.tone === 'warning' ? tokens.warning : tokens.brand;
          return (
            <View key={b.label} style={styles.barCol}>
              <AppText variant="caption" mono style={{ fontSize: 10, color: tokens.textSecondary, marginBottom: 4 }}>
                {b.value}
              </AppText>
              <View style={[styles.barTrack, { backgroundColor: tokens.surfaceSecondary }]}>
                <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: col }]} />
              </View>
              <AppText variant="caption" color="secondary" numberOfLines={1} style={{ fontSize: 10, marginTop: 4 }}>
                {b.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

export function WorkOrderPreview({
  code,
  title,
  subtitle,
  statusLabel,
  statusVariant = 'info',
  progressPct,
  onPress,
}: {
  code: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusVariant?: BadgeVariant;
  progressPct?: number;
  onPress?: () => void;
}) {
  const { tokens } = useThemeStore();
  const body = (
    <AppCard padding={spacing[3.5]}>
      <View style={styles.woTop}>
        <View style={{ flex: 1, marginRight: spacing[2] }}>
          <AppText variant="caption" mono bold style={{ color: tokens.brand }}>
            {code}
          </AppText>
          <AppText variant="label" bold numberOfLines={1} style={{ marginTop: 2 }}>
            {title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.woRight}>
          <StatusBadge label={statusLabel} variant={statusVariant} size="sm" />
          {onPress ? <ChevronRight size={16} color={tokens.textSecondary} /> : null}
        </View>
      </View>
      {progressPct !== undefined && (
        <View style={[styles.stageTrack, { backgroundColor: tokens.surfaceSecondary, marginTop: spacing[2.5] }]}>
          <View
            style={[
              styles.stageFill,
              { width: `${Math.max(0, Math.min(100, progressPct))}%`, backgroundColor: tokens.brand },
            ]}
          />
        </View>
      )}
    </AppCard>
  );

  if (onPress) {
    return <PressableScale onPress={onPress}>{body}</PressableScale>;
  }
  return body;
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{ id: string; title: string; subtitle: string; time?: string; tone?: 'brand' | 'success' | 'warning' | 'danger' }>;
}) {
  const { tokens } = useThemeStore();
  if (items.length === 0) return null;

  return (
    <AppCard padding={spacing[3.5]}>
      {items.map((item, idx) => {
        const dotColor =
          item.tone === 'success'
            ? tokens.success
            : item.tone === 'warning'
              ? tokens.warning
              : item.tone === 'danger'
                ? tokens.danger
                : tokens.brand;
        const isLast = idx === items.length - 1;
        return (
          <View key={item.id} style={[styles.tlRow, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
            <View style={[styles.tlDot, { backgroundColor: dotColor }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {item.subtitle}
              </AppText>
            </View>
            {item.time ? (
              <AppText variant="caption" mono color="secondary" style={{ fontSize: 11 }}>
                {item.time}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  stageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  stageFill: { height: '100%', borderRadius: 4 },
  qualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  passRateNum: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  segmentedBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  qualGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[3], gap: spacing[2] },
  qualCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  releaseFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[2.5], borderTopWidth: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing[2], height: 120 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '70%', flex: 1, borderRadius: radii.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: radii.sm },
  woTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  woRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[2.5] },
  tlDot: { width: 8, height: 8, borderRadius: 4 },
});
