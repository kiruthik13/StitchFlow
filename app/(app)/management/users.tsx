import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { SearchField } from '../../../src/design-system/components/SearchField';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';

const FACTORY_USERS = [
  { id: 'usr-1', empId: 'EMP-0101', name: 'Arun Kumar', role: 'supervisor', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-2', empId: 'EMP-0205', name: 'Kavitha Selvam', role: 'operator', line: 'Line 1', shift: 'Morning', status: 'Active' },
  { id: 'usr-3', empId: 'EMP-0302', name: 'Meena Sundaram', role: 'qc-inspector', line: 'Endline QC', shift: 'Morning', status: 'Active' },
  { id: 'usr-4', empId: 'EMP-0410', name: 'Senthil Nathan', role: 'store-dispatch', line: 'Main Store', shift: 'General', status: 'Active' },
  { id: 'usr-5', empId: 'EMP-0504', name: 'Anitha Raj', role: 'packing-staff', line: 'Packing Bay', shift: 'Morning', status: 'Active' },
];

export default function UserManagementScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filtered = FACTORY_USERS.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.empId.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title="Users & Roles" subtitle="Factory Floor Access Control" showBack onBack={() => router.back()} />

      <View style={{ padding: spacing[4], paddingBottom: spacing[2] }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search employee name, ID or role..." />
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
                <AppText variant="caption" color="secondary">{item.line} · {item.shift} Shift</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <StatusBadge label={item.role.replace('-', ' ').toUpperCase()} variant="brand" size="sm" />
                <TouchableOpacity
                  style={{ marginTop: spacing[2] }}
                  onPress={() => Alert.alert('Edit Role', `Modify access permissions for ${item.name}`)}
                >
                  <AppText variant="caption" color="brand">Edit Role</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </AppCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
