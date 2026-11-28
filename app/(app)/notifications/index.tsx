import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardCheck,
  Factory,
  Package,
  RefreshCw,
  Settings,
  ShieldAlert,
  Wrench,
} from 'lucide-react-native';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import {
  AppNotification,
  NotificationCategory,
  useNotificationStore,
} from '../../../src/store/notificationStore';
import { apiRequest } from '../../../src/services/api/apiClient';
import { navigateFromNotification } from '../../../src/services/notifications/pushService';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { EmptyState } from '../../../src/design-system/components/EmptyState';
import { DashboardSkeleton } from '../../../src/design-system/components/dashboard';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';

type FilterTab = 'all' | 'unread' | 'action_required';

const CATEGORY_OPTIONS: Array<{ key: 'all' | NotificationCategory; labelKey: string }> = [
  { key: 'all', labelKey: 'common:all' },
  { key: 'work_orders', labelKey: 'notifications:categories.work_orders' },
  { key: 'production', labelKey: 'notifications:categories.production' },
  { key: 'quality', labelKey: 'notifications:categories.quality' },
  { key: 'inventory', labelKey: 'notifications:categories.inventory' },
  { key: 'packing_dispatch', labelKey: 'notifications:categories.packing_dispatch' },
  { key: 'intelligence', labelKey: 'notifications:categories.intelligence' },
  { key: 'admin', labelKey: 'notifications:categories.admin' },
];

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getCategoryIcon(category: NotificationCategory, color: string) {
  switch (category) {
    case 'quality':
      return <ClipboardCheck size={16} color={color} />;
    case 'packing_dispatch':
      return <Package size={16} color={color} />;
    case 'intelligence':
      return <AlertTriangle size={16} color={color} />;
    case 'production':
      return <Wrench size={16} color={color} />;
    case 'inventory':
      return <Factory size={16} color={color} />;
    case 'admin':
      return <ShieldAlert size={16} color={color} />;
    default:
      return <Bell size={16} color={color} />;
  }
}

export default function NotificationsCenterScreen() {
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['notifications', 'common', 'errors']);
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const queryClient = useQueryClient();

  const {
    demoItems,
    markDemoRead,
    markAllDemoRead,
    setCounts,
  } = useNotificationStore();

  const [tab, setTab] = useState<FilterTab>('all');
  const [category, setCategory] = useState<'all' | NotificationCategory>('all');

  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.id, tab, category],
    enabled: !isDemoMode && !!user,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '30' });
      if (tab === 'unread') qs.set('unreadOnly', 'true');
      if (tab === 'action_required') qs.set('actionRequired', 'true');
      if (category !== 'all') qs.set('category', category);
      if (pageParam) qs.set('cursor', pageParam);
      return apiRequest<{ items: AppNotification[]; nextCursor: string | null }>(`/notifications?${qs.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      void apiRequest<{ unreadCount: number; actionRequiredCount: number }>('/notifications/unread-count')
        .then((res) => setCounts(res.unreadCount, res.actionRequiredCount))
        .catch(() => {});
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      setCounts(0, 0);
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const rawItems = useMemo(() => {
    if (isDemoMode) {
      return demoItems.filter((item) => {
        if (tab === 'unread' && item.readAt) return false;
        if (tab === 'action_required' && !item.actionRequired) return false;
        if (category !== 'all' && item.category !== category) return false;
        return true;
      });
    }
    return query.data?.pages.flatMap((p) => p.items) ?? [];
  }, [isDemoMode, demoItems, query.data, tab, category]);

  const sections = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    for (const item of rawItems) {
      const ts = new Date(item.createdAt).getTime();
      if (ts >= todayStart.getTime()) today.push(item);
      else if (ts >= yesterdayStart.getTime()) yesterday.push(item);
      else earlier.push(item);
    }

    const out: Array<{ title: string; data: AppNotification[] }> = [];
    if (today.length > 0) out.push({ title: t('notifications:today', { defaultValue: 'Today' }), data: today });
    if (yesterday.length > 0) out.push({ title: t('notifications:yesterday', { defaultValue: 'Yesterday' }), data: yesterday });
    if (earlier.length > 0) out.push({ title: t('notifications:earlier', { defaultValue: 'Earlier' }), data: earlier });
    return out;
  }, [rawItems, t]);

  const handlePressItem = useCallback(
    (item: AppNotification) => {
      if (isDemoMode) {
        markDemoRead(item.id);
      } else if (!item.readAt) {
        markReadMutation.mutate(item.id);
      }
      navigateFromNotification(router, item.actionRoute, item.actionParameters);
    },
    [isDemoMode, markDemoRead, markReadMutation, router],
  );

  const handleMarkAllRead = () => {
    if (isDemoMode) markAllDemoRead();
    else markAllMutation.mutate();
  };

  const handleRefresh = useCallback(() => {
    if (isDemoMode) return;
    void query.refetch();
    void apiRequest<{ unreadCount: number; actionRequiredCount: number }>('/notifications/unread-count')
      .then((res) => setCounts(res.unreadCount, res.actionRequiredCount))
      .catch(() => {});
  }, [isDemoMode, query, setCounts]);

  const roleLabel = user?.role
    ? t(`common:roles.${user.role}`, { defaultValue: user.role })
    : t('common:all');
  const hasActiveFilter = tab !== 'all' || category !== 'all';

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const isUnread = !item.readAt;
      const priorityColor =
        item.priority === 'CRITICAL'
          ? tokens.danger
          : item.priority === 'WARNING'
            ? tokens.warning
            : item.priority === 'SUCCESS'
              ? tokens.success
              : tokens.brand;

      const title = t(item.titleKey, {
        defaultValue: item.titleKey.split('.').slice(-2, -1)[0]?.replace(/_/g, ' ') ?? 'Update',
        ...(item.messageParameters ?? {}),
      });
      const body = t(item.messageKey, {
        defaultValue: item.messageKey,
        ...(item.messageParameters ?? {}),
      });

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePressItem(item)}
          style={[
            styles.itemCard,
            {
              backgroundColor: isUnread ? tokens.brandLight : tokens.surface,
              borderColor: isUnread ? tokens.brand : tokens.border,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: tokens.surface }]}>
            {getCategoryIcon(item.category, priorityColor)}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.itemTop}>
              <AppText variant="label" bold numberOfLines={1} style={{ color: tokens.textPrimary, flex: 1 }}>
                {title}
              </AppText>
              <AppText variant="caption" color="secondary">
                {formatRelativeTime(item.createdAt)}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
              {body}
            </AppText>
            <View style={styles.itemMeta}>
              <StatusBadge
                label={item.priority}
                variant={
                  item.priority === 'CRITICAL'
                    ? 'danger'
                    : item.priority === 'WARNING'
                      ? 'warning'
                      : item.priority === 'SUCCESS'
                        ? 'success'
                        : 'brand'
                }
                size="sm"
              />
              {item.actionRequired && (
                <StatusBadge label={t('notifications:actionRequired', { defaultValue: 'Action Required' })} variant="warning" size="sm" />
              )}
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: tokens.brand }]} />}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handlePressItem, t, tokens],
  );

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('common:notifications')}
        showBack
        onBack={() => router.back()}
        rightEl={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={styles.iconBtn}
              accessibilityLabel={t('notifications:markAllRead', { defaultValue: 'Mark all read' })}
            >
              <CheckCheck size={20} color={tokens.brand} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/notifications/preferences' as never)}
              style={styles.iconBtn}
              accessibilityLabel={t('notifications:preferences', { defaultValue: 'Preferences' })}
            >
              <Settings size={20} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tabs: All / Unread / Action Required */}
      <View style={[styles.tabRow, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        {(['all', 'unread', 'action_required'] as FilterTab[]).map((key) => {
          const active = tab === key;
          const label =
            key === 'all'
              ? t('common:all')
              : key === 'unread'
                ? t('notifications:unread', { defaultValue: 'Unread' })
                : t('notifications:actionRequired', { defaultValue: 'Action Required' });
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.tabBtn,
                {
                  borderBottomColor: active ? tokens.brand : 'transparent',
                },
              ]}
            >
              <AppText variant="label" bold={active} style={{ color: active ? tokens.brand : tokens.textSecondary }}>
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Chips */}
      <View style={styles.chipWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setCategory(opt.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? tokens.brand : tokens.surface,
                    borderColor: active ? tokens.brand : tokens.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  bold={active}
                  style={{ color: active ? tokens.textInverse : tokens.textSecondary }}
                >
                  {t(opt.labelKey, { defaultValue: opt.key.replace('_', ' ') })}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!isDemoMode && query.isLoading ? (
        <View style={{ padding: spacing[4] }}>
          <DashboardSkeleton />
        </View>
      ) : !isDemoMode && query.isError ? (
        <View style={styles.centerBox}>
          <EmptyState title={t('errors:serverError')} />
          <AppButton title={t('common:refresh')} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <AppText variant="caption" bold uppercase color="secondary" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing[6] },
            sections.length === 0 && { flexGrow: 1 },
          ]}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshing={!isDemoMode && query.isRefetching}
          onRefresh={!isDemoMode ? handleRefresh : undefined}
          onEndReached={() => {
            if (!isDemoMode && query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={
                  <View style={[styles.emptyIconCircle, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
                    <Bell size={28} color={tokens.brand} strokeWidth={1.8} />
                  </View>
                }
                title={t('notifications:emptyTitle', { defaultValue: 'No notifications yet' })}
                message={
                  hasActiveFilter
                    ? t('notifications:emptyFilteredMessage')
                    : t('notifications:emptyMessage', { role: roleLabel })
                }
              />
              <View style={styles.emptyActions}>
                <AppButton
                  title={t('common:refresh')}
                  size="sm"
                  loading={!isDemoMode && query.isRefetching}
                  leftIcon={<RefreshCw size={16} color={tokens.textInverse} />}
                  onPress={handleRefresh}
                />
                {hasActiveFilter && (
                  <AppButton
                    title={t('notifications:resetFilters', { defaultValue: 'Show All' })}
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setTab('all');
                      setCategory('all');
                    }}
                  />
                )}
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2 },
  chipWrap: { paddingVertical: spacing[2] },
  chipScroll: { paddingHorizontal: spacing[4], gap: spacing[2] },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: spacing[4], gap: spacing[2] },
  sectionTitle: { marginTop: spacing[3], marginBottom: spacing[1], letterSpacing: 0.6 },
  itemCard: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.card,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  centerBox: { padding: spacing[6], alignItems: 'center', gap: spacing[3] },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: spacing[8] },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActions: { flexDirection: 'row', gap: spacing[2], marginTop: -spacing[4] },
});
