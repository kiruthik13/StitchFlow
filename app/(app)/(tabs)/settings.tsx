import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { LanguageSwitcher } from '../../../src/design-system/components/LanguageSwitcher';
import { ThemeSelector } from '../../../src/design-system/components/ThemeSelector';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { ROLE_DISPLAY_NAMES } from '../../../src/core/permissions';

export default function SettingsTabScreen() {
  const { tokens } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifs, setNotifs] = useState({ prod: true, quality: true, stock: true, shift: false });

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + spacing[3] }]}>
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>{t('settings')}</AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>

        {/* Profile Section */}
        <SectionLabel label={t('profile')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: tokens.brandLight }]}>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>{user?.avatarInitials ?? 'U'}</AppText>
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <AppText variant="h4" bold>{user?.name ?? 'User'}</AppText>
              <AppText variant="label" color="secondary">{ROLE_DISPLAY_NAMES[user?.role ?? 'operator']}</AppText>
              <AppText variant="caption" color="secondary" mono>{user?.employeeId ?? 'EMP-0000'}</AppText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.border }]} />
          <InfoRow label="Factory" value={user?.factoryName ?? '—'} />
          {user?.lineName && <InfoRow label="Line" value={user.lineName} />}
          <InfoRow label="Shift" value={user?.shiftType ?? '—'} />
          <TouchableOpacity style={{ marginTop: spacing[3] }}>
            <AppText variant="label" color="secondary" style={{ textDecorationLine: 'underline' }}>
              Profile editing requires production server
            </AppText>
          </TouchableOpacity>
        </AppCard>

        {/* Language */}
        <SectionLabel label={`${t('language')} / மொழி / भाषा`} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <LanguageSwitcher />
        </AppCard>

        {/* Appearance */}
        <SectionLabel label={t('appearance')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <ThemeSelector />
        </AppCard>

        {/* Notifications */}
        <SectionLabel label={t('notifications')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <NotifToggle label="Production Alerts" desc="Bottleneck, delay alerts" value={notifs.prod} onToggle={(v) => setNotifs({ ...notifs, prod: v })} tokens={tokens} />
          <NotifToggle label="Quality Alerts" desc="Rework, rejection alerts" value={notifs.quality} onToggle={(v) => setNotifs({ ...notifs, quality: v })} tokens={tokens} />
          <NotifToggle label="Stock Alerts" desc="Low stock warnings" value={notifs.stock} onToggle={(v) => setNotifs({ ...notifs, stock: v })} tokens={tokens} />
          <NotifToggle label="Shift Reminders" desc="Start/end of shift" value={notifs.shift} onToggle={(v) => setNotifs({ ...notifs, shift: v })} tokens={tokens} isLast />
        </AppCard>

        {/* About */}
        <SectionLabel label={t('about')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <InfoRow label="App" value="StitchFlow" />
          <InfoRow label="Version" value="1.0.0 (Demo)" />
          <InfoRow label="Build" value="2026.11" />
          <InfoRow label="Organization" value="StitchFlow Manufacturing" />
          <View style={[styles.demoBadge, { backgroundColor: tokens.warningLight, marginTop: spacing[3] }]}>
            <AppText variant="caption" style={{ color: tokens.warning }}>
              ⚠️ Demo Mode — Frontend Preview Release
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              This build uses mock data only. No data is sent to any server.
            </AppText>
          </View>
        </AppCard>

        {/* Logout */}
        <AppButton
          title={`${t('logout')} →`}
          variant="danger"
          size="lg"
          fullWidth
          onPress={() => setShowLogoutConfirm(true)}
          style={{ marginBottom: spacing[4] }}
        />

      </ScrollView>

      <ConfirmSheet
        visible={showLogoutConfirm}
        title={t('logout')}
        message="Are you sure you want to logout? All demo session data will be cleared."
        confirmLabel={t('logout')}
        cancelLabel={t('cancel')}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="danger"
      />
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText variant="caption" color="secondary" uppercase style={{ letterSpacing: 0.8, marginBottom: spacing[1.5], marginTop: spacing[1] }}>
      {label}
    </AppText>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.infoRow, { borderBottomColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={{ width: 90 }}>{label}</AppText>
      <AppText variant="label" style={{ color: tokens.textPrimary }}>{value}</AppText>
    </View>
  );
}

function NotifToggle({ label, desc, value, onToggle, tokens, isLast = false }: {
  label: string; desc: string; value: boolean; onToggle: (v: boolean) => void; tokens: any; isLast?: boolean;
}) {
  return (
    <View style={[styles.notifRow, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" color="secondary">{desc}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: tokens.border, true: tokens.brand }}
        thumbColor={tokens.textInverse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1 },
  scroll: { padding: spacing[4] },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginBottom: spacing[3] },
  infoRow: { flexDirection: 'row', paddingVertical: spacing[2], borderBottomWidth: 1 },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2.5] },
  demoBadge: { borderRadius: 6, padding: spacing[2] },
});
