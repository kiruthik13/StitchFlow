import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { MetricCard } from '../../design-system/components/MetricCard';
import { BrandHeader } from '../../design-system/components/branding/BrandHeader';
import { spacing } from '../../design-system/tokens/spacing';
import { radii } from '../../design-system/tokens/radii';
import { FACTORIES, ALERTS } from '../../fixtures/mockData';
import {
  Zap,
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react-native';

export function MDDashboard() {
  const { tokens, mode } = useThemeStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <BrandHeader
        subtitle={`${t('production:executiveGroupOverview')} · ${t('common:roles.md')}`}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Summary Bento */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:manufacturingGroupSummary')}
        </AppText>
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:operatingPlants')}
              value="2"
              unit={t('common:factories')}
              icon={<Building2 size={14} color={tokens.brand} strokeWidth={2.4} />}
              compact
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:activeJobs')}
              value="4"
              unit={t('common:orders')}
              variant="brand"
              compact
            />
          </View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:overallEfficiency')}
              value="77%"
              trend={{ value: '+3.4%', isPositive: true }}
              variant="warning"
              compact
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:pendingQC')}
              value="380"
              unit={t('common:pieces')}
              variant="warning"
              compact
            />
          </View>
        </View>
        <View style={[styles.grid2, { marginTop: spacing[2] }]}>
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:totalPacked')}
              value="1,476"
              unit={t('common:pieces')}
              variant="lime"
              trend={{ value: '+12%', isPositive: true }}
              compact
            />
          </View>
          <View style={{ width: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <MetricCard
              label={t('production:totalRework')}
              value="77"
              unit={t('common:pieces')}
              variant="danger"
              compact
            />
          </View>
        </View>

        {/* Quick Executive Navigation */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:executiveAnalytics')}
        </AppText>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => router.push('/(app)/md/bottlenecks')}
            activeOpacity={0.8}
          >
            <View style={[styles.execIconCircle, { backgroundColor: tokens.brandLight }]}>
              <Zap size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.brand} strokeWidth={2.2} />
            </View>
            <AppText variant="label" bold style={{ color: tokens.textPrimary, marginTop: spacing[1] }}>
              {t('production:bottleneckAnalytics')}
            </AppText>
            <AppText variant="caption" color="secondary">
              {t('production:delayBufferAlerts')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => router.push('/(app)/md/sam-efficiency')}
            activeOpacity={0.8}
          >
            <View style={[styles.execIconCircle, { backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD' }]}>
              <TrendingUp size={20} color={mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep} strokeWidth={2.2} />
            </View>
            <AppText variant="label" bold style={{ color: tokens.textPrimary, marginTop: spacing[1] }}>
              {t('production:samEfficiency')}
            </AppText>
            <AppText variant="caption" color="secondary">
              {t('production:linewiseSamMetrics')}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Multi-Factory Performance */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:factoryComparison')}
        </AppText>
        {FACTORIES.map((factory) => {
          const eff = factory.id === 'factory-a' ? 82 : 68;
          const effColor = eff >= 80 ? tokens.success : eff >= 70 ? tokens.warning : tokens.danger;
          return (
            <TouchableOpacity
              key={factory.id}
              onPress={() =>
                router.push({
                  pathname: '/(app)/md/factory-[id]',
                  params: { id: factory.id },
                })
              }
              activeOpacity={0.8}
              style={{ marginBottom: spacing[2.5] }}
            >
              <AppCard padding={spacing[4]}>
                <View style={styles.factoryRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold style={{ color: tokens.textPrimary }}>
                      {factory.name}
                    </AppText>
                    <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                      {factory.location}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {factory.activeLines}/{factory.totalLines} {t('production:linesActive')}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText
                      style={{
                        fontSize: 28,
                        fontWeight: '800',
                        color: effColor,
                        fontFamily: 'sans-serif-black',
                        lineHeight: 36,
                        letterSpacing: 0,
                        includeFontPadding: false,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {eff}%
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {t('common:efficiency')}
                    </AppText>
                  </View>
                </View>
                <View
                  style={[
                    styles.progressBg,
                    { backgroundColor: tokens.surfaceSecondary, marginTop: spacing[3] },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: eff >= 80 ? tokens.signatureLime : effColor,
                        width: `${eff}%` as any,
                      },
                    ]}
                  />
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        })}

        {/* Critical Alerts */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:criticalAlerts')}
        </AppText>
        {ALERTS.filter((a) => !a.isRead).map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertRow,
              {
                borderLeftColor: alert.severity === 'critical' ? tokens.danger : tokens.warning,
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
                {alert.title}
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {alert.message}
              </AppText>
            </View>
            <StatusBadge
              label={alert.severity.toUpperCase()}
              variant={alert.severity === 'critical' ? 'danger' : 'warning'}
              size="sm"
              dot
            />
          </View>
        ))}

        {/* High Risk Jobs */}
        <AppText variant="caption" color="secondary" uppercase bold style={styles.sectionTitle}>
          {t('production:highRiskOrders')}
        </AppText>
        <AppCard padding={spacing[4]}>
          <View style={styles.riskRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" bold mono style={{ color: tokens.textPrimary }}>
                JOB-1003
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Linen Shirt — Zara International
              </AppText>
              <AppText variant="caption" bold style={{ color: tokens.danger, marginTop: 3 }}>
                {t('production:fabricLotShadeVariationAlert')}
              </AppText>
            </View>
            <StatusBadge label="ON HOLD" variant="warning" size="sm" dot />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

export function MDWork() {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation(['production', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <View
        style={[
          styles.dashHeader,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
          {t('production:factoriesAndUnits')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {FACTORIES.map((f) => {
          const eff = f.id === 'factory-a' ? 82 : 68;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() =>
                router.push({
                  pathname: '/(app)/md/factory-[id]',
                  params: { id: f.id },
                })
              }
              activeOpacity={0.8}
              style={{ marginBottom: spacing[3] }}
            >
              <AppCard padding={spacing[4]}>
                <AppText variant="h4" bold style={{ color: tokens.textPrimary }}>
                  {f.name}
                </AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {f.location}
                </AppText>
                <View style={[styles.rowStats, { borderTopColor: tokens.border, borderTopWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="secondary">{t('production:lines')}</AppText>
                    <AppText variant="label" bold mono>{f.activeLines}/{f.totalLines}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="secondary">{t('production:capacity')}</AppText>
                    <AppText variant="label" bold mono>{f.capacity}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="secondary">{t('common:efficiency')}</AppText>
                    <AppText
                      variant="label"
                      bold
                      mono
                      style={{ color: eff >= 80 ? tokens.success : tokens.warning }}
                    >
                      {eff}%
                    </AppText>
                  </View>
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    marginBottom: spacing[2],
    marginTop: spacing[3.5],
  },
  grid2: {
    flexDirection: 'row',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  quickCard: {
    flex: 1,
    padding: spacing[3.5],
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  execIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  factoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowStats: {
    flexDirection: 'row',
    marginTop: spacing[3],
    paddingTop: spacing[2.5],
  },
});
