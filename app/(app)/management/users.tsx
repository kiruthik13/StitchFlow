import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '../../../src/core/types';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { FilterBar } from '../../../src/design-system/components/FilterBar';
import { SearchField } from '../../../src/design-system/components/SearchField';
import {
  DetailField,
  SectionHeader,
  StructuredRecordCard,
  SummaryStrip,
} from '../../../src/design-system/components/StructuredRecordCard';
import { radii } from '../../../src/design-system/tokens/radii';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { formatDateTime } from '../../../src/utils/formatters';

const DEMO_USERS = [
  { id: 'usr-1', empId: 'EMP-0101', name: 'Arun Kumar', role: 'supervisor', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-2', empId: 'EMP-0205', name: 'Kavitha Selvam', role: 'operator', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-3', empId: 'EMP-0302', name: 'Meena Sundaram', role: 'qc-inspector', line: 'Endline QC', shift: 'Morning', status: 'Active' },
  { id: 'usr-4', empId: 'EMP-0410', name: 'Senthil Nathan', role: 'store-dispatch', line: 'Main Store', shift: 'General', status: 'Active' },
  { id: 'usr-5', empId: 'EMP-0504', name: 'Anitha Raj', role: 'packing-staff', line: 'Packing Bay', shift: 'Morning', status: 'Active' },
];

const FLOOR_ROLES: UserRole[] = ['operator', 'supervisor', 'qc-inspector', 'store-dispatch', 'packing-staff'];
const ALL_ROLES: UserRole[] = ['md', 'factory-manager', ...FLOOR_ROLES];

interface RosterItem {
  employeeId: string;
  email: string;
  factoryId: string;
  factoryName: string;
  isActive: boolean;
  profileId?: string | null;
  registeredName?: string | null;
  roleCode?: string | null;
  accountStatus?: string | null;
}

interface UserAccount {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  role_code: string;
  requested_role?: string | null;
  account_status: string;
  factory_name?: string | null;
  line_name?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
}

export default function UserManagementScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['production', 'common', 'errors']);
  const { isDemoMode, user } = useAuthStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [liveTab, setLiveTab] = useState<'users' | 'roster'>('users');
  const [empIdInput, setEmpIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleSelections, setRoleSelections] = useState<Record<string, UserRole>>({});

  const assignableRoles = user?.role === 'md' ? ALL_ROLES : FLOOR_ROLES;

  const rosterQuery = useQuery({
    queryKey: ['users-roster', user?.id, factoryId],
    enabled: !isDemoMode,
    queryFn: () => apiRequest<RosterItem[]>(factoryId ? `/users/roster?factoryId=${encodeURIComponent(factoryId)}` : '/users/roster'),
  });

  const usersQuery = useQuery({
    queryKey: ['users-accounts', user?.id],
    enabled: !isDemoMode,
    queryFn: () => apiRequest<UserAccount[]>('/users'),
  });

  const provision = useMutation({
    mutationFn: () => apiRequest('/users/roster', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: empIdInput.trim(),
        email: emailInput.trim().toLowerCase(),
        factoryId,
      }),
    }),
    onSuccess: () => {
      setEmpIdInput('');
      setEmailInput('');
      void queryClient.invalidateQueries({ queryKey: ['users-roster', user?.id, factoryId] });
    },
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const toggleRoster = useMutation({
    mutationFn: ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) =>
      apiRequest(`/users/roster/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users-roster', user?.id, factoryId] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const approveAccount = useMutation({
    mutationFn: ({ id, decision, role }: { id: string; decision: 'active' | 'rejected'; role?: UserRole }) =>
      apiRequest(`/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, ...(role ? { role } : {}), ...(factoryId ? { factoryId } : {}) }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users-accounts', user?.id] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  const updateAccountStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      apiRequest(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users-accounts', user?.id] }),
    onError: (err: Error) => Alert.alert(t('errors:serverError'), err.message),
  });

  if (isDemoMode) {
    const filtered = DEMO_USERS.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.empId.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <View style={[styles.flex, { backgroundColor: tokens.background }]}>
        <AppHeader title={t('production:floorAccess')} subtitle={t('production:rosterProvisioning')} showBack onBack={() => router.back()} />
        <View style={{ padding: spacing[4], paddingBottom: spacing[2] }}>
          <SearchField value={search} onChangeText={setSearch} placeholder={t('common:search')} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2.5] }} />}
          renderItem={({ item }) => (
            <StructuredRecordCard
              code={item.empId}
              title={item.name}
              subtitle={t(`common:roles.${item.role}`)}
              status={{ label: item.status.toUpperCase(), variant: 'success', dot: true }}
              fields={[
                { label: t('common:line'), value: item.line },
                { label: t('common:shift'), value: item.shift },
              ]}
            >
              <AppButton
                title={t('common:edit')}
                size="sm"
                variant="outline"
                onPress={() => Alert.alert(item.name, t(`common:roles.${item.role}`))}
              />
            </StructuredRecordCard>
          )}
        />
      </View>
    );
  }

  const term = search.toLowerCase();
  const rosterList = rosterQuery.data ?? [];
  const usersList = usersQuery.data ?? [];

  const filteredRoster = rosterList.filter((r) =>
    r.employeeId.toLowerCase().includes(term) ||
    r.email.toLowerCase().includes(term) ||
    (r.registeredName ?? '').toLowerCase().includes(term)
  );
  const filteredUsers = usersList.filter((u) =>
    u.name.toLowerCase().includes(term) ||
    u.employee_id.toLowerCase().includes(term) ||
    u.role_code.toLowerCase().includes(term) ||
    (u.designation ?? '').toLowerCase().includes(term)
  );

  const pendingCount = usersList.filter(u => u.account_status === 'pending').length;
  const activeCount = usersList.filter(u => u.account_status === 'active').length;
  const suspendedCount = usersList.filter(u => u.account_status === 'suspended').length;

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:floorAccess')} subtitle={t('production:registeredUsers')} showBack onBack={() => router.back()} />
      <View style={{ padding: spacing[4], paddingBottom: spacing[2], gap: spacing[2] }}>
        <FilterBar
          options={[
            { key: 'users', label: `${t('production:registeredUsers')} (${usersList.length})` },
            { key: 'roster', label: `${t('production:rosterProvisioning')} (${rosterList.length})` },
          ]}
          selected={liveTab}
          onSelect={(k) => setLiveTab(k as 'users' | 'roster')}
        />
        <SearchField value={search} onChangeText={setSearch} placeholder={t('common:search')} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {liveTab === 'roster' ? (
          <View style={{ gap: spacing[3] }}>
            <SummaryStrip
              metrics={[
                { label: t('production:rosterProvisioning'), value: rosterList.length, tone: 'brand' },
                { label: t('common:active'), value: rosterList.filter(r => r.isActive).length, tone: 'success' },
                { label: t('production:registeredUsers'), value: rosterList.filter(r => !!r.profileId).length, tone: 'default' },
              ]}
            />
            {factoryId && (
              <AppCard padding={spacing[4]}>
                <AppText variant="h4" bold style={{ marginBottom: spacing[2] }}>{t('production:provisionEmployee')}</AppText>
                <AppInput label={t('production:employeeIdLabel')} value={empIdInput} onChangeText={setEmpIdInput} placeholder="EMP-0102" />
                <AppInput label={t('production:emailLabel')} value={emailInput} onChangeText={setEmailInput} placeholder="worker@factory.com" />
                <AppButton
                  title={t('production:provisionEmployee')}
                  disabled={provision.isPending || !empIdInput.trim() || !emailInput.trim()}
                  onPress={() => provision.mutate()}
                />
              </AppCard>
            )}
            {rosterQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            <SectionHeader title={t('production:rosterProvisioning')} count={filteredRoster.length} />
            {filteredRoster.map((item) => {
              const fields: DetailField[] = [
                { label: t('production:emailLabel'), value: item.email, fullWidth: true },
                { label: t('common:factory'), value: item.factoryName },
                {
                  label: t('common:status'),
                  value: item.registeredName
                    ? `${item.registeredName} (${item.accountStatus ?? 'pending'})`
                    : t('common:pending'),
                },
              ];
              return (
                <StructuredRecordCard
                  key={item.employeeId}
                  code={item.employeeId}
                  title={item.registeredName || item.email}
                  subtitle={item.roleCode ? t(`common:roles.${item.roleCode}`, { defaultValue: item.roleCode }) : undefined}
                  status={{
                    label: item.isActive ? 'ACTIVE' : 'INACTIVE',
                    variant: item.isActive ? 'success' : 'warning',
                    dot: true,
                  }}
                  fields={fields}
                >
                  <AppButton
                    title={item.isActive ? t('production:suspendUser') : t('production:activateUser')}
                    size="sm"
                    variant="outline"
                    onPress={() => toggleRoster.mutate({ employeeId: item.employeeId, isActive: !item.isActive })}
                  />
                </StructuredRecordCard>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: spacing[3] }}>
            <SummaryStrip
              metrics={[
                { label: t('production:registeredUsers'), value: usersList.length, tone: 'brand' },
                { label: t('common:pending'), value: pendingCount, tone: pendingCount > 0 ? 'warning' : 'default' },
                { label: t('common:active'), value: activeCount, tone: 'success' },
                { label: t('production:suspendUser'), value: suspendedCount, tone: suspendedCount > 0 ? 'danger' : 'default' },
              ]}
            />
            {usersQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            <SectionHeader title={t('production:registeredUsers')} count={filteredUsers.length} />
            {filteredUsers.map((u) => {
              const defaultRequested = (
                assignableRoles.includes((u.requested_role as UserRole))
                  ? u.requested_role
                  : assignableRoles.includes(u.role_code as UserRole)
                  ? u.role_code
                  : 'operator'
              ) as UserRole;
              const chosenRole = roleSelections[u.id] ?? defaultRequested;

              const statusBadge =
                u.account_status === 'active'
                  ? { label: 'ACTIVE', variant: 'success' as const, dot: true }
                  : u.account_status === 'pending'
                  ? { label: 'PENDING APPROVAL', variant: 'warning' as const, dot: true }
                  : { label: u.account_status.toUpperCase(), variant: 'danger' as const, dot: true };

              const fields: DetailField[] = [
                { label: t('production:emailLabel'), value: u.email, fullWidth: true },
                {
                  label: t('common:role'),
                  value: t(`common:roles.${u.role_code}`, { defaultValue: u.role_code }),
                  tone: 'brand',
                },
                { label: t('common:factory'), value: u.factory_name || '—' },
              ];
              if (u.phone) {
                fields.push({ label: t('production:phoneLabel'), value: u.phone, mono: true });
              }
              if (u.line_name) {
                fields.push({ label: t('common:line'), value: u.line_name });
              }
              if (u.created_at) {
                fields.push({ label: t('common:date'), value: formatDateTime(u.created_at) });
              }
              if (u.approved_at) {
                fields.push({ label: t('common:approved'), value: formatDateTime(u.approved_at), tone: 'success' });
              }

              return (
                <StructuredRecordCard
                  key={u.id}
                  code={u.employee_id}
                  title={u.name}
                  subtitle={u.requested_role && u.account_status === 'pending'
                    ? `Requested: ${t(`common:roles.${u.requested_role}`, { defaultValue: u.requested_role })}`
                    : undefined}
                  status={statusBadge}
                  fields={fields}
                  highlight={
                    u.designation
                      ? { label: t('common:details'), value: u.designation, tone: 'info' }
                      : undefined
                  }
                >
                  {u.account_status === 'pending' && (
                    <View style={{ gap: spacing[2] }}>
                      <AppText variant="caption" color="secondary" bold>
                        {t('common:role')}
                      </AppText>
                      <View style={styles.roleChipRow}>
                        {assignableRoles.map((roleOpt) => {
                          const selected = chosenRole === roleOpt;
                          return (
                            <TouchableOpacity
                              key={roleOpt}
                              onPress={() => setRoleSelections((prev) => ({ ...prev, [u.id]: roleOpt }))}
                              style={[
                                styles.roleChip,
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
                                {t(`common:roles.${roleOpt}`)}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                        <View style={{ flex: 1 }}>
                          <AppButton
                            title={t('production:approveUser')}
                            size="sm"
                            disabled={approveAccount.isPending}
                            onPress={() => approveAccount.mutate({ id: u.id, decision: 'active', role: chosenRole })}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppButton
                            title={t('common:reject')}
                            size="sm"
                            variant="outline"
                            disabled={approveAccount.isPending}
                            onPress={() =>
                              Alert.alert(t('common:reject'), u.name, [
                                { text: t('common:cancel'), style: 'cancel' },
                                {
                                  text: t('common:confirm'),
                                  onPress: () => approveAccount.mutate({ id: u.id, decision: 'rejected' }),
                                },
                              ])
                            }
                          />
                        </View>
                      </View>
                    </View>
                  )}
                  {u.account_status === 'active' && u.id !== user?.id && (
                    <AppButton
                      title={t('production:suspendUser')}
                      size="sm"
                      variant="outline"
                      disabled={updateAccountStatus.isPending}
                      onPress={() => updateAccountStatus.mutate({ id: u.id, status: 'suspended' })}
                    />
                  )}
                  {u.account_status === 'suspended' && (
                    <AppButton
                      title={t('production:activateUser')}
                      size="sm"
                      variant="outline"
                      disabled={updateAccountStatus.isPending}
                      onPress={() => updateAccountStatus.mutate({ id: u.id, status: 'active' })}
                    />
                  )}
                </StructuredRecordCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  roleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    minHeight: 32,
    justifyContent: 'center',
  },
});
