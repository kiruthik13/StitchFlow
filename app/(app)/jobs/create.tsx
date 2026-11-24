import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import { BUYERS, STYLES, LINES } from '../../../src/fixtures/mockData';

export default function CreateJobScreen() {
  const router = useRouter();
  const { tokens } = useThemeStore();
  const { t } = useTranslation('production');
  const { t: tc } = useTranslation('common');
  const { addJob } = useDemoStore();

  const [jobNumber, setJobNumber] = useState(`JOB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [buyerId, setBuyerId] = useState(BUYERS[0].id);
  const [styleId, setStyleId] = useState(STYLES[0].id);
  const [lineId, setLineId] = useState(LINES[0].id);
  const [targetQuantity, setTargetQuantity] = useState('500');
  const [sam, setSam] = useState('18.5');
  const [targetDate, setTargetDate] = useState('2026-12-05');

  const handleCreate = () => {
    const qty = parseInt(targetQuantity, 10);
    if (!qty || isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid target quantity.');
      return;
    }

    const selectedBuyer = BUYERS.find((b) => b.id === buyerId) || BUYERS[0];
    const selectedStyle = STYLES.find((s) => s.id === styleId) || STYLES[0];
    const selectedLine = LINES.find((l) => l.id === lineId) || LINES[0];

    addJob({
      jobNumber,
      buyerName: selectedBuyer.name,
      styleName: selectedStyle.name,
      lineName: selectedLine.name,
      targetQuantity: qty,
      completedQuantity: 0,
      sam: parseFloat(sam) || 18.5,
      targetDate,
      status: 'active',
    });

    Alert.alert(
      'Job Created',
      `Job ${jobNumber} successfully queued for production.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('createJob') || 'Create Production Job'} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Job Specifications
          </AppText>

          <AppInput
            label="Job Number"
            value={jobNumber}
            onChangeText={setJobNumber}
            style={styles.input}
          />

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Select Buyer
          </AppText>
          <View style={styles.chipRow}>
            {BUYERS.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => setBuyerId(b.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: buyerId === b.id ? tokens.brand : tokens.border,
                    backgroundColor: buyerId === b.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={buyerId === b.id ? 'brand' : 'secondary'}
                  style={buyerId === b.id ? styles.bold : undefined}
                >
                  {b.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Select Garment Style
          </AppText>
          <View style={styles.chipRow}>
            {STYLES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setStyleId(s.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: styleId === s.id ? tokens.brand : tokens.border,
                    backgroundColor: styleId === s.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={styleId === s.id ? 'brand' : 'secondary'}
                  style={styleId === s.id ? styles.bold : undefined}
                >
                  {s.name} ({s.code})
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Target Order Quantity (Pcs)"
            value={targetQuantity}
            onChangeText={setTargetQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          <AppInput
            label="Standard Allowed Minutes (SAM)"
            value={sam}
            onChangeText={setSam}
            keyboardType="numeric"
            style={styles.input}
          />

          <AppText variant="bodySmall" color="secondary" style={styles.fieldLabel}>
            Allocated Line
          </AppText>
          <View style={styles.chipRow}>
            {LINES.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => setLineId(l.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: lineId === l.id ? tokens.brand : tokens.border,
                    backgroundColor: lineId === l.id ? tokens.brandLight : tokens.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={lineId === l.id ? 'brand' : 'secondary'}
                  style={lineId === l.id ? styles.bold : undefined}
                >
                  {l.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Target Delivery Date (YYYY-MM-DD)"
            value={targetDate}
            onChangeText={setTargetDate}
            style={styles.input}
          />

          <View style={styles.actions}>
            <AppButton
              title={t('confirmCreate') || 'Create Job & Generate Bundles'}
              onPress={handleCreate}
              variant="primary"
            />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  card: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  fieldLabel: {
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  input: {
    marginTop: spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  bold: {
    fontWeight: '700',
  },
  actions: {
    marginTop: spacing[5],
  },
});
