import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { AppHeader } from '../../design-system/components/AppHeader';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppInput } from '../../design-system/components/AppInput';
import { AppButton } from '../../design-system/components/AppButton';
import { spacing } from '../../design-system/tokens/spacing';

const ISSUE_CATEGORIES = [
  { key: 'machine', label: 'Machine Breakdown', icon: '⚙️' },
  { key: 'needle', label: 'Needle Breakage / Replacement', icon: '🪡' },
  { key: 'fabric', label: 'Fabric / Thread Quality Defect', icon: '🧵' },
  { key: 'power', label: 'Power / Compressor Interruption', icon: '⚡' },
  { key: 'trims', label: 'Missing Trims or Buttons', icon: '🔘' },
];

export function ReportIssueView() {
  const { tokens } = useThemeStore();
  const router = useRouter();

  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].key);
  const [machineNo, setMachineNo] = useState('M-L1-08 (Juki DDL-9000)');
  const [description, setDescription] = useState('');
  const [stoppageMinutes, setStoppageMinutes] = useState('15');

  const handleSubmit = () => {
    Alert.alert(
      'Issue Reported to Supervisor',
      `Alert dispatched for ${machineNo}. Category: ${category}, estimated stoppage: ${stoppageMinutes} min. Maintenance team notified.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        Issue Category
      </AppText>
      <View style={{ gap: spacing[2], marginBottom: spacing[3] }}>
        {ISSUE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={[
              styles.catCard,
              {
                backgroundColor: category === cat.key ? tokens.dangerLight : tokens.surface,
                borderColor: category === cat.key ? tokens.danger : tokens.border,
              },
            ]}
          >
            <AppText style={{ fontSize: 20 }}>{cat.icon}</AppText>
            <AppText variant="label" bold style={{ marginLeft: spacing[2], color: category === cat.key ? tokens.danger : tokens.textPrimary }}>
              {cat.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <AppInput label="Machine Code / Workstation" value={machineNo} onChangeText={setMachineNo} />
        <AppInput label="Estimated Line Stoppage (Minutes)" value={stoppageMinutes} onChangeText={setStoppageMinutes} keyboardType="numeric" />
        <AppInput
          label="Detailed Description"
          value={description}
          onChangeText={setDescription}
          placeholder="E.g., Upper thread tensioner broken, oil leak on needle bar"
          multiline
        />
      </AppCard>

      <AppButton title="Broadcast Urgent Issue Alert" variant="danger" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  catCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: 8, borderWidth: 1 },
});
