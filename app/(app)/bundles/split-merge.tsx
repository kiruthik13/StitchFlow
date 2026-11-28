import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../../src/services/api/apiClient';
import { invalidateOperationalFlow } from '../../../src/services/api/useFactoryUpdates';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { spacing } from '../../../src/design-system/tokens/spacing';

export default function BundleSplitMergeScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { tokens } = useThemeStore();
  const { t } = useTranslation(['common', 'production']);
  const [splitText, setSplitText] = useState('60,40');

  const splitMutation = useMutation({
    mutationFn: () => {
      const quantities = splitText.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
      return apiRequest(`/bundles/${bundleId}/split`, { method: 'POST', body: JSON.stringify({ quantities }) });
    },
    onSuccess: () => {
      invalidateOperationalFlow(queryClient);
      Alert.alert(t('common:success'), t('production:bundleSplitSuccess', { defaultValue: 'Bundle split completed' }));
    },
    onError: (err: Error) => Alert.alert(t('common:error', { defaultValue: 'Error' }), err.message),
  });

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:bundleSplitMerge', { defaultValue: 'Bundle Split & Merge' })} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}>
        <AppCard padding={spacing[4]}>
          <AppInput label="Split Quantities (comma separated)" value={splitText} onChangeText={setSplitText} />
          <AppButton
            title={t('production:splitBundle', { defaultValue: 'Split Bundle' })}
            style={{ marginTop: spacing[3] }}
            disabled={!bundleId || splitMutation.isPending}
            onPress={() => splitMutation.mutate()}
          />
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
