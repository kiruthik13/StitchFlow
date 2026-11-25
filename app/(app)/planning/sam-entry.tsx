import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StickyActionLayout } from '../../../src/design-system/layouts/StickyActionLayout';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { STYLES } from '../../../src/fixtures/mockData';

export default function SamEntryScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);

  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [collarSam, setCollarSam] = useState('2.8');
  const [sleeveSam, setSleeveSam] = useState('3.4');
  const [frontSam, setFrontSam] = useState('4.2');
  const [hemSam, setHemSam] = useState('1.5');
  const [assemblySam, setAssemblySam] = useState('2.6');

  const totalSam = (
    parseFloat(collarSam || '0') +
    parseFloat(sleeveSam || '0') +
    parseFloat(frontSam || '0') +
    parseFloat(hemSam || '0') +
    parseFloat(assemblySam || '0')
  ).toFixed(1);

  const targetPcsPerHour = parseFloat(totalSam) > 0 ? Math.round(60 / parseFloat(totalSam)) : 0;

  const handleSave = () => {
    Alert.alert('SAM Saved', `Standard Allowed Minutes (${totalSam} SAM) updated for ${selectedStyle.name}. Target pace is ${targetPcsPerHour} pcs/hr per tailor.`);
  };

  return (
    <StickyActionLayout
      header={<AppHeader title={t('production:samPlan')} subtitle={t('production:samEfficiency')} showBack onBack={() => router.back()} />}
      stickyFooter={<AppButton title="Save & Broadcast SAM to Lines" fullWidth size="lg" onPress={handleSave} />}
    >
      {/* Style Selector */}
      <AppText variant="caption" color="secondary" uppercase style={styles.sectionTitle}>Select Garment Style</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {STYLES.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedStyle(s)}
              style={[
                styles.styleChip,
                {
                  backgroundColor: selectedStyle.id === s.id ? tokens.brand : tokens.surface,
                  borderColor: selectedStyle.id === s.id ? tokens.brand : tokens.border,
                },
              ]}
            >
              <AppText variant="label" style={{ color: selectedStyle.id === s.id ? '#FFFFFF' : tokens.textPrimary }}>
                {s.name}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Calculated Benchmark Card */}
      <AppCard variant="forest" padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
        <View style={styles.calcRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.76)' }}>Total Standard Minutes</AppText>
            <AppText style={{ fontSize: 36, lineHeight: 46, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
              {totalSam} SAM
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.76)' }}>Pace Target</AppText>
            <AppText style={{ fontSize: 24, lineHeight: 32, fontWeight: '700', color: '#34C765', letterSpacing: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>
              {targetPcsPerHour} pcs/hr
            </AppText>
          </View>
        </View>
      </AppCard>

      {/* Stage Breakdown Inputs */}
      <AppText variant="caption" color="secondary" uppercase style={styles.sectionTitle}>Operation Breakdown (Minutes)</AppText>
      <AppCard padding={spacing[4]}>
        <AppInput label="1. Front Placket & Chest Pocket" value={frontSam} onChangeText={setFrontSam} keyboardType="numeric" />
        <AppInput label="2. Collar Band & Neck Join" value={collarSam} onChangeText={setCollarSam} keyboardType="numeric" />
        <AppInput label="3. Sleeve Overlock & Cuffs" value={sleeveSam} onChangeText={setSleeveSam} keyboardType="numeric" />
        <AppInput label="4. Bottom Hemming" value={hemSam} onChangeText={setHemSam} keyboardType="numeric" />
        <AppInput label="5. Final Assembly & Clean Stitch" value={assemblySam} onChangeText={setAssemblySam} keyboardType="numeric" />
      </AppCard>
    </StickyActionLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  sectionTitle: { letterSpacing: 0.8, marginBottom: spacing[2] },
  styleChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 20, borderWidth: 1 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
