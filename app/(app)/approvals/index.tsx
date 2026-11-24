import React, { useState } from 'react';
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

const PENDING_APPROVALS = [
  { id: 'appr-1', type: 'Rework Release', title: 'Bundle BND-00523 Rework Pass', desc: '15 pcs rectified by Operator Kavitha. Reinspected by Meena.', requestedBy: 'Meena (QC Inspector)', urgency: 'High' },
  { id: 'appr-2', type: 'Job Closure', title: 'JOB-1002 Polo Short Sleeve', desc: 'Order Qty 1000 / Packed 980 / Rejection 20 within 2% AQL allowance.', requestedBy: 'Arun Kumar (Supervisor)', urgency: 'Normal' },
  { id: 'appr-3', type: 'Excess Fabric', title: 'Line 2 Requisition CT-002', desc: '40 meters additional Chino fabric due to cutting edge distortion.', requestedBy: 'Cutting Master', urgency: 'High' },
];

export default function ApprovalsScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common']);
  const [items, setItems] = useState(PENDING_APPROVALS);

  const handleApprove = (id: string, title: string) => {
    setItems(items.filter((i) => i.id !== id));
    Alert.alert('Approved', `"${title}" has been authorized.`);
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:approvals')} subtitle={t('production:floorApprovals')} showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Pending Actions ({items.length})
        </AppText>

        {items.length === 0 ? (
          <AppCard padding={spacing[6]} style={{ alignItems: 'center' }}>
            <AppText variant="h3" style={{ marginBottom: 4 }}>🎉 All Clear</AppText>
            <AppText variant="body" color="secondary">No pending approvals at this time.</AppText>
          </AppCard>
        ) : (
          items.map((item) => (
            <AppCard key={item.id} padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color="brand" bold uppercase>{item.type}</AppText>
                  <AppText variant="h4" bold style={{ marginTop: 2 }}>{item.title}</AppText>
                  <AppText variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>{item.desc}</AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>Requested by: {item.requestedBy}</AppText>
                </View>
                <StatusBadge label={item.urgency} variant={item.urgency === 'High' ? 'danger' : 'neutral'} size="sm" />
              </View>

              <View style={{ marginTop: spacing[3], flexDirection: 'row', gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <AppButton title="Authorize" size="sm" onPress={() => handleApprove(item.id, item.title)} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton title="Reject" size="sm" variant="outline" onPress={() => setItems(items.filter((i) => i.id !== item.id))} />
                </View>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
