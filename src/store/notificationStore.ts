import { create } from 'zustand';
import { UserRole } from '../core/types';

export type NotificationCategory =
  | 'work_orders'
  | 'production'
  | 'quality'
  | 'inventory'
  | 'packing_dispatch'
  | 'intelligence'
  | 'admin';

export type NotificationPriority = 'INFORMATION' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface AppNotification {
  id: string;
  eventId?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleKey: string;
  messageKey: string;
  messageParameters: Record<string, unknown>;
  entityType: string;
  entityId?: string | null;
  actionRoute?: string | null;
  actionParameters?: Record<string, unknown>;
  actionRequired: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationState {
  demoItems: AppNotification[];
  unreadCount: number;
  actionRequiredCount: number;
  activeDeviceId: string | null;
  banner: AppNotification | null;
  setCounts: (unread: number, actionRequired: number) => void;
  setActiveDeviceId: (id: string | null) => void;
  showBanner: (notif: AppNotification) => void;
  dismissBanner: () => void;
  seedDemoForRole: (role: UserRole) => void;
  addDemoNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'>) => void;
  markDemoRead: (id: string) => void;
  markAllDemoRead: () => void;
  reset: () => void;
}

const DEMO_SEED: AppNotification[] = [
  {
    id: 'demo-n-1',
    category: 'work_orders',
    priority: 'WARNING',
    titleKey: 'notifications:events.JOB_APPROVAL_REQUESTED.title',
    messageKey: 'notifications:events.JOB_APPROVAL_REQUESTED.message',
    messageParameters: { jobCode: 'JOB-1002' },
    entityType: 'job',
    entityId: 'job-2',
    actionRoute: '/(app)/approvals',
    actionParameters: {},
    actionRequired: true,
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'demo-n-2',
    category: 'quality',
    priority: 'WARNING',
    titleKey: 'notifications:events.QC_REWORK_REQUESTED.title',
    messageKey: 'notifications:events.QC_REWORK_REQUESTED.message',
    messageParameters: { bundleCode: 'BND-00521', rework: 15 },
    entityType: 'bundle',
    entityId: 'bnd-1',
    actionRoute: '/(app)/inspections/[id]',
    actionParameters: { id: 'bnd-1' },
    actionRequired: true,
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: 'demo-n-3',
    category: 'intelligence',
    priority: 'CRITICAL',
    titleKey: 'notifications:events.BOTTLENECK_CRITICAL.title',
    messageKey: 'notifications:events.BOTTLENECK_CRITICAL.message',
    messageParameters: { stage: 'Ironing & Trimming', lineName: 'Line 1', jobCode: 'JOB-1001' },
    entityType: 'job',
    entityId: 'job-1',
    actionRoute: '/(app)/md/bottlenecks',
    actionParameters: {},
    actionRequired: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  demoItems: DEMO_SEED,
  unreadCount: DEMO_SEED.filter((n) => !n.readAt).length,
  actionRequiredCount: DEMO_SEED.filter((n) => !n.readAt && n.actionRequired).length,
  activeDeviceId: null,
  banner: null,

  setCounts: (unreadCount, actionRequiredCount) => set({ unreadCount, actionRequiredCount }),
  setActiveDeviceId: (activeDeviceId) => set({ activeDeviceId }),
  showBanner: (banner) => set({ banner }),
  dismissBanner: () => set({ banner: null }),

  seedDemoForRole: () => {
    const items = get().demoItems;
    set({
      unreadCount: items.filter((n) => !n.readAt).length,
      actionRequiredCount: items.filter((n) => !n.readAt && n.actionRequired).length,
    });
  },

  addDemoNotification: (notif) => {
    const created: AppNotification = {
      ...notif,
      id: `demo-n-${Date.now()}`,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    const next = [created, ...get().demoItems];
    set({
      demoItems: next,
      unreadCount: next.filter((n) => !n.readAt).length,
      actionRequiredCount: next.filter((n) => !n.readAt && n.actionRequired).length,
      banner: created,
    });
  },

  markDemoRead: (id) => {
    const next = get().demoItems.map((n) =>
      n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
    );
    set({
      demoItems: next,
      unreadCount: next.filter((n) => !n.readAt).length,
      actionRequiredCount: next.filter((n) => !n.readAt && n.actionRequired).length,
    });
  },

  markAllDemoRead: () => {
    const now = new Date().toISOString();
    const next = get().demoItems.map((n) => (n.readAt ? n : { ...n, readAt: now }));
    set({ demoItems: next, unreadCount: 0, actionRequiredCount: 0 });
  },

  reset: () => set({ unreadCount: 0, actionRequiredCount: 0, activeDeviceId: null, banner: null }),
}));
