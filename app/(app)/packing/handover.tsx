import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function PackingHandoverScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['packing', 'common']);
  const { cartons } = useDemoStore();

  const sealedCartons = cartons.filter((c) => c.status === 'sealed');
  const [handoverDone, setHandoverDone] = useState(false);

  const handleHandover = () => {
    setHandoverDone(true);
    Alert.alert(
      'Store Handover Completed',
      `${sealedCartons.length} sealed cartons transferred from Packing Bay to Finished Goods Warehouse Bay 1. Receiver signature logged.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('packing:storeHandover')} subtitle="Finished Goods Transfer Slip" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.summaryRow}>
            <View>
              <AppText variant="caption" color="secondary">Sealed Cartons Ready</AppText>
              <AppText variant="h3" bold>{sealedCartons.length} Cartons</AppText>
            </View>
            <StatusBadge label={handoverDone ? 'TRANSFERRED' : 'READY TO HANDOVER'} variant={handoverDone ? 'success' : 'brand'} size="sm" />
          </View>
        </AppCard>

        <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[2] }}>
          Cartons Manifest
        </AppText>

        {sealedCartons.map((c) => (
          <AppCard key={c.id} padding={spacing[3]} style={{ marginBottom: spacing[2] }}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="code" mono bold>{c.cartonCode}</AppText>
                <AppText variant="caption" color="secondary">{c.styleName} · {c.color} · Size: {c.size} · {c.quantity} pcs</AppText>
              </View>
              <StatusBadge label="SEALED" variant="success" size="sm" />
            </View>
          </AppCard>
        ))}

        <View style={{ marginTop: spacing[4] }}>
          <AppButton title="Sign & Transfer Cartons to Finished Goods Store" onPress={handleHandover} disabled={sealedCartons.length === 0 || handoverDone} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
