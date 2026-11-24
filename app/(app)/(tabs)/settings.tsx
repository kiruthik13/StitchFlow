import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User,
  Shield,
  Building2,
  Clock,
  Layers,
  Bell,
  Palette,
  Globe,
  Info,
  LogOut,
  AlertTriangle,
  Server,
  ExternalLink,
} from 'lucide-react-native';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { LanguageSwitcher } from '../../../src/design-system/components/LanguageSwitcher';
import { ThemeSelector } from '../../../src/design-system/components/ThemeSelector';
import { StitchFlowLogo } from '../../../src/design-system/components/branding/StitchFlowLogo';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
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
      <View
        style={[
          styles.header,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <View style={styles.headerRow}>
          <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
            {t('settings')}
          </AppText>
          <StatusBadge label="OFFLINE DEMO" variant="warning" size="sm" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <SectionLabel label={t('profile')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: tokens.brandLight, borderColor: tokens.brand }]}>
              <AppText variant="h3" bold style={{ color: tokens.brand }}>
                {user?.avatarInitials ?? 'SF'}
              </AppText>
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <View style={styles.nameHeader}>
                <AppText variant="h4" bold style={{ color: tokens.textPrimary }}>
                  {user?.name ?? 'User'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: spacing[2] }}>
                <StatusBadge
                  label={ROLE_DISPLAY_NAMES[user?.role ?? 'operator']}
                  variant="brand"
                  size="sm"
                />
                <AppText variant="codeSmall" mono color="secondary">
                  {user?.employeeId ?? 'EMP-0000'}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.border }]} />

          <InfoRow
            icon={<Building2 size={15} color={tokens.textSecondary} />}
            label="Factory"
            value={user?.factoryName ?? 'Tirupur Unit 1'}
          />
          {user?.lineName && (
            <InfoRow
              icon={<Layers size={15} color={tokens.textSecondary} />}
              label="Line"
              value={user.lineName}
            />
          )}
          <InfoRow
            icon={<Clock size={15} color={tokens.textSecondary} />}
            label="Shift"
            value={user?.shiftType ?? 'Day Shift (08:00 - 17:00)'}
          />

          <View style={[styles.metaNotice, { backgroundColor: tokens.surfaceSecondary }]}>
            <AppText variant="caption" color="secondary">
              Operator profiles and line allocations are managed in StitchFlow Cloud Admin.
            </AppText>
          </View>
        </AppCard>

        {/* Language Selection */}
        <SectionLabel label={`${t('language')} / மொழி / भाषा`} />
        <AppCard padding={spacing[3]} style={{ marginBottom: spacing[3] }}>
          <LanguageSwitcher />
        </AppCard>

        {/* Appearance / Theme */}
        <SectionLabel label={t('appearance')} />
        <AppCard padding={spacing[3]} style={{ marginBottom: spacing[3] }}>
          <ThemeSelector />
        </AppCard>

        {/* Notifications */}
        <SectionLabel label={t('notifications')} />
        <AppCard padding={spacing[3]} style={{ marginBottom: spacing[3] }}>
          <NotifToggle
            label="Production Alerts"
            desc="Bottleneck warning, line stoppage, target notifications"
            value={notifs.prod}
            onToggle={(v) => setNotifs({ ...notifs, prod: v })}
            tokens={tokens}
          />
          <NotifToggle
            label="Quality Gate Alerts"
            desc="Rework spike, rejection thresholds, reinspection requests"
            value={notifs.quality}
            onToggle={(v) => setNotifs({ ...notifs, quality: v })}
            tokens={tokens}
          />
          <NotifToggle
            label="Inventory & Stock Alerts"
            desc="Low fabric buffer, trim shortage, carton dispatch queue"
            value={notifs.stock}
            onToggle={(v) => setNotifs({ ...notifs, stock: v })}
            tokens={tokens}
          />
          <NotifToggle
            label="Shift Change Reminders"
            desc="Handover reports, shift start/end alerts"
            value={notifs.shift}
            onToggle={(v) => setNotifs({ ...notifs, shift: v })}
            tokens={tokens}
            isLast
          />
        </AppCard>

        {/* About & Industrial Diagnostics */}
        <SectionLabel label={t('about')} />
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[4] }}>
          <View style={styles.aboutHeader}>
            <StitchFlowLogo size={36} color={tokens.brand} />
            <View style={{ marginLeft: spacing[3] }}>
              <AppText variant="h4" bold style={{ color: tokens.textPrimary }}>
                StitchFlow Mobile
              </AppText>
              <AppText variant="caption" color="secondary">
                Signature Industrial Edition V2
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.border }]} />

          <InfoRow label="Build Version" value="2.0.0-release (2026.11)" />
          <InfoRow label="Environment" value="Expo 52 · React Native 0.76" />
          <InfoRow label="Protocol" value="StitchFlow Sync v2 · Local Mock" />
          <InfoRow label="Organization" value="Tirupur Garments Cluster" />

          <View style={[styles.demoBadge, { backgroundColor: tokens.warningLight, borderColor: tokens.warning }]}>
            <AlertTriangle size={16} color={tokens.warning} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: spacing[2] }}>
              <AppText variant="caption" bold style={{ color: tokens.warning }}>
                STANDALONE DEMO MODE ACTIVE
              </AppText>
              <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                All floor actions, QC releases, and scans modify in-memory store. Hardware scanners link via USB/BT HID in production build.
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Sign Out Action */}
        <AppButton
          title={t('logout')}
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
        message="Are you sure you want to exit the current operator session? Unsynchronized demo floor actions will be reset."
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
    <AppText
      variant="caption"
      color="secondary"
      uppercase
      bold
      style={{ letterSpacing: 0.8, marginBottom: spacing[2], marginTop: spacing[1] }}
    >
      {label}
    </AppText>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  const { tokens } = useThemeStore();
  return (
    <View style={[styles.infoRow, { borderBottomColor: tokens.border }]}>
      <View style={styles.labelCol}>
        {icon}
        <AppText variant="caption" color="secondary" style={{ marginLeft: icon ? spacing[2] : 0 }}>
          {label}
        </AppText>
      </View>
      <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
        {value}
      </AppText>
    </View>
  );
}

function NotifToggle({
  label,
  desc,
  value,
  onToggle,
  tokens,
  isLast = false,
}: {
  label: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  tokens: any;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.notifRow, !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
      <View style={{ flex: 1, marginRight: spacing[3] }}>
        <AppText variant="label" bold style={{ color: tokens.textPrimary }}>
          {label}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {desc}
        </AppText>
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
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    padding: spacing[4],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaNotice: {
    borderRadius: radii.sm,
    padding: spacing[2.5],
    marginTop: spacing[3],
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoBadge: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing[3],
    marginTop: spacing[3],
  },
});
