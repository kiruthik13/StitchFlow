import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Cog,
  Crown,
  Package,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react-native';
import { UserRole } from '../../src/core/types';
import { AppButton } from '../../src/design-system/components/AppButton';
import { AppCard } from '../../src/design-system/components/AppCard';
import { AppHeader } from '../../src/design-system/components/AppHeader';
import { AppInput } from '../../src/design-system/components/AppInput';
import { AppText } from '../../src/design-system/components/AppText';
import { StatusBadge } from '../../src/design-system/components/StatusBadge';
import { radii } from '../../src/design-system/tokens/radii';
import { spacing } from '../../src/design-system/tokens/spacing';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

// Default development org/factory UUIDs; configurable via env for multi-org deployments
const DEFAULT_ORG_ID = process.env.EXPO_PUBLIC_DEFAULT_ORG_ID || '11111111-1111-1111-1111-111111111111';
const DEFAULT_FACTORY_ID = process.env.EXPO_PUBLIC_DEFAULT_FACTORY_ID || '22222222-2222-2222-2222-222222222201';

interface RoleConfig {
  role: UserRole;
  isManagement: boolean;
  icon: (color: string) => React.ReactNode;
  primaryOptionsLabelKey: 'machineTypeLabel' | 'lineOrSectionLabel' | 'qcGateLabel' | 'storeZoneLabel' | 'packingBayLabel' | 'managementScopeLabel';
  primaryOptions: string[];
  secondaryOptionsLabelKey: 'shiftLabel' | 'aqlStandardLabel';
  secondaryOptions: string[];
  defaultNotePlaceholder: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    role: 'operator',
    isManagement: false,
    icon: (c) => <Cog size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'machineTypeLabel',
    primaryOptions: ['Single Needle', 'Overlock', 'Flatlock', 'Cutting', 'Kaja / Ironing'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['Morning', 'General', 'Night'],
    defaultNotePlaceholder: 'e.g. Line 1 · Station 04',
  },
  {
    role: 'supervisor',
    isManagement: false,
    icon: (c) => <Users size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'lineOrSectionLabel',
    primaryOptions: ['Line 1', 'Line 2', 'Line 3', 'Cutting Floor', 'Finishing'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['Morning', 'General', 'Night'],
    defaultNotePlaceholder: 'e.g. 25 Operators · Polo Line',
  },
  {
    role: 'qc-inspector',
    isManagement: false,
    icon: (c) => <ClipboardCheck size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'qcGateLabel',
    primaryOptions: ['Inline QC', 'Endline QC', 'Measurement', 'Final AQL'],
    secondaryOptionsLabelKey: 'aqlStandardLabel',
    secondaryOptions: ['AQL 1.5', 'AQL 2.5', 'AQL 4.0'],
    defaultNotePlaceholder: 'e.g. Line 1 & 2 Endline Gate',
  },
  {
    role: 'store-dispatch',
    isManagement: false,
    icon: (c) => <Truck size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'storeZoneLabel',
    primaryOptions: ['Raw Materials', 'Cut Stock', 'Finished Goods', 'Dispatch Bay'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['General', 'Morning', 'Night'],
    defaultNotePlaceholder: 'e.g. GRN & Gate Pass Desk',
  },
  {
    role: 'packing-staff',
    isManagement: false,
    icon: (c) => <Package size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'packingBayLabel',
    primaryOptions: ['Packing Bay A', 'Packing Bay B', 'Export Bay', 'Store Handover'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['Morning', 'General', 'Night'],
    defaultNotePlaceholder: 'e.g. Carton Sealing & Labeling',
  },
  {
    role: 'factory-manager',
    isManagement: true,
    icon: (c) => <Briefcase size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'managementScopeLabel',
    primaryOptions: ['Main Factory Unit', 'All Production Lines', 'Store & Dispatch'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['All Shifts', 'Day Shift', 'Night Shift'],
    defaultNotePlaceholder: 'e.g. Factory Operations Head',
  },
  {
    role: 'md',
    isManagement: true,
    icon: (c) => <Crown size={18} color={c} strokeWidth={2} />,
    primaryOptionsLabelKey: 'managementScopeLabel',
    primaryOptions: ['Multi-Factory Org', 'Executive Oversight'],
    secondaryOptionsLabelKey: 'shiftLabel',
    secondaryOptions: ['All Shifts'],
    defaultNotePlaceholder: 'e.g. Managing Director',
  },
];

export default function RegisterScreen() {
  const { tokens } = useThemeStore();
  const { register } = useAuthStore();
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
  const activeConfig = useMemo(
    () => ROLE_CONFIGS.find((item) => item.role === selectedRole) ?? ROLE_CONFIGS[0],
    [selectedRole],
  );

  const [primaryOpt, setPrimaryOpt] = useState(ROLE_CONFIGS[0].primaryOptions[0]);
  const [secondaryOpt, setSecondaryOpt] = useState(ROLE_CONFIGS[0].secondaryOptions[0]);
  const [roleNote, setRoleNote] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleSelectRole = (cfg: RoleConfig) => {
    setSelectedRole(cfg.role);
    setPrimaryOpt(cfg.primaryOptions[0]);
    setSecondaryOpt(cfg.secondaryOptions[0]);
    setRoleNote('');
    setError(null);
  };

  const buildDesignation = () => {
    const parts = [
      t(`common:roles.${selectedRole}`),
      primaryOpt,
      secondaryOpt,
      roleNote.trim(),
    ].filter(Boolean);
    return parts.join(' · ').slice(0, 120);
  };

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
      const requestedRole = activeConfig.isManagement
        ? undefined
        : (selectedRole as 'supervisor' | 'operator' | 'qc-inspector' | 'store-dispatch' | 'packing-staff');

      const res = await register({
        employeeId: employeeId.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        organizationId: DEFAULT_ORG_ID,
        factoryId: DEFAULT_FACTORY_ID,
        phone: phone.trim() || undefined,
        designation: buildDesignation(),
        requestedRole,
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
            <AppCard padding={spacing[5]} style={{ borderColor: tokens.success }}>
              <View style={styles.successHeader}>
                <CheckCircle2 size={24} color={tokens.success} strokeWidth={2.2} />
                <AppText variant="h4" bold style={{ color: tokens.successText }}>
                  {t('auth:registrationSubmittedTitle')}
                </AppText>
              </View>
              <AppText variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
                {pendingMessage}
              </AppText>
              <View style={[styles.summaryBox, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
                <AppText variant="caption" color="secondary">
                  {t('auth:selectedRoleLabel')}: {t(`common:roles.${selectedRole}`)}
                </AppText>
                <AppText variant="code" mono bold style={{ marginTop: 2 }}>
                  {employeeId.trim().toUpperCase()} · {buildDesignation()}
                </AppText>
              </View>
              <AppButton
                title={t('auth:backToLogin')}
                variant="outline"
                style={{ marginTop: spacing[4] }}
                onPress={() => router.back()}
              />
            </AppCard>
          ) : (
            <View style={{ gap: spacing[3.5] }}>
              {/* Step 1: 7-Role Selector */}
              <AppCard padding={spacing[4]}>
                <AppText variant="label" bold style={{ marginBottom: spacing[2.5] }}>
                  {t('auth:selectYourRole')}
                </AppText>
                <View style={styles.roleGrid}>
                  {ROLE_CONFIGS.map((cfg) => {
                    const active = cfg.role === selectedRole;
                    return (
                      <TouchableOpacity
                        key={cfg.role}
                        activeOpacity={0.85}
                        onPress={() => handleSelectRole(cfg)}
                        style={[
                          styles.roleTile,
                          {
                            backgroundColor: active ? tokens.brandLight : tokens.surfaceSecondary,
                            borderColor: active ? tokens.brand : tokens.border,
                          },
                        ]}
                      >
                        <View style={styles.roleTileTop}>
                          {cfg.icon(active ? tokens.brand : tokens.textSecondary)}
                          {cfg.isManagement && (
                            <ShieldCheck size={14} color={tokens.warningText} strokeWidth={2} />
                          )}
                        </View>
                        <AppText
                          variant="bodySmall"
                          bold={active}
                          style={{ color: active ? tokens.brand : tokens.textPrimary, marginTop: spacing[1] }}
                          numberOfLines={1}
                        >
                          {t(`common:roles.${cfg.role}`)}
                        </AppText>
                        <AppText variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
                          {t(`common:roleDescriptions.${cfg.role}`)}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Governance Notice for selected role */}
                <View
                  style={[
                    styles.noticeBox,
                    {
                      backgroundColor: activeConfig.isManagement ? tokens.warningLight : tokens.infoLight,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <StatusBadge
                    label={activeConfig.isManagement ? 'MD APPROVAL' : 'FM APPROVAL'}
                    variant={activeConfig.isManagement ? 'warning' : 'info'}
                    size="sm"
                  />
                  <AppText variant="caption" color="secondary" style={{ marginTop: spacing[1.5] }}>
                    {activeConfig.isManagement ? t('auth:managementApprovalNote') : t('auth:floorApprovalNote')}
                  </AppText>
                </View>
              </AppCard>

              {/* Step 2: Dynamic Role-Specific Onboarding Fields */}
              <AppCard padding={spacing[4]}>
                <AppText variant="label" bold style={{ marginBottom: spacing[2.5] }}>
                  {t('auth:roleSpecificDetails')}
                </AppText>

                <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1.5] }}>
                  {t(`auth:${activeConfig.primaryOptionsLabelKey}`)}
                </AppText>
                <View style={styles.chipRow}>
                  {activeConfig.primaryOptions.map((opt) => {
                    const selected = primaryOpt === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setPrimaryOpt(opt)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? tokens.brand : tokens.surfaceSecondary,
                            borderColor: selected ? tokens.brand : tokens.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          bold={selected}
                          style={{ color: selected ? tokens.textInverse : tokens.textPrimary }}
                        >
                          {opt}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <AppText variant="caption" color="secondary" style={{ marginTop: spacing[3], marginBottom: spacing[1.5] }}>
                  {t(`auth:${activeConfig.secondaryOptionsLabelKey}`)}
                </AppText>
                <View style={styles.chipRow}>
                  {activeConfig.secondaryOptions.map((opt) => {
                    const selected = secondaryOpt === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setSecondaryOpt(opt)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? tokens.brand : tokens.surfaceSecondary,
                            borderColor: selected ? tokens.brand : tokens.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          bold={selected}
                          style={{ color: selected ? tokens.textInverse : tokens.textPrimary }}
                        >
                          {opt}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ marginTop: spacing[3] }}>
                  <AppInput
                    label={t('common:remarks')}
                    value={roleNote}
                    onChangeText={setRoleNote}
                    placeholder={activeConfig.defaultNotePlaceholder}
                  />
                </View>
              </AppCard>

              {/* Step 3: Employee Identity & Security */}
              <AppCard padding={spacing[4]}>
                <AppText variant="label" bold style={{ marginBottom: spacing[2.5] }}>
                  {t('auth:identityAndCredentials')}
                </AppText>
                {error && (
                  <AppText variant="caption" color="danger" bold style={{ marginBottom: spacing[2] }}>
                    {error}
                  </AppText>
                )}
                <AppInput
                  label={t('auth:employeeIdLabel')}
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholder="EMP-1042"
                  autoCapitalize="characters"
                />
                <AppInput
                  label={t('fullName')}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                />
                <AppInput
                  label={t('emailOrId')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="employee@stitchflow.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <AppInput
                  label={t('auth:phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
                <AppInput
                  label={t('password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                />
                <AppInput
                  label={t('confirmPassword')}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  secureTextEntry
                  placeholder="••••••••"
                />
                <AppButton
                  title={t('registerButton')}
                  size="lg"
                  fullWidth
                  loading={loading}
                  style={{ marginTop: spacing[2] }}
                  onPress={handleRegister}
                />
              </AppCard>
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
  scroll: { padding: spacing[4], flexGrow: 1, paddingBottom: spacing[8] },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  roleTile: {
    flexGrow: 1,
    flexBasis: '47%',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
    minHeight: 88,
  },
  roleTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeBox: {
    marginTop: spacing[3],
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
    alignItems: 'flex-start',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    minHeight: 36,
    justifyContent: 'center',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  summaryBox: {
    marginTop: spacing[3],
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
});
