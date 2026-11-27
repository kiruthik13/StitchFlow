export type NotificationCategory =
  | 'work_orders'
  | 'production'
  | 'quality'
  | 'inventory'
  | 'packing_dispatch'
  | 'intelligence'
  | 'admin';

export type NotificationPriority = 'INFORMATION' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export const NOTIFICATION_EVENT_TYPES = [
  // Work Orders & Approvals
  'JOB_CREATED',
  'JOB_ASSIGNED',
  'JOB_UPDATED',
  'JOB_APPROVAL_REQUESTED',
  'JOB_APPROVED',
  'JOB_REJECTED',
  'JOB_ROUTE_CONFIGURED',
  'JOB_COMPLETED',
  'JOB_CLOSED',
  'JOB_DELIVERY_RISK',
  // Production & Scanning
  'PRODUCTION_TASK_ASSIGNED',
  'CUTTING_COMPLETED',
  'INPUT_IN_COMPLETED',
  'INPUT_OUT_COMPLETED',
  'PRODUCTION_STAGE_STARTED',
  'PRODUCTION_STAGE_COMPLETED',
  'SEWING_OUT_COMPLETED',
  'OUTPUT_IN_COMPLETED',
  'OUTPUT_OUT_COMPLETED',
  'KAJA_BUTTON_COMPLETED',
  'IRONING_COMPLETED',
  'BUNDLE_READY_FOR_NEXT_STAGE',
  'PRODUCTION_TARGET_ACHIEVED',
  'PRODUCTION_TARGET_DELAYED',
  'MACHINE_STOPPAGE_REPORTED',
  'MACHINE_STOPPAGE_RESOLVED',
  // Quality Control
  'QC_INSPECTION_REQUESTED',
  'QC_INSPECTION_COMPLETED',
  'QC_PASSED',
  'QC_RELEASED',
  'QC_REWORK_REQUESTED',
  'QC_REWORK_COMPLETED',
  'QC_REINSPECTION_REQUESTED',
  'QC_HOLD_CREATED',
  'QC_HOLD_RELEASED',
  'QC_REJECTED',
  'QC_DEFECT_THRESHOLD_EXCEEDED',
  // Inventory & Store
  'STOCK_RECEIVED',
  'STOCK_ISSUED',
  'STOCK_TRANSFER_REQUESTED',
  'STOCK_TRANSFER_APPROVED',
  'STOCK_TRANSFER_RECEIVED',
  'STOCK_TRANSFER_DISCREPANCY',
  'STOCK_BELOW_MINIMUM',
  'STOCK_COUNT_DISCREPANCY',
  'STORE_HANDOVER_REQUESTED',
  'STORE_HANDOVER_COMPLETED',
  // Packing & Dispatch
  'PACKING_TASK_ASSIGNED',
  'BUNDLE_READY_FOR_PACKING',
  'PACKING_COMPLETED',
  'CARTON_CREATED',
  'CARTON_READY_FOR_HANDOVER',
  'DISPATCH_APPROVAL_REQUESTED',
  'DISPATCH_APPROVED',
  'DISPATCH_REJECTED',
  'DISPATCH_COMPLETED',
  // Production Intelligence
  'BOTTLENECK_WARNING',
  'BOTTLENECK_CRITICAL',
  'BOTTLENECK_RESOLVED',
  'REWORK_THRESHOLD_EXCEEDED',
  'QUEUE_DELAY_DETECTED',
  'DELIVERY_DELAY_RISK',
  'PRODUCTION_EFFICIENCY_DROP',
  // Administration
  'USER_ASSIGNED_TO_LINE',
  'USER_ASSIGNED_TO_FACTORY',
  'SHIFT_ASSIGNMENT_UPDATED',
  'APPROVAL_PENDING',
  'TASK_OVERDUE',
  'SYSTEM_ANNOUNCEMENT',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export interface EventMetadata {
  category: NotificationCategory;
  priority: NotificationPriority;
  actionRequired: boolean;
  titleKey: string;
  messageKey: string;
  defaultRoute: string;
  groupWindowMinutes?: number;
}

export const EVENT_CATALOG: Record<NotificationEventType, EventMetadata> = {
  JOB_CREATED: {
    category: 'work_orders',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.JOB_CREATED.title',
    messageKey: 'notifications:events.JOB_CREATED.message',
    defaultRoute: '/(app)/approvals',
  },
  JOB_ASSIGNED: {
    category: 'work_orders',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.JOB_ASSIGNED.title',
    messageKey: 'notifications:events.JOB_ASSIGNED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_UPDATED: {
    category: 'work_orders',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.JOB_UPDATED.title',
    messageKey: 'notifications:events.JOB_UPDATED.message',
    defaultRoute: '/(app)/jobs/[id]',
    groupWindowMinutes: 15,
  },
  JOB_APPROVAL_REQUESTED: {
    category: 'work_orders',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.JOB_APPROVAL_REQUESTED.title',
    messageKey: 'notifications:events.JOB_APPROVAL_REQUESTED.message',
    defaultRoute: '/(app)/approvals',
  },
  JOB_APPROVED: {
    category: 'work_orders',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.JOB_APPROVED.title',
    messageKey: 'notifications:events.JOB_APPROVED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_REJECTED: {
    category: 'work_orders',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.JOB_REJECTED.title',
    messageKey: 'notifications:events.JOB_REJECTED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_ROUTE_CONFIGURED: {
    category: 'work_orders',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.JOB_ROUTE_CONFIGURED.title',
    messageKey: 'notifications:events.JOB_ROUTE_CONFIGURED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_COMPLETED: {
    category: 'work_orders',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.JOB_COMPLETED.title',
    messageKey: 'notifications:events.JOB_COMPLETED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_CLOSED: {
    category: 'work_orders',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.JOB_CLOSED.title',
    messageKey: 'notifications:events.JOB_CLOSED.message',
    defaultRoute: '/(app)/jobs/[id]',
  },
  JOB_DELIVERY_RISK: {
    category: 'intelligence',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.JOB_DELIVERY_RISK.title',
    messageKey: 'notifications:events.JOB_DELIVERY_RISK.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 120,
  },
  PRODUCTION_TASK_ASSIGNED: {
    category: 'production',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.PRODUCTION_TASK_ASSIGNED.title',
    messageKey: 'notifications:events.PRODUCTION_TASK_ASSIGNED.message',
    defaultRoute: '/(app)/(tabs)/work',
  },
  CUTTING_COMPLETED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.CUTTING_COMPLETED.title',
    messageKey: 'notifications:events.CUTTING_COMPLETED.message',
    defaultRoute: '/(app)/operations/output-in',
    groupWindowMinutes: 15,
  },
  INPUT_IN_COMPLETED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.INPUT_IN_COMPLETED.title',
    messageKey: 'notifications:events.INPUT_IN_COMPLETED.message',
    defaultRoute: '/(app)/store/goods-receipt',
  },
  INPUT_OUT_COMPLETED: {
    category: 'inventory',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.INPUT_OUT_COMPLETED.title',
    messageKey: 'notifications:events.INPUT_OUT_COMPLETED.message',
    defaultRoute: '/(app)/operations/input-out',
  },
  PRODUCTION_STAGE_STARTED: {
    category: 'production',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.PRODUCTION_STAGE_STARTED.title',
    messageKey: 'notifications:events.PRODUCTION_STAGE_STARTED.message',
    defaultRoute: '/(app)/bundles/[id]',
    groupWindowMinutes: 15,
  },
  PRODUCTION_STAGE_COMPLETED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.PRODUCTION_STAGE_COMPLETED.title',
    messageKey: 'notifications:events.PRODUCTION_STAGE_COMPLETED.message',
    defaultRoute: '/(app)/bundles/[id]',
    groupWindowMinutes: 10,
  },
  SEWING_OUT_COMPLETED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.SEWING_OUT_COMPLETED.title',
    messageKey: 'notifications:events.SEWING_OUT_COMPLETED.message',
    defaultRoute: '/(app)/bundles/[id]',
    groupWindowMinutes: 10,
  },
  OUTPUT_IN_COMPLETED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.OUTPUT_IN_COMPLETED.title',
    messageKey: 'notifications:events.OUTPUT_IN_COMPLETED.message',
    defaultRoute: '/(app)/operations/output-in',
  },
  OUTPUT_OUT_COMPLETED: {
    category: 'inventory',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.OUTPUT_OUT_COMPLETED.title',
    messageKey: 'notifications:events.OUTPUT_OUT_COMPLETED.message',
    defaultRoute: '/(app)/operations/output-out',
  },
  KAJA_BUTTON_COMPLETED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.KAJA_BUTTON_COMPLETED.title',
    messageKey: 'notifications:events.KAJA_BUTTON_COMPLETED.message',
    defaultRoute: '/(app)/bundles/[id]',
    groupWindowMinutes: 10,
  },
  IRONING_COMPLETED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.IRONING_COMPLETED.title',
    messageKey: 'notifications:events.IRONING_COMPLETED.message',
    defaultRoute: '/(app)/bundles/[id]',
    groupWindowMinutes: 10,
  },
  BUNDLE_READY_FOR_NEXT_STAGE: {
    category: 'production',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.BUNDLE_READY_FOR_NEXT_STAGE.title',
    messageKey: 'notifications:events.BUNDLE_READY_FOR_NEXT_STAGE.message',
    defaultRoute: '/(app)/(tabs)/scan',
  },
  PRODUCTION_TARGET_ACHIEVED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.PRODUCTION_TARGET_ACHIEVED.title',
    messageKey: 'notifications:events.PRODUCTION_TARGET_ACHIEVED.message',
    defaultRoute: '/(app)/(tabs)/reports',
  },
  PRODUCTION_TARGET_DELAYED: {
    category: 'production',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.PRODUCTION_TARGET_DELAYED.title',
    messageKey: 'notifications:events.PRODUCTION_TARGET_DELAYED.message',
    defaultRoute: '/(app)/md/bottlenecks',
  },
  MACHINE_STOPPAGE_REPORTED: {
    category: 'production',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.MACHINE_STOPPAGE_REPORTED.title',
    messageKey: 'notifications:events.MACHINE_STOPPAGE_REPORTED.message',
    defaultRoute: '/(app)/operations/report-issue',
  },
  MACHINE_STOPPAGE_RESOLVED: {
    category: 'production',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.MACHINE_STOPPAGE_RESOLVED.title',
    messageKey: 'notifications:events.MACHINE_STOPPAGE_RESOLVED.message',
    defaultRoute: '/(app)/operations/report-issue',
  },
  QC_INSPECTION_REQUESTED: {
    category: 'quality',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.QC_INSPECTION_REQUESTED.title',
    messageKey: 'notifications:events.QC_INSPECTION_REQUESTED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_INSPECTION_COMPLETED: {
    category: 'quality',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.QC_INSPECTION_COMPLETED.title',
    messageKey: 'notifications:events.QC_INSPECTION_COMPLETED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_PASSED: {
    category: 'quality',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.QC_PASSED.title',
    messageKey: 'notifications:events.QC_PASSED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_RELEASED: {
    category: 'quality',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.QC_RELEASED.title',
    messageKey: 'notifications:events.QC_RELEASED.message',
    defaultRoute: '/(app)/cartons/create',
  },
  QC_REWORK_REQUESTED: {
    category: 'quality',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.QC_REWORK_REQUESTED.title',
    messageKey: 'notifications:events.QC_REWORK_REQUESTED.message',
    defaultRoute: '/(app)/(tabs)/scan',
  },
  QC_REWORK_COMPLETED: {
    category: 'quality',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.QC_REWORK_COMPLETED.title',
    messageKey: 'notifications:events.QC_REWORK_COMPLETED.message',
    defaultRoute: '/(app)/inspections/reinspection',
  },
  QC_REINSPECTION_REQUESTED: {
    category: 'quality',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.QC_REINSPECTION_REQUESTED.title',
    messageKey: 'notifications:events.QC_REINSPECTION_REQUESTED.message',
    defaultRoute: '/(app)/inspections/reinspection',
  },
  QC_HOLD_CREATED: {
    category: 'quality',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.QC_HOLD_CREATED.title',
    messageKey: 'notifications:events.QC_HOLD_CREATED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_HOLD_RELEASED: {
    category: 'quality',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.QC_HOLD_RELEASED.title',
    messageKey: 'notifications:events.QC_HOLD_RELEASED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_REJECTED: {
    category: 'quality',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.QC_REJECTED.title',
    messageKey: 'notifications:events.QC_REJECTED.message',
    defaultRoute: '/(app)/inspections/[id]',
  },
  QC_DEFECT_THRESHOLD_EXCEEDED: {
    category: 'quality',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.QC_DEFECT_THRESHOLD_EXCEEDED.title',
    messageKey: 'notifications:events.QC_DEFECT_THRESHOLD_EXCEEDED.message',
    defaultRoute: '/(app)/md/bottlenecks',
  },
  STOCK_RECEIVED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.STOCK_RECEIVED.title',
    messageKey: 'notifications:events.STOCK_RECEIVED.message',
    defaultRoute: '/(app)/store/goods-receipt',
  },
  STOCK_ISSUED: {
    category: 'inventory',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.STOCK_ISSUED.title',
    messageKey: 'notifications:events.STOCK_ISSUED.message',
    defaultRoute: '/(app)/store/goods-receipt',
  },
  STOCK_TRANSFER_REQUESTED: {
    category: 'inventory',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.STOCK_TRANSFER_REQUESTED.title',
    messageKey: 'notifications:events.STOCK_TRANSFER_REQUESTED.message',
    defaultRoute: '/(app)/store/inter-factory-transfer',
  },
  STOCK_TRANSFER_APPROVED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.STOCK_TRANSFER_APPROVED.title',
    messageKey: 'notifications:events.STOCK_TRANSFER_APPROVED.message',
    defaultRoute: '/(app)/store/inter-factory-transfer',
  },
  STOCK_TRANSFER_RECEIVED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.STOCK_TRANSFER_RECEIVED.title',
    messageKey: 'notifications:events.STOCK_TRANSFER_RECEIVED.message',
    defaultRoute: '/(app)/store/inter-factory-transfer',
  },
  STOCK_TRANSFER_DISCREPANCY: {
    category: 'inventory',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.STOCK_TRANSFER_DISCREPANCY.title',
    messageKey: 'notifications:events.STOCK_TRANSFER_DISCREPANCY.message',
    defaultRoute: '/(app)/store/inter-factory-transfer',
  },
  STOCK_BELOW_MINIMUM: {
    category: 'inventory',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.STOCK_BELOW_MINIMUM.title',
    messageKey: 'notifications:events.STOCK_BELOW_MINIMUM.message',
    defaultRoute: '/(app)/store/goods-receipt',
  },
  STOCK_COUNT_DISCREPANCY: {
    category: 'inventory',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.STOCK_COUNT_DISCREPANCY.title',
    messageKey: 'notifications:events.STOCK_COUNT_DISCREPANCY.message',
    defaultRoute: '/(app)/store/stock-count',
  },
  STORE_HANDOVER_REQUESTED: {
    category: 'inventory',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.STORE_HANDOVER_REQUESTED.title',
    messageKey: 'notifications:events.STORE_HANDOVER_REQUESTED.message',
    defaultRoute: '/(app)/operations/output-in',
  },
  STORE_HANDOVER_COMPLETED: {
    category: 'inventory',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.STORE_HANDOVER_COMPLETED.title',
    messageKey: 'notifications:events.STORE_HANDOVER_COMPLETED.message',
    defaultRoute: '/(app)/operations/output-out',
  },
  PACKING_TASK_ASSIGNED: {
    category: 'packing_dispatch',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.PACKING_TASK_ASSIGNED.title',
    messageKey: 'notifications:events.PACKING_TASK_ASSIGNED.message',
    defaultRoute: '/(app)/cartons/create',
  },
  BUNDLE_READY_FOR_PACKING: {
    category: 'packing_dispatch',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.BUNDLE_READY_FOR_PACKING.title',
    messageKey: 'notifications:events.BUNDLE_READY_FOR_PACKING.message',
    defaultRoute: '/(app)/cartons/create',
  },
  PACKING_COMPLETED: {
    category: 'packing_dispatch',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.PACKING_COMPLETED.title',
    messageKey: 'notifications:events.PACKING_COMPLETED.message',
    defaultRoute: '/(app)/packing/history',
  },
  CARTON_CREATED: {
    category: 'packing_dispatch',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.CARTON_CREATED.title',
    messageKey: 'notifications:events.CARTON_CREATED.message',
    defaultRoute: '/(app)/store/dispatch',
  },
  CARTON_READY_FOR_HANDOVER: {
    category: 'packing_dispatch',
    priority: 'INFORMATION',
    actionRequired: true,
    titleKey: 'notifications:events.CARTON_READY_FOR_HANDOVER.title',
    messageKey: 'notifications:events.CARTON_READY_FOR_HANDOVER.message',
    defaultRoute: '/(app)/packing/handover',
  },
  DISPATCH_APPROVAL_REQUESTED: {
    category: 'packing_dispatch',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.DISPATCH_APPROVAL_REQUESTED.title',
    messageKey: 'notifications:events.DISPATCH_APPROVAL_REQUESTED.message',
    defaultRoute: '/(app)/store/dispatch',
  },
  DISPATCH_APPROVED: {
    category: 'packing_dispatch',
    priority: 'SUCCESS',
    actionRequired: true,
    titleKey: 'notifications:events.DISPATCH_APPROVED.title',
    messageKey: 'notifications:events.DISPATCH_APPROVED.message',
    defaultRoute: '/(app)/store/dispatch',
  },
  DISPATCH_REJECTED: {
    category: 'packing_dispatch',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.DISPATCH_REJECTED.title',
    messageKey: 'notifications:events.DISPATCH_REJECTED.message',
    defaultRoute: '/(app)/store/dispatch',
  },
  DISPATCH_COMPLETED: {
    category: 'packing_dispatch',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.DISPATCH_COMPLETED.title',
    messageKey: 'notifications:events.DISPATCH_COMPLETED.message',
    defaultRoute: '/(app)/store/dispatch',
  },
  BOTTLENECK_WARNING: {
    category: 'intelligence',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.BOTTLENECK_WARNING.title',
    messageKey: 'notifications:events.BOTTLENECK_WARNING.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 60,
  },
  BOTTLENECK_CRITICAL: {
    category: 'intelligence',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.BOTTLENECK_CRITICAL.title',
    messageKey: 'notifications:events.BOTTLENECK_CRITICAL.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 60,
  },
  BOTTLENECK_RESOLVED: {
    category: 'intelligence',
    priority: 'SUCCESS',
    actionRequired: false,
    titleKey: 'notifications:events.BOTTLENECK_RESOLVED.title',
    messageKey: 'notifications:events.BOTTLENECK_RESOLVED.message',
    defaultRoute: '/(app)/md/bottlenecks',
  },
  REWORK_THRESHOLD_EXCEEDED: {
    category: 'intelligence',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.REWORK_THRESHOLD_EXCEEDED.title',
    messageKey: 'notifications:events.REWORK_THRESHOLD_EXCEEDED.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 60,
  },
  QUEUE_DELAY_DETECTED: {
    category: 'intelligence',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.QUEUE_DELAY_DETECTED.title',
    messageKey: 'notifications:events.QUEUE_DELAY_DETECTED.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 60,
  },
  DELIVERY_DELAY_RISK: {
    category: 'intelligence',
    priority: 'CRITICAL',
    actionRequired: true,
    titleKey: 'notifications:events.DELIVERY_DELAY_RISK.title',
    messageKey: 'notifications:events.DELIVERY_DELAY_RISK.message',
    defaultRoute: '/(app)/md/bottlenecks',
    groupWindowMinutes: 120,
  },
  PRODUCTION_EFFICIENCY_DROP: {
    category: 'intelligence',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.PRODUCTION_EFFICIENCY_DROP.title',
    messageKey: 'notifications:events.PRODUCTION_EFFICIENCY_DROP.message',
    defaultRoute: '/(app)/md/sam-efficiency',
    groupWindowMinutes: 60,
  },
  USER_ASSIGNED_TO_LINE: {
    category: 'admin',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.USER_ASSIGNED_TO_LINE.title',
    messageKey: 'notifications:events.USER_ASSIGNED_TO_LINE.message',
    defaultRoute: '/(app)/(tabs)/work',
  },
  USER_ASSIGNED_TO_FACTORY: {
    category: 'admin',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.USER_ASSIGNED_TO_FACTORY.title',
    messageKey: 'notifications:events.USER_ASSIGNED_TO_FACTORY.message',
    defaultRoute: '/(app)/(tabs)',
  },
  SHIFT_ASSIGNMENT_UPDATED: {
    category: 'admin',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.SHIFT_ASSIGNMENT_UPDATED.title',
    messageKey: 'notifications:events.SHIFT_ASSIGNMENT_UPDATED.message',
    defaultRoute: '/(app)/(tabs)',
  },
  APPROVAL_PENDING: {
    category: 'admin',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.APPROVAL_PENDING.title',
    messageKey: 'notifications:events.APPROVAL_PENDING.message',
    defaultRoute: '/(app)/management/users',
  },
  TASK_OVERDUE: {
    category: 'admin',
    priority: 'WARNING',
    actionRequired: true,
    titleKey: 'notifications:events.TASK_OVERDUE.title',
    messageKey: 'notifications:events.TASK_OVERDUE.message',
    defaultRoute: '/(app)/(tabs)/work',
  },
  SYSTEM_ANNOUNCEMENT: {
    category: 'admin',
    priority: 'INFORMATION',
    actionRequired: false,
    titleKey: 'notifications:events.SYSTEM_ANNOUNCEMENT.title',
    messageKey: 'notifications:events.SYSTEM_ANNOUNCEMENT.message',
    defaultRoute: '/(app)/notifications',
  },
};

export function mapAuditActionToEventType(
  action: string,
  newValues?: Record<string, unknown> | null,
): NotificationEventType | null {
  switch (action) {
    case 'JOB_CREATED':
      return 'JOB_APPROVAL_REQUESTED';
    case 'JOB_APPROVAL_DECIDED':
      return newValues?.decision === 'rejected' ? 'JOB_REJECTED' : 'JOB_APPROVED';
    case 'JOB_ROUTE_CONFIGURED':
      return 'JOB_ROUTE_CONFIGURED';
    case 'JOB_CLOSED':
      return 'JOB_CLOSED';
    case 'JOB_STATUS_CHANGED':
      return newValues?.status === 'completed' ? 'JOB_COMPLETED' : 'JOB_UPDATED';
    case 'CUTTING_OUTPUT_RECORDED':
      return 'CUTTING_COMPLETED';
    case 'CUT_STOCK_HANDOVER_SENT':
      return newValues?.direction === 'output-out' ? 'OUTPUT_OUT_COMPLETED' : 'STORE_HANDOVER_REQUESTED';
    case 'CUT_STOCK_HANDOVER_DECIDED':
      return newValues?.status === 'disputed' ? 'STOCK_COUNT_DISCREPANCY' : 'STORE_HANDOVER_COMPLETED';
    case 'STAGE_COMPLETED':
      return 'PRODUCTION_STAGE_COMPLETED';
    case 'PRODUCTION_ISSUE_REPORTED':
      return 'MACHINE_STOPPAGE_REPORTED';
    case 'PRODUCTION_ISSUE_RESOLVED':
      return 'MACHINE_STOPPAGE_RESOLVED';
    case 'WORK_ASSIGNMENT_CREATED':
      return 'PRODUCTION_TASK_ASSIGNED';
    case 'QUALITY_INSPECTION':
      if (Number(newValues?.rework ?? 0) > 0) return 'QC_REWORK_REQUESTED';
      if (Number(newValues?.rejected ?? 0) > 0) return 'QC_REJECTED';
      if (Number(newValues?.held ?? 0) > 0) return 'QC_HOLD_CREATED';
      return 'QC_PASSED';
    case 'QUALITY_REWORK':
      return 'QC_REWORK_COMPLETED';
    case 'QUALITY_REINSPECTION':
      return 'QC_INSPECTION_COMPLETED';
    case 'QUALITY_RELEASE':
      return 'BUNDLE_READY_FOR_PACKING';
    case 'CARTON_PACKED':
      return 'CARTON_CREATED';
    case 'CARTON_RECEIVED_BY_STORE':
      return 'CARTON_READY_FOR_HANDOVER';
    case 'CARTON_DISPATCH_APPROVED':
    case 'SHIPMENT_MANIFEST_APPROVED':
      return 'DISPATCH_APPROVED';
    case 'CARTON_DISPATCHED':
    case 'SHIPMENT_MANIFEST_EXECUTED':
      return 'DISPATCH_COMPLETED';
    case 'SHIPMENT_MANIFEST_CREATED':
      return 'DISPATCH_APPROVAL_REQUESTED';
    case 'RAW_RECEIPT_POSTED':
      return 'STOCK_RECEIVED';
    case 'RAW_ISSUE_POSTED':
      return 'STOCK_ISSUED';
    case 'RAW_TRANSFER_CREATED':
      return 'STOCK_TRANSFER_REQUESTED';
    case 'RAW_TRANSFER_RECEIVED':
      return 'STOCK_TRANSFER_RECEIVED';
    case 'RAW_TRANSFER_DISCREPANCY':
      return 'STOCK_TRANSFER_DISCREPANCY';
    case 'RAW_STOCK_COUNT_APPROVED':
      return 'STOCK_COUNT_DISCREPANCY';
    case 'USER_REGISTERED':
      return 'APPROVAL_PENDING';
    case 'USER_APPROVED':
      return 'USER_ASSIGNED_TO_FACTORY';
    default:
      return null;
  }
}
