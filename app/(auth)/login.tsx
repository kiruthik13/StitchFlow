import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppInput } from '../../src/design-system/components/AppInput';
import { LanguageSwitcher } from '../../src/design-system/components/LanguageSwitcher';
import { spacing } from '../../src/design-system/tokens/spacing';
import { UserRole } from '../../src/core/types';
import { ROLE_DISPLAY_NAMES } from '../../src/core/permissions';

const DEMO_ROLES: UserRole[] = [
  'md',
  'factory-manager',
  'supervisor',
  'operator',
  'qc-inspector',
  'store-dispatch',
  'packing-staff',
];

export default function LoginScreen() {
  const { tokens } = useThemeStore();
  const { demoLogin } = useAuthStore();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDemoLogin = async (role: UserRole) => {
    setLoading(true);
    await demoLogin(role);
    setLoading(false);
    router.replace('/(app)/(tabs)/');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[4] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.langRow}>
              <LanguageSwitcher compact />
            </View>
            <View style={[styles.logoBox, { backgroundColor: tokens.brand }]}>
              <AppText variant="h2" color="inverse" bold>SF</AppText>
            </View>
            <AppText variant="h2" bold style={{ color: tokens.textPrimary, marginTop: spacing[3] }}>
              StitchFlow
            </AppText>
            <AppText variant="bodySmall" color="secondary" center>
              Garment Production Intelligence
            </AppText>
          </View>

          {/* Login form */}
          <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <AppText variant="h4" style={{ marginBottom: spacing[4] }}>
              {t('login')}
            </AppText>

            <AppInput
              label={t('emailOrId')}
              value={email}
              onChangeText={setEmail}
              placeholder="employee@stitchflow.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AppInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: spacing[4] }}>
              <AppText variant="label" color="brand">
                {t('forgotPassword')}
              </AppText>
            </TouchableOpacity>

            <AppButton
              title={t('loginButton')}
              size="lg"
              fullWidth
              onPress={() => {/* Real auth will go here */}}
              style={{ marginBottom: spacing[3] }}
            />

            <View style={[styles.divider, { borderTopColor: tokens.border }]}>
              <AppText variant="caption" color="secondary">
                {t('orContinueWith')}
              </AppText>
            </View>

            {/* Demo login button */}
            <AppButton
              title={`🎭 ${t('demoLogin')}`}
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => setShowDemo(true)}
            />
          </View>

          {/* Demo role selector */}
          {showDemo && (
            <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.brand, borderWidth: 1.5 }]}>
              <View style={[styles.demoBadge, { backgroundColor: tokens.warningLight }]}>
                <AppText variant="caption" style={{ color: tokens.warning }}>
                  ⚠️ DEMO MODE — No real server connection
                </AppText>
              </View>
              <AppText variant="h4" style={{ marginBottom: spacing[3] }}>
                {t('selectDemoRole')}
              </AppText>
              {DEMO_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleDemoLogin(role)}
                  disabled={loading}
                  style={[styles.roleRow, { borderColor: tokens.border, backgroundColor: tokens.surfaceSecondary }]}
                >
                  <AppText variant="body" style={{ flex: 1 }}>
                    {ROLE_DISPLAY_NAMES[role]}
                  </AppText>
                  <AppText variant="caption" color="secondary">→</AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Register link */}
          <View style={styles.registerRow}>
            <AppText variant="body" color="secondary">{t('noAccount')} </AppText>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <AppText variant="body" color="brand" bold>{t('register')}</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: spacing[5], flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: spacing[6] },
  langRow: { alignSelf: 'flex-end', marginBottom: spacing[4] },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  divider: {
    borderTopWidth: 1,
    alignItems: 'center',
    paddingTop: spacing[3],
    marginBottom: spacing[3],
  },
  demoBadge: {
    borderRadius: 6,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
    marginBottom: spacing[3],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
});
