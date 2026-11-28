import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobReadScope, jobScopeParams } from '../jobs/jobs.service';

export interface WipAgingThreshold {
  stageCode: string;
  warningHours: number;
  criticalHours: number;
}

export const DEFAULT_WIP_THRESHOLDS: Record<string, { warningHours: number; criticalHours: number }> = {
  cutting: { warningHours: 4, criticalHours: 12 },
  'sewing-out': { warningHours: 8, criticalHours: 24 },
  'kaja-button': { warningHours: 6, criticalHours: 16 },
  ironing: { warningHours: 6, criticalHours: 16 },
  quality: { warningHours: 4, criticalHours: 12 },
  packing: { warningHours: 8, criticalHours: 24 },
};

export function classifyWipAgeBand(waitingHours: number): '<4h' | '4-12h' | '12-24h' | '>24h' {
  if (waitingHours < 4) return '<4h';
  if (waitingHours < 12) return '4-12h';
  if (waitingHours <= 24) return '12-24h';
  return '>24h';
}

export function evaluateWipThreshold(
  stageCode: string,
  waitingHours: number,
  overrides?: Record<string, { warningHours: number; criticalHours: number }>,
): { severity: 'normal' | 'warning' | 'critical'; warningHours: number; criticalHours: number } {
  const key = stageCode.toLowerCase();
  const cfg = overrides?.[key] ?? DEFAULT_WIP_THRESHOLDS[key] ?? { warningHours: 8, criticalHours: 24 };
  const severity = waitingHours >= cfg.criticalHours ? 'critical' : waitingHours >= cfg.warningHours ? 'warning' : 'normal';
  return { severity, warningHours: cfg.warningHours, criticalHours: cfg.criticalHours };
}

export interface PriorityScoreInput {
  isOverdue: boolean;
  daysToTarget: number | null;
  waitingHours: number;
  reworkPending: number;
  hasBlockedDownstream: boolean;
}

export function computeTaskPriority(input: PriorityScoreInput): { score: number; level: 'critical' | 'high' | 'normal'; reasons: string[] } {
  let score = 10;
  const reasons: string[] = [];
  if (input.isOverdue) {
    score += 40;
    reasons.push('deadline_overdue');
  } else if (input.daysToTarget !== null && input.daysToTarget <= 2) {
    score += 25;
    reasons.push('deadline_imminent');
  }
  if (input.waitingHours >= 24) {
    score += 25;
    reasons.push('wip_aging_critical');
  } else if (input.waitingHours >= 8) {
    score += 12;
    reasons.push('wip_aging_warning');
  }
  if (input.reworkPending > 0) {
    score += 20;
    reasons.push('rework_urgency');
  }
  if (input.hasBlockedDownstream) {
    score += 15;
    reasons.push('downstream_blocked');
  }
  const level = score >= 60 ? 'critical' : score >= 35 ? 'high' : 'normal';
  return { score, level, reasons };
}

export interface OperationalException {
  id: string;
  dedupKey: string;
  type:
    | 'unreceived_handover'
    | 'quantity_discrepancy'
    | 'machine_stoppage'
    | 'wip_aging'
    | 'excessive_rework'
    | 'excessive_rejection'
    | 'deadline_risk';
  severity: 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved';
  factoryId: string;
  jobCode?: string | null;
  bundleCode?: string | null;
  lineName?: string | null;
  affectedQuantity: number;
  detectedAt: string;
  rootCause: string;
  recommendedAction: string;
}

export function deduplicateExceptions(items: OperationalException[]): OperationalException[] {
  const seen = new Map<string, OperationalException>();
  for (const item of items) {
    const existing = seen.get(item.dedupKey);
    if (!existing || (item.severity === 'critical' && existing.severity !== 'critical')) {
      seen.set(item.dedupKey, item);
    }
  }
  return Array.from(seen.values());
}

export class ShiftHandoverAckInput {
  @IsString() @MaxLength(80) shiftLabel!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

@Injectable()
export class WorkflowIntelligenceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async getGarmentPassport(user: AuthenticatedUser, bundleId: string, limit = 30, offset = 0) {
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const { rows: [bundle] } = await this.db.query<Record<string, unknown>>(
      `SELECT b.id, b.barcode AS "barcodeValue", j.id AS "jobId", j.job_code AS "jobCode",
              j.status AS "jobStatus", b.size, b.color, b.quantity AS "originalQuantity",
              bu.name AS "buyerName", s.name AS "styleName", f.id AS "factoryId", f.name AS "factoryName",
              u.name AS "unitName", l.name AS "lineName",
              COALESCE(qb.inspected, 0) AS inspected, COALESCE(qb.passed, 0) AS passed,
              COALESCE(qb.rework, 0) AS rework, COALESCE(qb.rejected, 0) AS rejected,
              COALESCE(qb.reworked, 0) AS reworked, COALESCE(qb.released, 0) AS released,
              COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c WHERE c.bundle_id = b.id), 0)::int AS packed,
              COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c
                        JOIN public.carton_dispatch d ON d.carton_id = c.id
                        WHERE c.bundle_id = b.id AND d.dispatched_at IS NOT NULL), 0)::int AS dispatched,
              (SELECT jrs.stage_code FROM public.job_route_steps jrs
               JOIN public.bundle_route_progress brp ON brp.step_id = jrs.id AND brp.bundle_id = b.id
               WHERE jrs.job_id = j.id AND brp.completed_at IS NOT NULL
               ORDER BY jrs.ordinal DESC LIMIT 1) AS "previousOperation",
              (SELECT jrs.stage_code FROM public.job_route_steps jrs
               JOIN public.bundle_route_progress brp ON brp.step_id = jrs.id AND brp.bundle_id = b.id
               WHERE jrs.job_id = j.id AND brp.completed_at IS NULL AND brp.available > 0
               ORDER BY jrs.ordinal ASC LIMIT 1) AS "nextEligibleOperation"
       FROM public.bundles b
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.buyers bu ON bu.id = j.buyer_id
       LEFT JOIN public.garment_styles s ON s.id = j.style_id
       LEFT JOIN public.production_lines l ON l.id = j.line_id
       LEFT JOIN public.departments d ON d.id = l.department_id
       LEFT JOIN public.units u ON u.id = d.unit_id
       LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
       WHERE ${jobReadScope} AND b.id = $4`,
      [...jobScopeParams(user), bundleId],
    );
    if (!bundle) throw new NotFoundException('Bundle not found');

    const { rows: timeline } = await this.db.query<Record<string, unknown>>(
      `SELECT id, action AS operation, entity_type AS "entityType", actor_name AS "actorName",
              actor_role AS "actorRole", new_values AS details, reason, result, created_at AS "timestamp"
       FROM public.audit_logs
       WHERE organization_id = $1
         AND (entity_id = $2 OR new_values->>'bundleId' = $2 OR entity_id = $3)
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [user.organizationId, bundleId, String(bundle.jobId), safeLimit, safeOffset],
    );

    const originalQty = Number(bundle.originalQuantity ?? 0);
    const rejectedQty = Number(bundle.rejected ?? 0);
    const currentAvailableQuantity = Math.max(0, originalQty - rejectedQty);

    return {
      passport: {
        ...bundle,
        currentAvailableQuantity,
        qcStatus:
          Number(bundle.released ?? 0) > 0
            ? 'released'
            : Number(bundle.rework ?? 0) > 0
              ? 'rework'
              : Number(bundle.inspected ?? 0) > 0
                ? 'inspected'
                : 'pending',
        packingStatus: Number(bundle.packed ?? 0) > 0 ? 'packed' : 'pending',
        dispatchStatus: Number(bundle.dispatched ?? 0) > 0 ? 'dispatched' : 'pending',
      },
      timeline,
      pagination: { limit: safeLimit, offset: safeOffset, hasMore: timeline.length === safeLimit },
    };
  }

  async getTaskInbox(user: AuthenticatedUser, factoryId?: string) {
    const targetFactory = factoryId ?? user.primaryFactoryId ?? user.assignedFactoryIds[0] ?? null;
    if (!targetFactory) return { tasks: [], total: 0 };

    const { rows: routeTasks } = await this.db.query<{
      bundleId: string;
      bundleCode: string;
      jobId: string;
      jobCode: string;
      targetDate: string | null;
      lineName: string | null;
      stepId: string;
      stageCode: string;
      available: number;
      completed: number;
      eligibleSince: string;
      reworkPending: number;
    }>(
      `SELECT b.id AS "bundleId", b.barcode AS "bundleCode", j.id AS "jobId", j.job_code AS "jobCode",
              j.target_date::text AS "targetDate", l.name AS "lineName",
              s.id AS "stepId", s.stage_code AS "stageCode",
              p.available, p.completed, b.created_at::text AS "eligibleSince",
              COALESCE(qb.rework - qb.reworked, 0)::int AS "reworkPending"
       FROM public.bundles b
       JOIN public.jobs j ON j.id = b.job_id AND j.status = 'active'
       JOIN public.factories f ON f.id = j.factory_id
       JOIN public.job_route_steps s ON s.job_id = j.id
       JOIN public.bundle_route_progress p ON p.bundle_id = b.id AND p.step_id = s.id
       LEFT JOIN public.production_lines l ON l.id = s.line_id
       LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
       WHERE ${factoryScope} AND f.id = $4 AND p.available > 0 AND p.completed_at IS NULL
         AND (
           $5::boolean
           OR EXISTS (
             SELECT 1 FROM public.job_step_assignments w
             JOIN public.user_assignments a ON a.id = w.assignment_id AND a.is_active
             WHERE w.step_id = s.id AND a.profile_id = $3 AND s.role_code = $6
           )
         )
       ORDER BY j.target_date ASC NULLS LAST, b.created_at ASC
       LIMIT 100`,
      [
        ...jobScopeParams(user),
        targetFactory,
        ['md', 'factory-manager', 'supervisor'].includes(user.role),
        user.role,
      ],
    );

    const nowMs = Date.now();
    const tasks = routeTasks.map((row) => {
      const waitingHours = Math.max(0, (nowMs - Date.parse(row.eligibleSince)) / 3_600_000);
      const daysToTarget = row.targetDate ? Math.ceil((Date.parse(row.targetDate) - nowMs) / 86_400_000) : null;
      const priority = computeTaskPriority({
        isOverdue: daysToTarget !== null && daysToTarget < 0,
        daysToTarget,
        waitingHours,
        reworkPending: row.reworkPending,
        hasBlockedDownstream: false,
      });
      return {
        id: `${row.bundleId}:${row.stepId}`,
        category: row.reworkPending > 0 ? 'rework_required' : 'ready_for_operation',
        bundleId: row.bundleId,
        bundleCode: row.bundleCode,
        jobId: row.jobId,
        jobCode: row.jobCode,
        operation: row.stageCode,
        availableQuantity: Number(row.available),
        waitingHours: Number(waitingHours.toFixed(1)),
        location: row.lineName ?? 'Assigned Line',
        priority: priority.level,
        priorityScore: priority.score,
        priorityReasons: priority.reasons,
        actionRoute: '/(app)/(tabs)/scan',
      };
    });

    tasks.sort((a, b) => b.priorityScore - a.priorityScore);
    return { tasks, total: tasks.length };
  }

  async getWipAging(user: AuthenticatedUser, factoryId: string) {
    const { rows } = await this.db.query<{
      bundleId: string;
      bundleCode: string;
      jobCode: string;
      stageCode: string;
      lineName: string | null;
      available: number;
      sinceAt: string;
    }>(
      `SELECT b.id AS "bundleId", b.barcode AS "bundleCode", j.job_code AS "jobCode",
              s.stage_code AS "stageCode", l.name AS "lineName",
              p.available, b.created_at::text AS "sinceAt"
       FROM public.bundle_route_progress p
       JOIN public.bundles b ON b.id = p.bundle_id
       JOIN public.jobs j ON j.id = b.job_id AND j.status = 'active'
       JOIN public.factories f ON f.id = j.factory_id
       JOIN public.job_route_steps s ON s.id = p.step_id
       LEFT JOIN public.production_lines l ON l.id = s.line_id
       WHERE ${factoryScope} AND f.id = $4 AND p.available > 0 AND p.completed_at IS NULL
       ORDER BY b.created_at ASC
       LIMIT 200`,
      [...jobScopeParams(user), factoryId],
    );

    const nowMs = Date.now();
    const ageBands: Record<'<4h' | '4-12h' | '12-24h' | '>24h', number> = {
      '<4h': 0,
      '4-12h': 0,
      '12-24h': 0,
      '>24h': 0,
    };

    const items = rows.map((row) => {
      const waitingHours = Math.max(0, (nowMs - Date.parse(row.sinceAt)) / 3_600_000);
      const band = classifyWipAgeBand(waitingHours);
      const qty = Number(row.available ?? 0);
      ageBands[band] += qty;
      const threshold = evaluateWipThreshold(row.stageCode, waitingHours);
      return {
        ...row,
        available: qty,
        waitingHours: Number(waitingHours.toFixed(1)),
        ageBand: band,
        ...threshold,
      };
    });

    return {
      factoryId,
      totalWipPieces: items.reduce((s, i) => s + i.available, 0),
      ageBands,
      warningCount: items.filter((i) => i.severity === 'warning').length,
      criticalCount: items.filter((i) => i.severity === 'critical').length,
      items,
    };
  }

  async getExceptions(user: AuthenticatedUser, factoryId: string) {
    const exceptions: OperationalException[] = [];

    // 1. Handover discrepancies & unreceived handovers
    const { rows: handovers } = await this.db.query<{
      id: string;
      bundleCode: string;
      quantity: number;
      receivedQuantity: number | null;
      status: string;
      createdAt: string;
      reason: string | null;
    }>(
      `SELECT h.id, b.barcode AS "bundleCode", h.quantity, h.received_quantity AS "receivedQuantity",
              h.status, h.created_at::text AS "createdAt", h.decision_reason AS reason
       FROM public.cut_stock_handovers h
       JOIN public.bundles b ON b.id = h.bundle_id
       JOIN public.storage_locations s ON s.id = h.location_id
       JOIN public.factories f ON f.id = s.factory_id
       LEFT JOIN public.cut_stock_discrepancy_returns d ON d.handover_id = h.id
       WHERE ${factoryScope} AND f.id = $4 AND (h.status = 'pending' OR (h.status = 'rejected' AND d.approved_at IS NULL))
       LIMIT 100`,
      [...jobScopeParams(user), factoryId],
    );

    for (const h of handovers) {
      const diff = h.receivedQuantity !== null ? Math.max(0, h.quantity - h.receivedQuantity) : h.quantity;
      exceptions.push({
        id: h.id,
        dedupKey: `handover:${h.id}`,
        type: h.status === 'rejected' ? 'quantity_discrepancy' : 'unreceived_handover',
        severity: h.status === 'rejected' ? 'critical' : 'warning',
        status: 'open',
        factoryId,
        bundleCode: h.bundleCode,
        affectedQuantity: diff,
        detectedAt: h.createdAt,
        rootCause: h.reason ?? (h.status === 'rejected' ? 'Handover quantity mismatch' : 'Pending physical receipt'),
        recommendedAction: h.status === 'rejected' ? 'Verify and approve discrepancy return' : 'Confirm physical store receipt',
      });
    }

    // 2. Open machine stoppages
    const { rows: issues } = await this.db.query<{
      id: string;
      title: string;
      severity: string;
      lineName: string | null;
      createdAt: string;
    }>(
      `SELECT i.id, i.title, i.severity, l.name AS "lineName", i.created_at::text AS "createdAt"
       FROM public.production_issues i
       JOIN public.factories f ON f.id = i.factory_id
       LEFT JOIN public.production_lines l ON l.id = i.line_id
       WHERE ${factoryScope} AND f.id = $4 AND i.status != 'resolved'
       LIMIT 100`,
      [...jobScopeParams(user), factoryId],
    );
    for (const issue of issues) {
      exceptions.push({
        id: issue.id,
        dedupKey: `issue:${issue.id}`,
        type: 'machine_stoppage',
        severity: issue.severity === 'critical' ? 'critical' : 'warning',
        status: 'open',
        factoryId,
        lineName: issue.lineName,
        affectedQuantity: 0,
        detectedAt: issue.createdAt,
        rootCause: issue.title,
        recommendedAction: 'Assign maintenance or supervisor resolution',
      });
    }

    // 3. WIP aging exceptions
    const aging = await this.getWipAging(user, factoryId);
    for (const item of aging.items) {
      if (item.severity !== 'normal') {
        exceptions.push({
          id: `wip:${item.bundleId}:${item.stageCode}`,
          dedupKey: `wip:${item.bundleId}:${item.stageCode}`,
          type: 'wip_aging',
          severity: item.severity,
          status: 'open',
          factoryId,
          jobCode: item.jobCode,
          bundleCode: item.bundleCode,
          lineName: item.lineName,
          affectedQuantity: item.available,
          detectedAt: item.sinceAt,
          rootCause: `Waiting ${item.waitingHours}h at ${item.stageCode} (threshold ${item.warningHours}h)`,
          recommendedAction: 'Prioritize bundle or rebalance line capacity',
        });
      }
    }

    const deduped = deduplicateExceptions(exceptions);
    return {
      factoryId,
      total: deduped.length,
      criticalCount: deduped.filter((e) => e.severity === 'critical').length,
      exceptions: deduped,
    };
  }

  async acknowledgeException(user: AuthenticatedUser, factoryId: string, exceptionId: string, notes?: string) {
    if (!['supervisor', 'factory-manager', 'md'].includes(user.role)) {
      throw new ForbiddenException('Only Supervisor, Factory Manager, or MD can acknowledge exceptions');
    }
    return this.db.withTransaction(async (client) => {
      await this.audit.record(
        {
          organizationId: user.organizationId,
          factoryId,
          actorId: user.id,
          actorEmployeeId: user.employeeId,
          actorName: user.name,
          actorRole: user.role,
          action: 'EXCEPTION_ACKNOWLEDGED',
          entityType: 'factory',
          entityId: factoryId,
          newValues: { exceptionId, notes: notes?.trim() ?? null },
        },
        client,
      );
      return { acknowledged: true, exceptionId, factoryId };
    });
  }

  async getShiftHandover(user: AuthenticatedUser, factoryId: string) {
    const [exceptions, wip] = await Promise.all([
      this.getExceptions(user, factoryId),
      this.getWipAging(user, factoryId),
    ]);
    const { rows: [summary] } = await this.db.query<{
      activeJobs: string;
      openRework: string;
      pendingInspections: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
          WHERE ${factoryScope} AND f.id = $4 AND j.status = 'active')::text AS "activeJobs",
         (SELECT COALESCE(SUM(qb.rework - qb.reworked), 0) FROM public.bundle_quality_balances qb
          JOIN public.bundles b ON b.id = qb.bundle_id JOIN public.jobs j ON j.id = b.job_id
          JOIN public.factories f ON f.id = j.factory_id WHERE ${factoryScope} AND f.id = $4)::text AS "openRework",
         (SELECT COALESCE(SUM(b.quantity - COALESCE(qb.inspected, 0)), 0) FROM public.bundles b
          JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
          LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
          WHERE ${factoryScope} AND f.id = $4 AND j.status = 'active')::text AS "pendingInspections"`,
      [...jobScopeParams(user), factoryId],
    );
    return {
      factoryId,
      activeJobs: Number(summary?.activeJobs ?? 0),
      pendingWipPieces: wip.totalWipPieces,
      openRework: Number(summary?.openRework ?? 0),
      pendingInspections: Number(summary?.pendingInspections ?? 0),
      openExceptions: exceptions.total,
      criticalExceptions: exceptions.criticalCount,
      generatedAt: new Date().toISOString(),
    };
  }

  async acknowledgeShiftHandover(user: AuthenticatedUser, factoryId: string, body: ShiftHandoverAckInput) {
    if (!['supervisor', 'factory-manager', 'operator', 'qc-inspector', 'store-dispatch', 'packing-staff'].includes(user.role)) {
      throw new ForbiddenException('Role cannot acknowledge shift handover');
    }
    if (!body.shiftLabel.trim()) throw new BadRequestException('Shift label is required');
    return this.db.withTransaction(async (client) => {
      await this.audit.record(
        {
          organizationId: user.organizationId,
          factoryId,
          actorId: user.id,
          actorEmployeeId: user.employeeId,
          actorName: user.name,
          actorRole: user.role,
          action: 'SHIFT_HANDOVER_ACKNOWLEDGED',
          entityType: 'factory',
          entityId: factoryId,
          newValues: { shiftLabel: body.shiftLabel.trim(), notes: body.notes?.trim() ?? null },
        },
        client,
      );
      return { acknowledged: true, factoryId, shiftLabel: body.shiftLabel.trim(), actorId: user.id };
    });
  }
}

@ApiTags('Workflow Intelligence')
@ApiBearerAuth()
@Controller()
export class WorkflowIntelligenceController {
  constructor(private readonly intel: WorkflowIntelligenceService) {}

  @Get('bundles/:id/passport')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  passport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.intel.getGarmentPassport(user, id, Number(limit ?? 30), Number(offset ?? 0));
  }

  @Get('workflow/task-inbox')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  taskInbox(@CurrentUser() user: AuthenticatedUser, @Query('factoryId') factoryId?: string) {
    return this.intel.getTaskInbox(user, factoryId);
  }

  @Get('analytics/wip-aging')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  wipAging(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.intel.getWipAging(user, factoryId);
  }

  @Get('analytics/exceptions')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  exceptions(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.intel.getExceptions(user, factoryId);
  }

  @Post('analytics/exceptions/:id/acknowledge')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  acknowledgeException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('factoryId', ParseUUIDPipe) factoryId: string,
    @Body() body: { notes?: string },
  ) {
    return this.intel.acknowledgeException(user, factoryId, id, body?.notes);
  }

  @Get('workflow/shift-handover')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  shiftHandover(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.intel.getShiftHandover(user, factoryId);
  }

  @Post('workflow/shift-handover/acknowledge')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  acknowledgeShiftHandover(
    @CurrentUser() user: AuthenticatedUser,
    @Query('factoryId', ParseUUIDPipe) factoryId: string,
    @Body() body: ShiftHandoverAckInput,
  ) {
    return this.intel.acknowledgeShiftHandover(user, factoryId, body);
  }
}
