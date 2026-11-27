import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react-native';
import { useThemeStore } from '../../../store/themeStore';
import { AppCard } from '../AppCard';
import { AppText } from '../AppText';
import { StatusBadge } from '../StatusBadge';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { PressableScale } from '../PressableScale';
import { spacing } from '../../tokens/spacing';
import { radii } from '../../tokens/radii';

export function DashboardSection({
  title,
  count,
  actionLabel,
  onAction,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { tokens } = useThemeStore();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitleWrap}>
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {title}
        </AppText>
        {count !== undefined && (
          <View style={[styles.countPill, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
            <AppText variant="caption" mono bold style={{ color: tokens.textPrimary, fontSize: 11 }}>
              {count}
            </AppText>
          </View>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onAction();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.sectionAction}
        >
          <AppText variant="caption" bold style={{ color: tokens.brand }}>
            {actionLabel}
          </AppText>
          <ChevronRight size={14} color={tokens.brand} strokeWidth={2.4} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PremiumKPICard({
  label,
  value,
  unit,
  subtitle,
  badge,
  badgeVariant = 'info',
  progress,
  accentColor,
  onPress,
}: {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  progress?: number;
  accentColor?: string;
  onPress?: () => void;
}) {
  const { tokens } = useThemeStore();
  const barColor = accentColor ?? tokens.brand;
  const pct = progress !== undefined ? Math.max(0, Math.min(100, progress)) : undefined;

  const content = (
    <AppCard padding={spacing[4]} style={{ borderTopWidth: 3, borderTopColor: barColor }}>
      <View style={styles.kpiHeader}>
        <AppText variant="caption" color="secondary" uppercase bold style={{ flex: 1, letterSpacing: 0.5 }}>
          {label}
        </AppText>
        {badge ? <StatusBadge label={badge} variant={badgeVariant} size="sm" /> : null}
      </View>
      <View style={styles.kpiValueRow}>
        <AppText style={[styles.kpiHeroValue, { color: tokens.textPrimary }]} numberOfLines={1}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </AppText>
        {unit ? (
          <AppText variant="caption" color="secondary" style={{ marginLeft: spacing[1.5] }}>
            {unit}
          </AppText>
        ) : null}
      </View>
      {subtitle ? (
        <AppText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: spacing[1] }}>
          {subtitle}
        </AppText>
      ) : null}
      {pct !== undefined && (
        <View style={[styles.track, { backgroundColor: tokens.surfaceSecondary, marginTop: spacing[3] }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </AppCard>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
      >
        {content}
      </PressableScale>
    );
  }
  return content;
}

export function CompactMetricCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'default',
  onPress,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}) {
  const { tokens } = useThemeStore();
  const toneColor =
    tone === 'success'
      ? tokens.successText
      : tone === 'warning'
        ? tokens.warningText
        : tone === 'danger'
          ? tokens.dangerText
          : tone === 'brand'
            ? tokens.brand
            : tokens.textPrimary;

  const iconBg =
    tone === 'success'
      ? tokens.successLight
      : tone === 'warning'
        ? tokens.warningLight
        : tone === 'danger'
          ? tokens.dangerLight
          : tone === 'brand'
            ? tokens.brandLight
            : tokens.surfaceSecondary;

  const body = (
    <AppCard padding={spacing[3]} style={styles.compactCard}>
      <View style={styles.compactTop}>
        <AppText variant="caption" color="secondary" numberOfLines={2} style={{ flex: 1, fontWeight: '600' }}>
          {label}
        </AppText>
        {icon ? <View style={[styles.compactIcon, { backgroundColor: iconBg }]}>{icon}</View> : null}
      </View>
      <AppText style={[styles.compactValue, { color: toneColor }]} numberOfLines={1}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {subtitle}
        </AppText>
      ) : null}
    </AppCard>
  );

  if (onPress) {
    return (
      <PressableScale
        style={styles.compactWrap}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
      >
        {body}
      </PressableScale>
    );
  }
  return <View style={styles.compactWrap}>{body}</View>;
}

export function ProductionProgressCard({
  title,
  actual,
  target,
  unit = 'pcs',
  subtitle,
}: {
  title: string;
  actual: number;
  target: number;
  unit?: string;
  subtitle?: string;
}) {
  const { tokens } = useThemeStore();
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  const barColor = pct >= 85 ? tokens.success : pct >= 50 ? tokens.brand : tokens.warning;

  return (
    <AppCard padding={spacing[4]}>
      <View style={styles.progressHeader}>
        <View style={{ flex: 1, marginRight: spacing[2] }}>
          <AppText variant="label" bold numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.pctPill, { backgroundColor: tokens.brandLight }]}>
          <AppText variant="caption" mono bold style={{ color: tokens.brand }}>
            {pct}%
          </AppText>
        </View>
      </View>
      <View style={[styles.trackLg, { backgroundColor: tokens.surfaceSecondary, marginTop: spacing[3] }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.progressFooter}>
        <AppText variant="caption" mono bold style={{ color: tokens.textPrimary }}>
          {actual.toLocaleString()} {unit}
        </AppText>
        <AppText variant="caption" color="secondary" mono>
          / {target.toLocaleString()} {unit}
        </AppText>
      </View>
    </AppCard>
  );
}

export function PriorityActionCard({
  title,
  subtitle,
  count,
  tone = 'warning',
  onPress,
}: {
  title: string;
  subtitle: string;
  count?: number;
  tone?: 'warning' | 'danger' | 'brand';
  onPress: () => void;
}) {
  const { tokens } = useThemeStore();
  const accent = tone === 'danger' ? tokens.danger : tone === 'warning' ? tokens.warning : tokens.brand;
  const bg = tone === 'danger' ? tokens.dangerLight : tone === 'warning' ? tokens.warningLight : tokens.brandLight;
  const textCol = tone === 'danger' ? tokens.dangerText : tone === 'warning' ? tokens.warningText : tokens.brand;

  return (
    <PressableScale
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
    >
      <AppCard padding={spacing[3]} style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
        <View style={styles.priorityRow}>
          <View style={[styles.priorityIcon, { backgroundColor: bg }]}>
            <AlertTriangle size={16} color={textCol} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" bold numberOfLines={1}>
              {title}
            </AppText>
            <AppText variant="caption" color="secondary" numberOfLines={2}>
              {subtitle}
            </AppText>
          </View>
          {count !== undefined && (
            <View style={[styles.countPill, { backgroundColor: bg, borderColor: 'transparent' }]}>
              <AppText variant="caption" mono bold style={{ color: textCol }}>
                {count}
              </AppText>
            </View>
          )}
          <ChevronRight size={16} color={tokens.textSecondary} />
        </View>
      </AppCard>
    </PressableScale>
  );
}

export function DashboardQuickAction({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  const { tokens } = useThemeStore();
  return (
    <PressableScale
      style={styles.quickActionWrap}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
    >
      <AppCard padding={spacing[3]} style={styles.quickActionCard}>
        <View style={styles.quickActionTop}>
          <View style={[styles.quickActionIcon, { backgroundColor: tokens.brandLight }]}>{icon}</View>
          {badge !== undefined && badge > 0 && (
            <View style={[styles.badgeDot, { backgroundColor: tokens.danger }]}>
              <AppText style={{ color: tokens.brandButtonText, fontSize: 10, fontWeight: '700' }}>{badge}</AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" bold numberOfLines={2} style={{ color: tokens.textPrimary, marginTop: spacing[2] }}>
          {label}
        </AppText>
      </AppCard>
    </PressableScale>
  );
}

export function FactorySelector({
  items,
  selectedId,
  onSelect,
}: {
  items: Array<{ id: string; label: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { tokens } = useThemeStore();
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(item.id);
            }}
            style={[
              styles.selectorChip,
              {
                backgroundColor: active ? tokens.brandButton : tokens.surface,
                borderColor: active ? tokens.brandButton : tokens.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              bold
              style={{ color: active ? tokens.brandButtonText : tokens.textPrimary }}
              numberOfLines={1}
            >
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function ShiftIndicator({ label, lineName }: { label: string; lineName?: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.shiftStrip, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
      <Clock size={14} color={tokens.brand} strokeWidth={2.2} />
      <AppText variant="caption" bold style={{ color: tokens.textPrimary, flexShrink: 1 }} numberOfLines={1}>
        {label}
      </AppText>
      {lineName ? (
        <AppText variant="caption" color="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          · {lineName}
        </AppText>
      ) : null}
    </View>
  );
}

export function SyncStatusIndicator({ online, pendingCount = 0 }: { online: boolean; pendingCount?: number }) {
  const { tokens } = useThemeStore();
  return (
    <View
      style={[
        styles.syncPill,
        {
          backgroundColor: online ? tokens.successLight : tokens.warningLight,
          borderColor: tokens.border,
        },
      ]}
    >
      {online ? <Wifi size={13} color={tokens.successText} /> : <WifiOff size={13} color={tokens.warningText} />}
      <AppText variant="caption" bold style={{ color: online ? tokens.successText : tokens.warningText, fontSize: 11 }}>
        {pendingCount > 0 ? `${pendingCount}` : online ? 'SYNC' : 'OFFLINE'}
      </AppText>
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
      <LoadingSkeleton lines={1} height={116} />
      <View style={{ flexDirection: 'row', gap: spacing[2.5] }}>
        <View style={{ flex: 1 }}>
          <LoadingSkeleton lines={1} height={86} />
        </View>
        <View style={{ flex: 1 }}>
          <LoadingSkeleton lines={1} height={86} />
        </View>
      </View>
      <LoadingSkeleton lines={1} height={140} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], flex: 1 },
  sectionTitle: { letterSpacing: 0.7 },
  countPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing[1.5] },
  kpiHeroValue: { fontSize: 32, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackLg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  compactWrap: { width: '48.5%' },
  compactCard: { minHeight: 90, justifyContent: 'space-between' },
  compactTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[1.5] },
  compactIcon: { width: 28, height: 28, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  compactValue: { fontSize: 22, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: spacing[1] },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctPill: { paddingHorizontal: spacing[2.5], paddingVertical: 4, borderRadius: radii.full },
  progressFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: spacing[1.5] },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  priorityIcon: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  quickActionWrap: { width: '48.5%' },
  quickActionCard: { minHeight: 84, justifyContent: 'space-between' },
  quickActionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickActionIcon: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  selectorScroll: { gap: spacing[2], paddingVertical: spacing[1] },
  selectorChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full, borderWidth: 1, minHeight: 34, justifyContent: 'center' },
  shiftStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.md, borderWidth: 1 },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full, borderWidth: 1 },
});
