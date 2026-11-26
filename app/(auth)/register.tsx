import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppInput } from '../../src/design-system/components/AppInput';
import { AppHeader } from '../../src/design-system/components/AppHeader';
import { spacing } from '../../src/design-system/tokens/spacing';

// Default development org/factory UUIDs; configurable via env for multi-org deployments
const DEFAULT_ORG_ID = process.env.EXPO_PUBLIC_DEFAULT_ORG_ID || '11111111-1111-1111-1111-111111111111';
const DEFAULT_FACTORY_ID = process.env.EXPO_PUBLIC_DEFAULT_FACTORY_ID || '22222222-2222-2222-2222-222222222201';

export default function RegisterScreen() {
  const { tokens } = useThemeStore();
  const { register } = useAuthStore();
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!employeeId.trim() || !name.trim() || !email.trim() || password.length < 8) {
      setError(t('auth:fillAllRequiredFields'));
      return;
    }
    if (password !== confirmPwd) {
      setError(t('auth:passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        employeeId: employeeId.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        organizationId: DEFAULT_ORG_ID,
        factoryId: DEFAULT_FACTORY_ID,
      });
      setPendingMessage(res.message);
    } catch (err: any) {
      setError(err?.message || t('auth:registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('register')} showBack />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {pendingMessage ? (
            <View style={[styles.card, { backgroundColor: tokens.successLight, borderColor: tokens.success }]}>
              <AppText variant="h4" style={{ color: tokens.success, marginBottom: spacing[2] }}>
                {t('common:done')}
              </AppText>
              <AppText variant="body" color="secondary">
                {pendingMessage}
              </AppText>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              {error && (
                <AppText variant="caption" color="danger" bold style={{ marginBottom: spacing[2] }}>
                  {error}
                </AppText>
              )}
              <AppInput label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="EMP-1042" autoCapitalize="characters" />
              <AppInput label={t('fullName')} value={name} onChangeText={setName} placeholder="Full name" />
              <AppInput label={t('emailOrId')} value={email} onChangeText={setEmail} placeholder="employee@stitchflow.com" autoCapitalize="none" keyboardType="email-address" />
              <AppInput label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
              <AppInput label={t('confirmPassword')} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry placeholder="••••••••" />
              <AppButton title={t('registerButton')} size="lg" fullWidth loading={loading} style={{ marginTop: spacing[2] }} onPress={handleRegister} />
            </View>
          )}
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
