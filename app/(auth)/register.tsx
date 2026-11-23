import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppInput } from '../../src/design-system/components/AppInput';
import { AppHeader } from '../../src/design-system/components/AppHeader';
import { spacing } from '../../src/design-system/tokens/spacing';

export default function RegisterScreen() {
  const { tokens } = useThemeStore();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('register')} showBack />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <AppInput label={t('fullName')} value={name} onChangeText={setName} placeholder="Full name" />
            <AppInput label={t('emailOrId')} value={email} onChangeText={setEmail} placeholder="employee@stitchflow.com" autoCapitalize="none" keyboardType="email-address" />
            <AppInput label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
            <AppInput label={t('confirmPassword')} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry placeholder="••••••••" />
            <AppButton title={t('registerButton')} size="lg" fullWidth style={{ marginTop: spacing[2] }} onPress={() => {}} />
          </View>
          <View style={styles.loginRow}>
            <AppText variant="body" color="secondary">{t('alreadyHaveAccount')} </AppText>
            <TouchableOpacity onPress={() => router.back()}>
              <AppText variant="body" color="brand" bold>{t('login')}</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing[5], flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing[5], marginBottom: spacing[4] },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
});
