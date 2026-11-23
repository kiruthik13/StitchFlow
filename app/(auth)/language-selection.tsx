import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { useLanguageStore } from '../../src/store/languageStore';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { LanguageSwitcher } from '../../src/design-system/components/LanguageSwitcher';
import { spacing } from '../../src/design-system/tokens/spacing';

export default function LanguageSelectionScreen() {
  const { tokens } = useThemeStore();
  const { language } = useLanguageStore();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.background,
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[6],
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo / Brand */}
        <View style={styles.brandBlock}>
          <View style={[styles.logoBox, { backgroundColor: tokens.brand }]}>
            <AppText variant="h2" color="inverse" bold>SF</AppText>
          </View>
          <AppText variant="h2" bold style={{ color: tokens.textPrimary, marginTop: spacing[3] }}>
            StitchFlow
          </AppText>
          <AppText variant="bodySmall" color="secondary" center style={{ marginTop: spacing[1] }}>
            Garment Production Intelligence
          </AppText>
        </View>

        {/* Language selection */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <AppText variant="h4" style={{ marginBottom: spacing[1] }}>
            {t('chooseYourLanguage')}
          </AppText>
          <AppText variant="bodySmall" color="secondary" style={{ marginBottom: spacing[4] }}>
            {t('selectLanguageSub')}
          </AppText>
          <LanguageSwitcher />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title={t('continue')}
          size="lg"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing[6] },
  brandBlock: { alignItems: 'center', marginBottom: spacing[8], marginTop: spacing[4] },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[6],
  },
});
