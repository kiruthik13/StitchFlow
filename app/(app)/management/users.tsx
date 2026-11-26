import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const DEMO_USERS = [
  { id: 'usr-1', empId: 'EMP-0101', name: 'Arun Kumar', role: 'supervisor', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-2', empId: 'EMP-0205', name: 'Kavitha Selvam', role: 'operator', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-3', empId: 'EMP-0302', name: 'Meena Sundaram', role: 'qc-inspector', line: 'Endline QC', shift: 'Morning', status: 'Active' },
  { id: 'usr-4', empId: 'EMP-0410', name: 'Senthil Nathan', role: 'store-dispatch', line: 'Main Store', shift: 'General', status: 'Active' },
  { id: 'usr-5', empId: 'EMP-0504', name: 'Anitha Raj', role: 'packing-staff', line: 'Packing Bay', shift: 'Morning', status: 'Active' },
];

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
  role_code: string;
  account_status: string;
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
  const [liveTab, setLiveTab] = useState<'roster' | 'users'>('roster');
  const [empIdInput, setEmpIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

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
    mutationFn: (id: string) =>
      apiRequest(`/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'active', factoryId }),
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
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          renderItem={({ item }) => (
            <AppCard padding={spacing[4]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" bold>{item.name}</AppText>
                  <AppText variant="code" mono color="secondary">{item.empId}</AppText>
                  <AppText variant="caption" color="secondary">{item.line} · {item.shift}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <StatusBadge label={item.role.replace('-', ' ').toUpperCase()} variant="brand" size="sm" />
                  <TouchableOpacity
                    style={{ marginTop: spacing[2] }}
                    onPress={() => Alert.alert(item.name, item.role)}
                  >
                    <AppText variant="caption" color="brand">{t('common:edit')}</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          )}
        />
      </View>
    );
  }

  const term = search.toLowerCase();
  const filteredRoster = (rosterQuery.data ?? []).filter((r) =>
    r.employeeId.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)
  );
  const filteredUsers = (usersQuery.data ?? []).filter((u) =>
    u.name.toLowerCase().includes(term) || u.employee_id.toLowerCase().includes(term) || u.role_code.toLowerCase().includes(term)
  );

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={t('production:floorAccess')} subtitle={t('production:rosterProvisioning')} showBack onBack={() => router.back()} />
      <View style={{ padding: spacing[4], paddingBottom: spacing[2], gap: spacing[2] }}>
        <FilterBar
          options={[
            { key: 'roster', label: t('production:rosterProvisioning') },
            { key: 'users', label: t('production:registeredUsers') },
          ]}
          selected={liveTab}
          onSelect={(k) => setLiveTab(k as 'roster' | 'users')}
        />
        <SearchField value={search} onChangeText={setSearch} placeholder={t('common:search')} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {liveTab === 'roster' ? (
          <View style={{ gap: spacing[3] }}>
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
            {filteredRoster.map((item) => (
              <AppCard key={item.employeeId} padding={spacing[4]}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="code" mono bold>{item.employeeId}</AppText>
                    <AppText variant="bodySmall">{item.email}</AppText>
                    <AppText variant="caption" color="secondary">{item.factoryName}</AppText>
                    {item.registeredName && (
                      <AppText variant="caption" color="secondary">{item.registeredName} · {item.roleCode} ({item.accountStatus})</AppText>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: spacing[2] }}>
                    <StatusBadge label={item.isActive ? 'ACTIVE' : 'INACTIVE'} variant={item.isActive ? 'success' : 'warning'} size="sm" />
                    <AppButton
                      title={item.isActive ? t('production:suspendUser') : t('production:activateUser')}
                      size="sm"
                      variant="outline"
                      onPress={() => toggleRoster.mutate({ employeeId: item.employeeId, isActive: !item.isActive })}
                    />
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing[2] }}>
            {usersQuery.isLoading && <AppText>{t('common:loading')}</AppText>}
            {filteredUsers.map((u) => (
              <AppCard key={u.id} padding={spacing[4]}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="h4" bold>{u.name}</AppText>
                    <AppText variant="code" mono color="secondary">{u.employee_id}</AppText>
                    <AppText variant="caption" color="secondary">{u.email}</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: spacing[2] }}>
                    <StatusBadge label={u.role_code.toUpperCase()} variant="brand" size="sm" />
                    <StatusBadge label={u.account_status.toUpperCase()} variant={u.account_status === 'active' ? 'success' : 'warning'} size="sm" />
                    {u.account_status === 'pending' && (
                      <AppButton title={t('production:approveUser')} size="sm" onPress={() => approveAccount.mutate(u.id)} />
                    )}
                    {u.account_status === 'active' && (
                      <AppButton title={t('production:suspendUser')} size="sm" variant="outline" onPress={() => updateAccountStatus.mutate({ id: u.id, status: 'suspended' })} />
                    )}
                    {u.account_status === 'suspended' && (
                      <AppButton title={t('production:activateUser')} size="sm" variant="outline" onPress={() => updateAccountStatus.mutate({ id: u.id, status: 'active' })} />
                    )}
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
