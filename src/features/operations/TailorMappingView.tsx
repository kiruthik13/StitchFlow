import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from '../../design-system/components/AppText';
import { AppCard } from '../../design-system/components/AppCard';
import { AppButton } from '../../design-system/components/AppButton';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { spacing } from '../../design-system/tokens/spacing';

const TAILOR_MAPPINGS = [
  { id: 'tm-1', tailor: 'Kavitha Selvam', operation: 'Collar Band & Attach', machine: 'M-L1-02', targetPace: '45 pcs/hr', actualPace: '48 pcs/hr', status: 'optimal' },
  { id: 'tm-2', tailor: 'Murugan Perumal', operation: 'Sleeve Overlock Join', machine: 'M-L1-05', targetPace: '55 pcs/hr', actualPace: '52 pcs/hr', status: 'optimal' },
  { id: 'tm-3', tailor: 'Devi Saravanan', operation: 'Front Placket Stitch', machine: 'M-L1-07', targetPace: '40 pcs/hr', actualPace: '31 pcs/hr', status: 'slow' },
  { id: 'tm-4', tailor: 'Praveen Chandran', operation: 'Bottom Hemming', machine: 'M-L1-11', targetPace: '65 pcs/hr', actualPace: '68 pcs/hr', status: 'optimal' },
];

export function TailorMappingView() {
  const { tokens } = useThemeStore();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
        Line 1 Tailor Operation Station Map
      </AppText>

      {TAILOR_MAPPINGS.map((item) => (
        <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[2] }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <AppText variant="h4" bold>{item.tailor}</AppText>
              <AppText variant="label" color="brand" bold style={{ marginTop: 2 }}>{item.operation}</AppText>
              <AppText variant="caption" color="secondary">Station: {item.machine}</AppText>
            </View>
            <StatusBadge label={item.status.toUpperCase()} variant={item.status === 'optimal' ? 'success' : 'warning'} size="sm" />
          </View>

          <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Target</AppText><AppText variant="label" bold>{item.targetPace}</AppText></View>
            <View style={{ flex: 1 }}><AppText variant="caption" color="secondary">Actual Pace</AppText><AppText variant="label" bold style={{ color: item.status === 'optimal' ? tokens.success : tokens.warning }}>{item.actualPace}</AppText></View>
            <TouchableOpacity onPress={() => Alert.alert('Rebalance Station', `Reassign or pair helper with ${item.tailor}`)}>
              <AppText variant="label" color="brand" style={{ paddingTop: spacing[1] }}>Rebalance</AppText>
            </TouchableOpacity>
          </View>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
});
