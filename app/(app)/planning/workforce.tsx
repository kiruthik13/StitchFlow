import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const LINE_STRENGTH_DATA = [
  { id: 'l1', line: 'Line 1 (Tops)', planned: 24, present: 23, helpers: 4, absentees: 1, eff: 82, supervisor: 'Ramesh Kumar' },
  { id: 'l2', line: 'Line 2 (Bottoms)', planned: 26, present: 22, helpers: 3, absentees: 4, eff: 68, supervisor: 'Muthu Vel' },
  { id: 'l3', line: 'Line 3 (Polos)', planned: 22, present: 22, helpers: 4, absentees: 0, eff: 88, supervisor: 'Suresh Raina' },
  { id: 'l4', line: 'Line 4 (Dresses)', planned: 20, present: 18, helpers: 2, absentees: 2, eff: 74, supervisor: 'Priya Mani' },
];

export default function WorkforceScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:lineStrength')} subtitle={t('production:workforceDeployment')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* Attendance Summary */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Planned</AppText>
              <AppText variant="h3" bold>92</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Present</AppText>
              <AppText variant="h3" bold style={{ color: tokens.success }}>85</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Absentees</AppText>
              <AppText variant="h3" bold style={{ color: tokens.danger }}>7</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="caption" color="secondary">Line Eff.</AppText>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>78%</AppText>
            </View>
          </View>
        </AppCard>

        {/* Lines Breakdown */}
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Line-wise Manning Status
        </AppText>

        {LINE_STRENGTH_DATA.map((item) => (
          <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.lineHeader}>
              <View>
                <AppText variant="h4" bold>{item.line}</AppText>
                <AppText variant="caption" color="secondary">Supervisor: {item.supervisor}</AppText>
              </View>
              <StatusBadge
                label={item.absentees > 2 ? 'UNDERSTAFFED' : 'BALANCED'}
                variant={item.absentees > 2 ? 'danger' : 'success'}
                size="sm"
              />
            </View>

            <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Operators</AppText><AppText variant="label" bold>{item.present}/{item.planned}</AppText></View>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Helpers</AppText><AppText variant="label" bold>{item.helpers}</AppText></View>
              <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Efficiency</AppText><AppText variant="label" bold style={{ color: item.eff >= 80 ? tokens.success : tokens.warning }}>{item.eff}%</AppText></View>
            </View>

            {item.absentees > 0 && (
              <View style={{ marginTop: spacing[3] }}>
                <AppButton
                  title={`Reassign Helpers (+${item.absentees})`}
                  variant="outline"
                  size="sm"
                  onPress={() => Alert.alert('Workforce Balancing', `Assigned reserve helper to ${item.line}.`)}
                />
              </View>
            )}
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
