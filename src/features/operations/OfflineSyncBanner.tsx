import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppCard } from '../../design-system/components/AppCard';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { getQueuedProductionEvents, replayProductionQueue } from '../../services/offline/offlineQueueService';
import { useAuthStore } from '../../store/authStore';

export function OfflineSyncBanner() {
  const { t } = useTranslation(['common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    if (isDemoMode || !user?.id) {
      setQueuedCount(0);
      return;
    }
    const items = await getQueuedProductionEvents(user.id);
    setQueuedCount(items.length);
  }, [isDemoMode, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshCount();
    }, [refreshCount]),
  );

  if (isDemoMode || !user?.id || queuedCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const summary = await replayProductionQueue(user.id);
      setQueuedCount(summary.remaining);
      Alert.alert(
        t('common:sync'),
        `${summary.confirmed} OK · ${summary.conflicts} conflict · ${summary.remaining} pending`,
      );
    } catch {
      Alert.alert(t('errors:networkError'));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={{ marginBottom: spacing[3] }}>
      <AppCard padding={spacing[3]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" bold>{`Offline Queue (${queuedCount})`}</AppText>
            <AppText variant="caption" color="secondary">{t('common:refresh')}</AppText>
          </View>
          <AppButton title={t('common:confirm')} size="sm" disabled={syncing} onPress={() => void handleSync()} />
        </View>
      </AppCard>
    </View>
  );
}
