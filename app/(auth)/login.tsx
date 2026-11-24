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
import { UserRole } from '../../src/core/types';
import { AppText } from '../../src/design-system/components/AppText';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppInput } from '../../src/design-system/components/AppInput';
import { AppCard } from '../../src/design-system/components/AppCard';
import { LanguageSwitcher } from '../../src/design-system/components/LanguageSwitcher';
import { StitchFlowLogo } from '../../src/design-system/components/branding/StitchFlowLogo';
import { StitchFlowWordmark } from '../../src/design-system/components/branding/StitchFlowWordmark';
import { spacing } from '../../src/design-system/tokens/spacing';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Users,
  ChevronRight,
  Building2,
  Factory,
  UserCheck,
  Scissors,
  ShieldCheck,
  Warehouse,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react-native';

const ROLE_ICONS: Record<UserRole, any> = {
  md: Building2,
  'factory-manager': Factory,
  supervisor: UserCheck,
  operator: Scissors,
  'qc-inspector': ShieldCheck,
  'store-dispatch': Warehouse,
  'packing-staff': PackageCheck,
};

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
  const { tokens, mode } = useThemeStore();
  const { demoLogin } = useAuthStore();
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDemoLogin = async (role: UserRole) => {
    setLoading(true);
    await demoLogin(role);
    setLoading(false);
    router.replace('/(app)/(tabs)');
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
            { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[6] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Language Switcher */}
          <View style={styles.topBar}>
            <LanguageSwitcher compact />
          </View>

          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <StitchFlowLogo size={46} withBackground />
            <View style={{ marginTop: spacing[3] }}>
              <StitchFlowWordmark fontSize={26} />
            </View>
            <AppText
              variant="caption"
              color="secondary"
              uppercase
              bold
              style={{ letterSpacing: 1.2, marginTop: spacing[1] }}
            >
              {t('common:industrialOS')}
            </AppText>
          </View>

          {/* Authentication Card */}
          <AppCard padding={spacing[5]} style={styles.authCard}>
            <AppText variant="h3" bold style={{ color: tokens.textPrimary, marginBottom: spacing[1] }}>
              {t('login')}
            </AppText>
            <AppText variant="bodySmall" color="secondary" style={{ marginBottom: spacing[4] }}>
              {t('roleSelectionHint')}
            </AppText>

            <AppInput
              label={t('emailOrId')}
              value={email}
              onChangeText={setEmail}
              placeholder="employee@stitchflow.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color={tokens.textSecondary} strokeWidth={2} />}
            />

            <AppInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              leftIcon={<Lock size={18} color={tokens.textSecondary} strokeWidth={2} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={tokens.textSecondary} strokeWidth={2} />
                  ) : (
                    <Eye size={18} color={tokens.textSecondary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <AppText variant="label" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
                {t('forgotPassword')}
              </AppText>
            </TouchableOpacity>

            <AppButton
              title={t('loginButton')}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => {
                handleDemoLogin('factory-manager');
              }}
              style={{ marginBottom: spacing[3] }}
            />

            {/* Divider */}
            <View style={[styles.divider, { borderTopColor: tokens.border }]}>
              <AppText variant="caption" color="secondary">
                {t('orContinueWith')}
              </AppText>
            </View>

            {/* Demo Login Button */}
            <AppButton
              title={t('demoLogin')}
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon={<Users size={18} color={tokens.textPrimary} strokeWidth={2.2} />}
              onPress={() => setShowDemo(!showDemo)}
            />
          </AppCard>

          {/* Demo Role Selector Modal / Container */}
          {showDemo && (
            <View style={[styles.demoCard, { backgroundColor: tokens.surface, borderColor: mode === 'dark' ? tokens.signatureLime : tokens.brand }]}>
              <View style={[styles.demoBadge, { backgroundColor: tokens.warningLight }]}>
                <AlertTriangle size={14} color={tokens.warning} strokeWidth={2.4} />
                <AppText variant="caption" bold style={{ color: tokens.warning, marginLeft: 4, flexShrink: 1 }}>
                  {t('common:demoBadgeHint')}
                </AppText>
              </View>

              <AppText variant="h4" bold style={{ color: tokens.textPrimary, marginBottom: spacing[3] }}>
                {t('selectDemoRole')}
              </AppText>

              <View style={styles.roleList}>
                {DEMO_ROLES.map((role) => {
                  const IconComponent = ROLE_ICONS[role];
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => handleDemoLogin(role)}
                      disabled={loading}
                      activeOpacity={0.7}
                      style={[
                        styles.roleRow,
                        {
                          borderColor: tokens.border,
                          backgroundColor: tokens.surfaceSecondary,
                        },
                      ]}
                    >
                      <View style={[styles.roleIconWrap, { backgroundColor: mode === 'dark' ? '#203D2A' : '#E6F7AD' }]}>
                        <IconComponent
                          size={18}
                          color={mode === 'dark' ? tokens.signatureLime : tokens.primaryDeep}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing[3] }}>
                        <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
                          {t(`common:roles.${role}`)}
                        </AppText>
                        <AppText variant="caption" color="secondary" numberOfLines={1}>
                          {t(`common:roleDescriptions.${role}`)}
                        </AppText>
                      </View>
                      <ChevronRight size={18} color={tokens.textSecondary} strokeWidth={2.2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Register Link */}
          <View style={styles.registerRow}>
            <AppText variant="bodySmall" color="secondary">
              {t('noAccount')}{' '}
            </AppText>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
              <AppText variant="bodySmall" bold style={{ color: mode === 'dark' ? tokens.signatureLime : tokens.brand }}>
                {t('register')}
              </AppText>
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
  topBar: {
    alignItems: 'flex-end',
    marginBottom: spacing[2],
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  authCard: {
    marginBottom: spacing[4],
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing[3.5],
  },
  divider: {
    borderTopWidth: 1,
    alignItems: 'center',
    paddingTop: spacing[3],
    marginBottom: spacing[3],
  },
  demoCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  roleList: {
    gap: spacing[2],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
});
