import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { AppHeader } from '../../src/design-system/components/AppHeader';
import { AppInput } from '../../src/design-system/components/AppInput';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppText } from '../../src/design-system/components/AppText';
import { spacing } from '../../src/design-system/tokens/spacing';

export default function ForgotPasswordScreen() {
  const { tokens } = useThemeStore();
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('forgotPassword')} showBack />
        <ScrollView contentContainerStyle={styles.scroll}>
          {!sent ? (
            <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <AppText variant="body" color="secondary" style={{ marginBottom: spacing[4] }}>
                {t('enterEmailToReset')}
              </AppText>
              <AppInput
                label={t('emailOrId')}
                value={email}
                onChangeText={setEmail}
                placeholder="employee@stitchflow.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppButton
                title={t('sendResetLink')}
                size="lg"
                fullWidth
                onPress={() => setSent(true)}
                style={{ marginTop: spacing[2] }}
              />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: tokens.successLight, borderColor: tokens.success }]}>
              <AppText variant="h4" style={{ color: tokens.success, marginBottom: spacing[2] }}>
                ✓ {t('common:done')}
              </AppText>
              <AppText variant="body" color="secondary">
                {t('resetPasswordSent')}
              </AppText>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing[5], flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing[5] },
});
