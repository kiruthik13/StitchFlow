import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { NotificationEventType } from './notification-catalog';

export interface OutboxEventRow {
  id: string;
  organization_id: string;
  factory_id: string | null;
  event_type: NotificationEventType;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  job_id: string | null;
  bundle_id: string | null;
  production_line_id: string | null;
  event_payload: Record<string, unknown>;
}

export interface ResolvedRecipient {
  userId: string;
  actionRoute?: string;
  actionParameters?: Record<string, unknown>;
  extraParams?: Record<string, unknown>;
}

@Injectable()
export class RecipientResolverService {
  private readonly logger = new Logger(RecipientResolverService.name);

  constructor(private readonly db: DatabaseService) {}

  async resolveRecipients(event: OutboxEventRow): Promise<ResolvedRecipient[]> {
    if (!this.db.isDatabaseConfigured()) return [];

    const recipients = new Map<string, ResolvedRecipient>();
    const add = (userId: string, override?: Omit<ResolvedRecipient, 'userId'>) => {
      if (!userId || userId === event.actor_user_id) return;
      if (!recipients.has(userId)) {
        recipients.set(userId, { userId, ...override });
      }
    };

    const orgId = event.organization_id;
    const factoryId = event.factory_id;

    switch (event.event_type) {
      case 'JOB_CREATED':
      case 'JOB_APPROVAL_REQUESTED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager'])) {
          add(uid, { actionRoute: '/(app)/approvals' });
        }
        break;
      }

      case 'JOB_APPROVED':
      case 'JOB_REJECTED':
      case 'JOB_ROUTE_CONFIGURED':
      case 'JOB_UPDATED':
      case 'JOB_COMPLETED':
      case 'JOB_CLOSED': {
        if (event.job_id) {
          for (const uid of await this.findRouteAssignees(event.job_id)) {
            add(uid, { actionRoute: '/(app)/jobs/[id]', actionParameters: { id: event.job_id } });
          }
        }
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor'], event.production_line_id)) {
          add(uid, { actionRoute: '/(app)/jobs/[id]', actionParameters: { id: event.job_id ?? event.entity_id } });
        }
        if (event.event_type === 'JOB_COMPLETED' || event.event_type === 'JOB_CLOSED') {
          for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager'])) {
            add(uid);
          }
        }
        break;
      }

      case 'CUTTING_COMPLETED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['store-dispatch'])) {
          add(uid, { actionRoute: '/(app)/operations/output-in' });
        }
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor'], event.production_line_id)) {
          add(uid);
        }
        break;
      }

      case 'STORE_HANDOVER_REQUESTED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['store-dispatch'])) {
          add(uid, { actionRoute: '/(app)/operations/output-in' });
        }
        break;
      }

      case 'OUTPUT_OUT_COMPLETED':
      case 'STORE_HANDOVER_COMPLETED': {
        if (event.job_id) {
          const firstStepUsers = await this.findFirstRouteStepAssignees(event.job_id);
          for (const uid of firstStepUsers) {
            add(uid, { actionRoute: '/(app)/(tabs)/scan' });
          }
        }
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor'], event.production_line_id)) {
          add(uid);
        }
        break;
      }

      case 'PRODUCTION_STAGE_COMPLETED':
      case 'SEWING_OUT_COMPLETED':
      case 'KAJA_BUTTON_COMPLETED':
      case 'IRONING_COMPLETED':
      case 'BUNDLE_READY_FOR_NEXT_STAGE': {
        if (event.job_id && event.bundle_id) {
          const next = await this.findNextEligibleStageOrQc(event.job_id, event.bundle_id, event.event_payload);
          if (next.isTerminalQcReady) {
            const qcUsers = await this.findDutyUsers(event.job_id, 'qc', orgId, factoryId, 'qc-inspector');
            for (const uid of qcUsers) {
              add(uid, { actionRoute: '/(app)/inspections/[id]', actionParameters: { id: event.bundle_id } });
            }
          } else {
            for (const uid of next.userIds) {
              add(uid, {
                actionRoute: '/(app)/(tabs)/scan',
                extraParams: { stageCode: next.stageCode ?? 'Next Stage' },
              });
            }
          }
        }
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor'], event.production_line_id)) {
          add(uid);
        }
        break;
      }

      case 'PRODUCTION_TASK_ASSIGNED': {
        const assigneeId = typeof event.event_payload.assigneeUserId === 'string' ? event.event_payload.assigneeUserId : null;
        if (assigneeId) add(assigneeId, { actionRoute: '/(app)/(tabs)/work' });
        break;
      }

      case 'MACHINE_STOPPAGE_REPORTED':
      case 'MACHINE_STOPPAGE_RESOLVED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor', 'factory-manager'], event.production_line_id)) {
          add(uid, { actionRoute: '/(app)/operations/report-issue' });
        }
        break;
      }

      case 'QC_INSPECTION_REQUESTED': {
        const qcUsers = event.job_id
          ? await this.findDutyUsers(event.job_id, 'qc', orgId, factoryId, 'qc-inspector')
          : await this.findActiveByRole(orgId, factoryId, ['qc-inspector']);
        for (const uid of qcUsers) {
          add(uid, { actionRoute: '/(app)/inspections/[id]', actionParameters: { id: event.bundle_id ?? event.entity_id } });
        }
        break;
      }

      case 'QC_REWORK_REQUESTED': {
        const reworkUsers = event.job_id
          ? await this.findDutyUsers(event.job_id, 'rework', orgId, factoryId, 'operator')
          : await this.findActiveByRole(orgId, factoryId, ['operator'], event.production_line_id);
        for (const uid of reworkUsers) {
          add(uid, { actionRoute: '/(app)/(tabs)/scan' });
        }
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor'], event.production_line_id)) {
          add(uid);
        }
        break;
      }

      case 'QC_REWORK_COMPLETED':
      case 'QC_REINSPECTION_REQUESTED': {
        const qcUsers = event.job_id
          ? await this.findDutyUsers(event.job_id, 'qc', orgId, factoryId, 'qc-inspector')
          : await this.findActiveByRole(orgId, factoryId, ['qc-inspector']);
        for (const uid of qcUsers) {
          add(uid, { actionRoute: '/(app)/inspections/reinspection' });
        }
        break;
      }

      case 'QC_HOLD_CREATED':
      case 'QC_REJECTED':
      case 'QC_DEFECT_THRESHOLD_EXCEEDED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor', 'factory-manager'])) {
          add(uid, { actionRoute: '/(app)/inspections/[id]', actionParameters: { id: event.bundle_id ?? event.entity_id } });
        }
        if (event.event_type === 'QC_REJECTED' || event.event_type === 'QC_DEFECT_THRESHOLD_EXCEEDED') {
          for (const uid of await this.findActiveByRole(orgId, null, ['md'])) {
            add(uid, { actionRoute: '/(app)/md/bottlenecks' });
          }
        }
        break;
      }

      case 'QC_RELEASED':
      case 'BUNDLE_READY_FOR_PACKING': {
        const packingUsers = event.job_id
          ? await this.findDutyUsers(event.job_id, 'packing', orgId, factoryId, 'packing-staff')
          : await this.findActiveByRole(orgId, factoryId, ['packing-staff']);
        for (const uid of packingUsers) {
          add(uid, { actionRoute: '/(app)/cartons/create' });
        }
        break;
      }

      case 'CARTON_CREATED':
      case 'CARTON_READY_FOR_HANDOVER': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['store-dispatch'])) {
          add(uid, { actionRoute: '/(app)/store/dispatch' });
        }
        break;
      }

      case 'DISPATCH_APPROVAL_REQUESTED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager'])) {
          add(uid, { actionRoute: '/(app)/store/dispatch' });
        }
        break;
      }

      case 'DISPATCH_APPROVED':
      case 'DISPATCH_REJECTED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['store-dispatch'])) {
          add(uid, { actionRoute: '/(app)/store/dispatch' });
        }
        break;
      }

      case 'DISPATCH_COMPLETED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager'])) {
          add(uid, { actionRoute: '/(app)/store/dispatch' });
        }
        for (const uid of await this.findActiveByRole(orgId, null, ['md'])) {
          add(uid, { actionRoute: '/(app)/(tabs)/reports' });
        }
        break;
      }

      case 'STOCK_TRANSFER_REQUESTED':
      case 'STOCK_TRANSFER_DISCREPANCY': {
        const destFactory = typeof event.event_payload.destinationFactoryId === 'string'
          ? event.event_payload.destinationFactoryId
          : factoryId;
        for (const uid of await this.findActiveByRole(orgId, destFactory, ['store-dispatch', 'factory-manager'])) {
          add(uid, { actionRoute: '/(app)/store/inter-factory-transfer' });
        }
        break;
      }

      case 'STOCK_RECEIVED':
      case 'STOCK_ISSUED':
      case 'STOCK_TRANSFER_RECEIVED':
      case 'STOCK_COUNT_DISCREPANCY':
      case 'STOCK_BELOW_MINIMUM': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager', 'store-dispatch'])) {
          add(uid);
        }
        break;
      }

      case 'BOTTLENECK_WARNING':
      case 'QUEUE_DELAY_DETECTED':
      case 'PRODUCTION_EFFICIENCY_DROP': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor', 'factory-manager'], event.production_line_id)) {
          add(uid, { actionRoute: '/(app)/md/bottlenecks' });
        }
        break;
      }

      case 'BOTTLENECK_CRITICAL':
      case 'REWORK_THRESHOLD_EXCEEDED':
      case 'DELIVERY_DELAY_RISK':
      case 'JOB_DELIVERY_RISK': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor', 'factory-manager'], event.production_line_id)) {
          add(uid, { actionRoute: '/(app)/md/bottlenecks' });
        }
        for (const uid of await this.findActiveByRole(orgId, null, ['md'])) {
          add(uid, { actionRoute: '/(app)/md/bottlenecks' });
        }
        break;
      }

      case 'BOTTLENECK_RESOLVED': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['supervisor', 'factory-manager'])) {
          add(uid, { actionRoute: '/(app)/md/bottlenecks' });
        }
        break;
      }

      case 'APPROVAL_PENDING': {
        for (const uid of await this.findActiveByRole(orgId, factoryId, ['factory-manager'])) {
          add(uid, { actionRoute: '/(app)/management/users' });
        }
        break;
      }

      case 'USER_ASSIGNED_TO_FACTORY':
      case 'USER_ASSIGNED_TO_LINE':
      case 'SHIFT_ASSIGNMENT_UPDATED': {
        if (event.entity_id) {
          add(event.entity_id, { actionRoute: '/(app)/(tabs)' });
        }
        break;
      }

      default:
        break;
    }

    if (recipients.size === 0) {
      this.logger.debug(`No eligible recipients resolved for ${event.event_type} (${event.id})`);
    }
    return Array.from(recipients.values());
  }

  private async findActiveByRole(
    organizationId: string,
    factoryId: string | null,
    roles: string[],
    lineId?: string | null,
  ): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT DISTINCT p.id
       FROM public.profiles p
       LEFT JOIN public.user_assignments ua ON ua.profile_id = p.id AND ua.is_active = true
       WHERE p.organization_id = $1
         AND p.account_status = 'active'
         AND p.role_code = ANY($2::text[])
         AND ($3::uuid IS NULL OR p.role_code = 'md' OR ua.factory_id = $3)
         AND ($4::uuid IS NULL OR ua.line_id IS NULL OR ua.line_id = $4)`,
      [organizationId, roles, factoryId, lineId ?? null],
    );
    return rows.map((r) => r.id);
  }

  private async findRouteAssignees(jobId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ profile_id: string }>(
      `SELECT DISTINCT ua.profile_id
       FROM public.job_route_steps s
       JOIN public.user_assignments ua ON ua.id = ANY(s.assignment_ids) AND ua.is_active = true
       JOIN public.profiles p ON p.id = ua.profile_id AND p.account_status = 'active'
       WHERE s.job_id = $1`,
      [jobId],
    );
    return rows.map((r) => r.profile_id);
  }

  private async findFirstRouteStepAssignees(jobId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ profile_id: string }>(
      `SELECT DISTINCT ua.profile_id
       FROM public.job_route_steps s
       JOIN public.user_assignments ua ON ua.id = ANY(s.assignment_ids) AND ua.is_active = true
       JOIN public.profiles p ON p.id = ua.profile_id AND p.account_status = 'active'
       WHERE s.job_id = $1
       ORDER BY s.ordinal ASC
       LIMIT 20`,
      [jobId],
    );
    return rows.map((r) => r.profile_id);
  }

  private async findDutyUsers(
    jobId: string,
    duty: 'qc' | 'rework' | 'packing',
    organizationId: string,
    factoryId: string | null,
    fallbackRole: string,
  ): Promise<string[]> {
    const { rows } = await this.db.query<{ profile_id: string }>(
      `SELECT DISTINCT ua.profile_id
       FROM public.job_role_duties d
       JOIN public.user_assignments ua ON ua.id = d.assignment_id AND ua.is_active = true
       JOIN public.profiles p ON p.id = ua.profile_id AND p.account_status = 'active'
       WHERE d.job_id = $1 AND d.duty = $2`,
      [jobId, duty],
    );
    if (rows.length > 0) return rows.map((r) => r.profile_id);
    return this.findActiveByRole(organizationId, factoryId, [fallbackRole]);
  }

  private async findNextEligibleStageOrQc(
    jobId: string,
    bundleId: string,
    payload: Record<string, unknown>,
  ): Promise<{ isTerminalQcReady: boolean; stageCode: string | null; userIds: string[] }> {
    const currentStepId = typeof payload.stepId === 'string' ? payload.stepId : null;
    const { rows: steps } = await this.db.query<{
      id: string;
      ordinal: number;
      stage_code: string;
      assignment_ids: string[];
    }>(
      `SELECT id, ordinal, stage_code, assignment_ids
       FROM public.job_route_steps
       WHERE job_id = $1
       ORDER BY ordinal ASC`,
      [jobId],
    );
    if (steps.length === 0) {
      return { isTerminalQcReady: false, stageCode: null, userIds: [] };
    }
    const currentIndex = currentStepId ? steps.findIndex((s) => s.id === currentStepId) : -1;
    const nextStep = currentIndex >= 0 ? steps[currentIndex + 1] : undefined;

    if (!nextStep) {
      // Terminal stage reached — verify bundle has completed all route steps
      const { rows: incomplete } = await this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM public.job_route_steps s
         WHERE s.job_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM public.bundle_stage_events e
             WHERE e.bundle_id = $2 AND e.step_id = s.id
           )`,
        [jobId, bundleId],
      );
      if (Number(incomplete[0]?.count ?? 1) === 0) {
        return { isTerminalQcReady: true, stageCode: 'QC', userIds: [] };
      }
      return { isTerminalQcReady: false, stageCode: null, userIds: [] };
    }

    if (!nextStep.assignment_ids || nextStep.assignment_ids.length === 0) {
      return { isTerminalQcReady: false, stageCode: nextStep.stage_code, userIds: [] };
    }

    const { rows: assignees } = await this.db.query<{ profile_id: string }>(
      `SELECT DISTINCT ua.profile_id
       FROM public.user_assignments ua
       JOIN public.profiles p ON p.id = ua.profile_id AND p.account_status = 'active'
       WHERE ua.id = ANY($1::uuid[]) AND ua.is_active = true`,
      [nextStep.assignment_ids],
    );
    return {
      isTerminalQcReady: false,
      stageCode: nextStep.stage_code,
      userIds: assignees.map((a) => a.profile_id),
    };
  }
}
