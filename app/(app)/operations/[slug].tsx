import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { spacing } from '../../../src/design-system/tokens/spacing';

const OPERATIONS: Record<string, { title: string; desc: string; icon: string }> = {
  'cutting-entry': { title: 'Cutting Entry', desc: 'Record manually cut pieces', icon: '✂️' },
  'sewing-entry': { title: 'Sewing Out Entry', desc: 'Record sewing output by bundle', icon: '🧵' },
  'kaja-entry': { title: 'Kaja/Button Entry', desc: 'Record kaja and button attachment', icon: '🔘' },
  'ironing-entry': { title: 'Ironing Entry', desc: 'Record ironed pieces', icon: '🔥' },
  'completed-entry': { title: 'Completed Qty Entry', desc: 'Record final completed quantity', icon: '✅' },
  'rework-tasks': { title: 'Rework Tasks', desc: 'View and update rework assignments', icon: '🔄' },
  'report-issue': { title: 'Report Issue', desc: 'Report a production issue', icon: '⚠️' },
  'work-assignment': { title: 'Work Assignment', desc: 'Assign bundles to operators', icon: '📋' },
  'tailor-mapping': { title: 'Tailor Mapping', desc: 'Map tailors to operations', icon: '👷' },
  'sam-monitor': { title: 'SAM Monitor', desc: 'Monitor Standard Allowed Minutes', icon: '⏱️' },
  'input-in': { title: 'Input In', desc: 'Record incoming raw materials', icon: '📥' },
  'input-out': { title: 'Input Out', desc: 'Record outgoing inputs to production', icon: '📤' },
  'output-in': { title: 'Output In', desc: 'Receive production output in store', icon: '📦' },
  'output-out': { title: 'Output Out', desc: 'Send finished goods out', icon: '🚚' },
};

export default function OperationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { tokens } = useThemeStore();

  const op = OPERATIONS[slug ?? ''] ?? { title: slug ?? 'Operation', desc: 'Operation details', icon: '⚙️' };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={op.title} showBack />
      <View style={styles.content}>
        <AppCard padding={spacing[6]} style={{ alignItems: 'center', marginBottom: spacing[3] }}>
          <AppText style={{ fontSize: 56, marginBottom: spacing[3] }}>{op.icon}</AppText>
          <AppText variant="h3" bold center style={{ marginBottom: spacing[2] }}>{op.title}</AppText>
          <AppText variant="body" color="secondary" center style={{ marginBottom: spacing[4] }}>{op.desc}</AppText>
          <View style={[styles.demoBadge, { backgroundColor: tokens.warningLight }]}>
            <AppText variant="caption" style={{ color: tokens.warning }} center>
              🛠 This operation screen is planned for a future implementation phase.
            </AppText>
            <AppText variant="caption" color="secondary" center style={{ marginTop: 4 }}>
              The full workflow will include role-specific forms, barcode scanning, quantity entry, and confirmation steps.
            </AppText>
          </View>
        </AppCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing[4], justifyContent: 'center' },
  demoBadge: { borderRadius: 8, padding: spacing[3], width: '100%' },
});
