import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';

export type RecordBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'lime';

export interface SummaryMetric {
  label: string;
  value: string | number;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
}

export interface DetailField {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  fullWidth?: boolean;
}

/**
 * Compact KPI strip for module headers (works cleanly on mobile screens).
 */
export function SummaryStrip({
  metrics,
  style,
}: {
  metrics: SummaryMetric[];
  style?: ViewStyle;
}) {
  const { tokens } = useThemeStore();
  if (!metrics.length) return null;

  const toneColor = (tone?: SummaryMetric['tone']) => {
    switch (tone) {
      case 'brand':
        return tokens.brand;
      case 'success':
        return tokens.successText;
      case 'warning':
        return tokens.warningText;
      case 'danger':
        return tokens.dangerText;
      default:
        return tokens.textPrimary;
    }
  };

  return (
    <AppCard padding={spacing[3]} style={style}>
      <View style={styles.summaryGrid}>
        {metrics.map((metric, idx) => (
          <View
            key={`${metric.label}-${idx}`}
            style={[
              styles.summaryCell,
              {
                backgroundColor: tokens.surfaceSecondary,
                borderColor: tokens.border,
              },
            ]}
          >
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {metric.label}
            </AppText>
            <AppText
              variant="h4"
              bold
              mono
              style={{ color: toneColor(metric.tone), marginTop: 2 }}
              numberOfLines={1}
            >
              {String(metric.value)}
            </AppText>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

/**
 * Consistent uppercase section label for grouping structured cards.
 */
export function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText
        variant="caption"
        color="secondary"
        bold
        uppercase
        style={{ letterSpacing: 0.7 }}
      >
        {title}
      </AppText>
      {typeof count === 'number' && (
        <AppText variant="caption" color="secondary" mono bold>
          {count}
        </AppText>
      )}
    </View>
  );
}

/**
 * Structured, mobile-first industrial record card used across all StitchFlow
 * roles and modules to display key-value details, status badges, and actions.
 */
export function StructuredRecordCard({
  title,
  subtitle,
  code,
  status,
  fields,
  highlight,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  code?: string;
  status?: { label: string; variant?: RecordBadgeVariant; dot?: boolean };
  fields: DetailField[];
  highlight?: { label: string; value: string; mono?: boolean; tone?: 'info' | 'warning' | 'success' | 'danger' };
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { tokens } = useThemeStore();

  const toneColor = (tone?: DetailField['tone']) => {
    switch (tone) {
      case 'brand':
        return tokens.brand;
      case 'success':
        return tokens.successText;
      case 'warning':
        return tokens.warningText;
      case 'danger':
        return tokens.dangerText;
      default:
        return tokens.textPrimary;
    }
  };

  const highlightColors = (tone: NonNullable<typeof highlight>['tone'] = 'info') => {
    switch (tone) {
      case 'success':
        return { bg: tokens.successLight, text: tokens.successText, border: tokens.border };
      case 'warning':
        return { bg: tokens.warningLight, text: tokens.warningText, border: tokens.border };
      case 'danger':
        return { bg: tokens.dangerLight, text: tokens.dangerText, border: tokens.border };
      default:
        return { bg: tokens.surfaceSecondary, text: tokens.textPrimary, border: tokens.border };
    }
  };

  return (
    <AppCard padding={spacing[3.5]} style={style}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: spacing[2] }}>
          {!!code && (
            <AppText variant="code" mono bold style={{ color: tokens.brand, marginBottom: 2 }}>
              {code}
            </AppText>
          )}
          <AppText variant="h4" bold numberOfLines={2}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          )}
        </View>
        {!!status && (
          <StatusBadge
            label={status.label}
            variant={status.variant ?? 'neutral'}
            size="sm"
            dot={status.dot}
          />
        )}
      </View>

      {fields.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: tokens.border }]} />
          <View style={styles.fieldsGrid}>
            {fields.map((field, index) => (
              <View
                key={`${field.label}-${index}`}
                style={field.fullWidth ? styles.fieldFull : styles.fieldHalf}
              >
                <AppText variant="caption" color="secondary" numberOfLines={1}>
                  {field.label}
                </AppText>
                <AppText
                  variant="bodySmall"
                  bold
                  mono={field.mono}
                  style={{ color: toneColor(field.tone), marginTop: 2 }}
                >
                  {field.value}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}

      {!!highlight && (
        <View
          style={[
            styles.highlightBox,
            {
              backgroundColor: highlightColors(highlight.tone).bg,
              borderColor: highlightColors(highlight.tone).border,
            },
          ]}
        >
          <AppText variant="caption" color="secondary">
            {highlight.label}
          </AppText>
          <AppText
            variant="caption"
            bold
            mono={highlight.mono}
            style={{ color: highlightColors(highlight.tone).text, marginTop: 2 }}
          >
            {highlight.value}
          </AppText>
        </View>
      )}

      {!!children && <View style={styles.actionsWrap}>{children}</View>}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  summaryCell: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    marginVertical: spacing[2.5],
    opacity: 0.7,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing[2.5],
    columnGap: spacing[3],
  },
  fieldHalf: {
    width: '47%',
  },
  fieldFull: {
    width: '100%',
  },
  highlightBox: {
    marginTop: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  actionsWrap: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
});
