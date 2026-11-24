import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useDemoStore } from '../../store/demoStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

const OPERATORS_LIST = [
  { id: 'op-1', name: 'Kavitha Selvam', skill: 'Grade A', currentPace: '142 pcs/hr' },
  { id: 'op-2', name: 'Murugan Perumal', skill: 'Grade A', currentPace: '135 pcs/hr' },
  { id: 'op-3', name: 'Devi Saravanan', skill: 'Grade B', currentPace: '118 pcs/hr' },
  { id: 'op-4', name: 'Praveen Chandran', skill: 'Grade B', currentPace: '122 pcs/hr' },
];

export function WorkAssignmentView() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const { bundles } = useDemoStore();
  const { t } = useTranslation(['production', 'common']);

  const [selectedBundle, setSelectedBundle] = useState(bundles[0]);
  const [selectedOperator, setSelectedOperator] = useState(OPERATORS_LIST[0]);

  const handleAssign = () => {
    Alert.alert(
      'Work Assigned',
      `Bundle ${selectedBundle.bundleCode} (${selectedBundle.quantity} pcs) assigned to ${selectedOperator.name}. Task updated in operator queue.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        1. Select Bundle to Assign
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {bundles.map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setSelectedBundle(b)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedBundle.id === b.id ? tokens.brand : tokens.surface,
                  borderColor: selectedBundle.id === b.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText variant="label" mono bold style={{ color: selectedBundle.id === b.id ? '#FFFFFF' : tokens.textPrimary }}>
                {b.bundleCode}
              </AppText>
              <AppText variant="caption" style={{ color: selectedBundle.id === b.id ? '#FFFFFF' : tokens.textSecondary }}>
                {b.quantity} pcs · {b.currentStage}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        2. Assign to Operator / Tailor
      </AppText>
      <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
        {OPERATORS_LIST.map((op) => (
          <TouchableOpacity
            key={op.id}
            onPress={() => setSelectedOperator(op)}
            style={[
              styles.operatorCard,
              {
                backgroundColor: selectedOperator.id === op.id ? tokens.brandLight : tokens.surface,
                borderColor: selectedOperator.id === op.id ? tokens.brand : tokens.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="h4" bold>{op.name}</AppText>
              <AppText variant="caption" color="secondary">Skill: {op.skill} · Pace: {op.currentPace}</AppText>
            </View>
            <StatusBadge label={op.skill} variant="info" size="sm" />
          </TouchableOpacity>
        ))}
      </View>

      <AppButton title={`Assign ${selectedBundle.bundleCode} to ${selectedOperator.name}`} onPress={handleAssign} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, borderWidth: 1 },
  operatorCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
