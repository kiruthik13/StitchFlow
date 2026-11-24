import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function PhotoEvidenceScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [hasPhoto, setHasPhoto] = useState(false);
  const [defectCode, setDefectCode] = useState('D005 - Broken Stitch & Puckering');
  const [notes, setNotes] = useState('Observed broken seam stitch on left armhole join.');

  const handleCapture = () => {
    setHasPhoto(true);
    Alert.alert('Photo Captured', 'Defect macro photo recorded with camera timestamp and bundle watermark.');
  };

  const handleSave = () => {
    Alert.alert(
      'Evidence Attached to Bundle BND-00523',
      'Photo evidence successfully linked to rework task. Tailor Kavitha will view photo annotation.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Defect Photo Evidence" subtitle="Bundle BND-00523 · Rework Tagging" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* Photo Viewport Simulation */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3], alignItems: 'center' }}>
          <View style={[styles.cameraBox, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
            {hasPhoto ? (
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 44 }}>📸</AppText>
                <AppText variant="label" bold style={{ marginTop: 4 }}>DEFECT-IMAGE-01.JPG</AppText>
                <AppText variant="caption" color="secondary">2026-11-24 12:35 · 1920x1080 · Watermarked</AppText>
                <StatusBadge label="ATTACHED" variant="success" size="sm" />
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 48, marginBottom: 8 }}>📷</AppText>
                <AppText variant="body" bold>No Photo Attached</AppText>
                <AppText variant="caption" color="secondary" center style={{ marginTop: 4 }}>
                  Use device camera to photograph sewing seam defect or fabric flaw.
                </AppText>
              </View>
            )}
          </View>

          <View style={{ marginTop: spacing[3], width: '100%' }}>
            <AppButton title={hasPhoto ? "Retake Defect Photo" : "Snap Camera Evidence"} variant="outline" onPress={handleCapture} />
          </View>
        </AppCard>

        {/* Annotation Form */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label="Defect Code & Category" value={defectCode} onChangeText={setDefectCode} />
          <AppInput label="Inspector Defect Notes" value={notes} onChangeText={setNotes} multiline />
        </AppCard>

        <AppButton title="Save Evidence to Rework Order" onPress={handleSave} disabled={!hasPhoto} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  cameraBox: { width: '100%', height: 200, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[3] },
});
