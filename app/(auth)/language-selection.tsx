import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { useLanguageStore } from '../../src/store/languageStore';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { StitchFlowLogo } from '../../src/design-system/components/branding/StitchFlowLogo';
import { StitchFlowWordmark } from '../../src/design-system/components/branding/StitchFlowWordmark';
import { spacing } from '../../src/design-system/tokens/spacing';
import { radii } from '../../src/design-system/tokens/radii';
import { Check } from 'lucide-react-native';

const LANGUAGES = [
  {
    code: 'en',
    nativeName: 'English',
    secondaryDesc: 'Default factory operating language',
  },
  {
    code: 'ta',
    nativeName: 'தமிழ்',
    secondaryDesc: 'தமிழ்நாடு ஆடை உற்பத்தி ஆலைக்கு உகந்தது',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    secondaryDesc: 'उत्तर भारतीय परिधान निर्माण इकाइयों के लिए',
  },
];

export default function LanguageSelectionScreen() {
  const { tokens, mode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation(['auth', 'common']);
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
        {/* Brand Header */}
        <View style={styles.brandBlock}>
          <StitchFlowLogo size={48} withBackground />
          <View style={{ marginTop: spacing[3] }}>
            <StitchFlowWordmark fontSize={26} />
          </View>
          <AppText
            variant="caption"
            color="secondary"
            uppercase
            bold
            style={{ letterSpacing: 1.2, marginTop: spacing[1.5] }}
          >
            {t('common:tagline')}
          </AppText>
        </View>

        {/* Headline */}
        <View style={styles.introBlock}>
          <AppText variant="h2" bold style={{ color: tokens.textPrimary, letterSpacing: -0.4 }}>
            {t('chooseYourLanguage')}
          </AppText>
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: spacing[1] }}>
            {t('selectLanguageSub')}
          </AppText>
        </View>

        {/* 3 Language Cards */}
        <View style={styles.languageList}>
          {LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                activeOpacity={0.75}
                onPress={() => setLanguage(item.code as 'en' | 'ta' | 'hi')}
                style={[
                  styles.langCard,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: isSelected
                      ? mode === 'dark' ? tokens.signatureLime : tokens.brand
                      : tokens.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="h4"
                    bold
                    style={{
                      color: isSelected
                        ? mode === 'dark' ? tokens.signatureLime : tokens.brand
                        : tokens.textPrimary,
                    }}
                  >
                    {item.nativeName}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {item.secondaryDesc}
                  </AppText>
                </View>

                {/* Minimal vector radio indicator with selected-state lime accent */}
                <View
                  style={[
                    styles.radioIndicator,
                    {
                      borderColor: isSelected
                        ? tokens.signatureLime
                        : tokens.borderStrong,
                      backgroundColor: isSelected
                        ? tokens.signatureLime
                        : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Check size={14} color={tokens.textInverse} strokeWidth={3} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Continue Action */}
      <View style={styles.footer}>
        <AppButton
          title={t('continue')}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing[6],
    marginTop: spacing[2],
  },
  introBlock: {
    marginBottom: spacing[4],
  },
  languageList: {
    gap: spacing[2.5],
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
    borderRadius: radii.xl,
    minHeight: 74,
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
  },
});
