import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { factoryScope, jobReadScope, jobScopeParams } from '../jobs/jobs.service';

export interface LineCapacityInput {
  lineId: string;
  lineName: string;
  presentOperators: number;
  shiftMinutes: number;
  efficiencyPercent: number;
  samPerGarment: number;
  pendingPieces: number;
  reworkPieces: number;
  stoppedMachines: number;
}

export function computeLineBalance(input: LineCapacityInput) {
  const effectiveOperators = Math.max(0, input.presentOperators - input.stoppedMachines);
  const productiveMinutes = effectiveOperators * Math.max(0, input.shiftMinutes);
  const sam = input.samPerGarment > 0 ? input.samPerGarment : null;
  const effFactor = Math.min(Math.max(input.efficiencyPercent, 1), 150) / 100;

  const theoreticalCapacity = sam ? productiveMinutes / sam : 0;
  const effectiveCapacity = theoreticalCapacity * effFactor;
  const requiredStdMinutes = sam ? (Math.max(0, input.pendingPieces) + Math.max(0, input.reworkPieces)) * sam : 0;
  const availableEffectiveMinutes = productiveMinutes * effFactor;
  const loadPercent =
    availableEffectiveMinutes > 0
      ? Number(((requiredStdMinutes / availableEffectiveMinutes) * 100).toFixed(1))
      : requiredStdMinutes > 0
        ? 999
        : 0;

  return {
    lineId: input.lineId,
    lineName: input.lineName,
    effectiveOperators,
    stoppedMachines: input.stoppedMachines,
    productiveMinutes,
    theoreticalCapacity: Math.floor(theoreticalCapacity),
    effectiveCapacity: Math.floor(effectiveCapacity),
    requiredStdMinutes: Number(requiredStdMinutes.toFixed(1)),
    loadPercent,
    status: loadPercent > 100 ? ('overloaded' as const) : loadPercent < 70 ? ('spare_capacity' as const) : ('balanced' as const),
  };
}

export interface ReworkCostInput {
  reworkPieces: number;
  reworkMinutesPerPiece: number | null;
  hourlyLabourRate: number | null;
  materialCost?: number | null;
  machineCost?: number | null;
  inspectionCost?: number | null;
  overheadCost?: number | null;
}

export function calculateReworkCost(input: ReworkCostInput) {
  if (input.reworkPieces <= 0) {
    return {
      reworkPieces: 0,
      labourHours: 0,
      labourCost: 0,
      totalCost: 0,
      dataQuality: 'actual' as const,
      labourOnly: false,
    };
  }
  if (input.reworkMinutesPerPiece === null || input.reworkMinutesPerPiece <= 0 || input.hourlyLabourRate === null || input.hourlyLabourRate <= 0) {
    return {
      reworkPieces: input.reworkPieces,
      labourHours: null,
      labourCost: null,
      totalCost: null,
      dataQuality: 'unavailable' as const,
      labourOnly: false,
    };
  }
  const labourHours = Number(((input.reworkPieces * input.reworkMinutesPerPiece) / 60).toFixed(2));
  const labourCost = Number(((input.reworkPieces * input.reworkMinutesPerPiece * input.hourlyLabourRate) / 60).toFixed(2));
  const extras = [input.materialCost, input.machineCost, input.inspectionCost, input.overheadCost];
  const hasAnyExtra = extras.some((v) => typeof v === 'number' && v > 0);
  const totalExtras = extras.reduce<number>((sum, v) => sum + (typeof v === 'number' && v > 0 ? v : 0), 0);
  return {
    reworkPieces: input.reworkPieces,
    labourHours,
    labourCost,
    totalCost: Number((labourCost + totalExtras).toFixed(2)),
    dataQuality: hasAnyExtra ? ('standard' as const) : ('incomplete' as const),
    labourOnly: !hasAnyExtra,
  };
}

export interface DefectMetricInput {
  inspectedUnits: number;
  firstPassAcceptedUnits: number;
  uniqueDefectivePieces: number;
  defectOccurrences: number;
}

export function computeDefectRates(input: DefectMetricInput) {
  const inspected = Math.max(0, input.inspectedUnits);
  if (inspected === 0) {
    return {
      inspectedUnits: 0,
      firstPassYieldPercent: null,
      dhu: null,
      defectivePiecePercent: null,
    };
  }
  return {
    inspectedUnits: inspected,
    firstPassYieldPercent: Number(((Math.max(0, input.firstPassAcceptedUnits) / inspected) * 100).toFixed(2)),
    dhu: Number(((Math.max(0, input.defectOccurrences) / inspected) * 100).toFixed(2)),
    defectivePiecePercent: Number(((Math.max(0, input.uniqueDefectivePieces) / inspected) * 100).toFixed(2)),
  };
}

export class LineBalanceSimInput {
  @IsUUID() factoryId!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(150) efficiencyOverride?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) samOverride?: number;
}

@Injectable()
export class Phase10IntelligenceService {
  constructor(private readonly db: DatabaseService) {}

  async getSkillMatrix(user: AuthenticatedUser, factoryId: string) {
    const { rows } = await this.db.query<{
      employeeId: string;
      profileId: string;
      name: string;
      role: string;
      lineName: string | null;
      departmentName: string | null;
      rankName: string | null;
      operation: string | null;
      skillLevel: string;
    }>(
      `SELECT p.employee_id AS "employeeId", p.id AS "profileId", p.name, p.role_code AS role,
              l.name AS "lineName", d.name AS "departmentName",
              r.name AS "rankName", tm.operation_name AS operation,
              COALESCE(r.name, 'Assisted') AS "skillLevel"
       FROM public.user_assignments ua
       JOIN public.profiles p ON p.id = ua.profile_id AND p.account_status = 'active'
       JOIN public.factories f ON f.id = ua.factory_id
       LEFT JOIN public.production_lines l ON l.id = ua.line_id
       LEFT JOIN public.departments d ON d.id = ua.department_id
       LEFT JOIN public.tailor_mappings tm ON tm.profile_id = p.id AND tm.is_active = true
       LEFT JOIN public.ranks r ON r.id = tm.rank_id
       WHERE ${factoryScope} AND f.id = $4 AND ua.is_active = true
       ORDER BY p.name ASC
       LIMIT 200`,
      [...jobScopeParams(user), factoryId],
    );
    return { factoryId, skills: rows, total: rows.length };
  }

  async getLineBalancing(user: AuthenticatedUser, factoryId: string, overrides?: { efficiencyOverride?: number; samOverride?: number }) {
    const { rows } = await this.db.query<{
      lineId: string;
      lineName: string;
      presentOperators: number;
      shiftMinutes: number;
      efficiencyPercent: number;
      samPerGarment: number;
      pendingPieces: string;
      reworkPieces: string;
      stoppedMachines: string;
    }>(
      `SELECT l.id AS "lineId", l.name AS "lineName",
              COALESCE(wp.present_operators, 10)::int AS "presentOperators",
              COALESCE(wp.shift_minutes, 480)::int AS "shiftMinutes",
              COALESCE(wp.efficiency_percent, 75)::float8 AS "efficiencyPercent",
              COALESCE((SELECT AVG(sp.total_sam)::float8 FROM public.sam_plans sp WHERE sp.factory_id = f.id), 12.0) AS "samPerGarment",
              COALESCE((SELECT SUM(brp.available) FROM public.bundle_route_progress brp
                        JOIN public.job_route_steps jrs ON jrs.id = brp.step_id
                        WHERE jrs.line_id = l.id AND brp.completed_at IS NULL), 0)::text AS "pendingPieces",
              COALESCE((SELECT SUM(qb.rework - qb.reworked) FROM public.bundle_quality_balances qb
                        JOIN public.bundles b ON b.id = qb.bundle_id
                        JOIN public.jobs j ON j.id = b.job_id WHERE j.line_id = l.id), 0)::text AS "reworkPieces",
              (SELECT COUNT(*) FROM public.production_issues pi
               WHERE pi.line_id = l.id AND pi.status != 'resolved')::text AS "stoppedMachines"
       FROM public.production_lines l
       JOIN public.factories f ON f.id = l.factory_id
       LEFT JOIN public.workforce_plans wp ON wp.line_id = l.id AND wp.factory_id = f.id
       WHERE ${factoryScope} AND f.id = $4 AND l.is_active = true
       ORDER BY l.name ASC`,
      [...jobScopeParams(user), factoryId],
    );

    const lines = rows.map((r) =>
      computeLineBalance({
        lineId: r.lineId,
        lineName: r.lineName,
        presentOperators: Number(r.presentOperators),
        shiftMinutes: Number(r.shiftMinutes),
        efficiencyPercent: overrides?.efficiencyOverride ?? Number(r.efficiencyPercent),
        samPerGarment: overrides?.samOverride ?? Number(r.samPerGarment),
        pendingPieces: Number(r.pendingPieces),
        reworkPieces: Number(r.reworkPieces),
        stoppedMachines: Number(r.stoppedMachines),
      }),
    );

    const overloaded = lines.filter((l) => l.status === 'overloaded');
    const spare = lines.filter((l) => l.status === 'spare_capacity');
    const recommendations = overloaded.map((o) => ({
      fromLineId: o.lineId,
      fromLineName: o.lineName,
      toLineId: spare[0]?.lineId ?? null,
      toLineName: spare[0]?.lineName ?? null,
      reason:
        spare.length > 0
          ? `${o.lineName} load ${o.loadPercent}% exceeds capacity; ${spare[0].lineName} has spare capacity (${spare[0].loadPercent}%).`
          : `${o.lineName} load ${o.loadPercent}% exceeds capacity; review operator allocation or overtime.`,
      requiresApproval: true,
    }));

    return { factoryId, lines, recommendations, simulated: !!overrides };
  }

  async getReworkCost(
    user: AuthenticatedUser,
    factoryId: string,
    hourlyRate?: number,
    reworkMinutesPerPiece?: number,
  ) {
    if (!['md', 'factory-manager', 'supervisor'].includes(user.role)) {
      throw new ForbiddenException('Cost intelligence is restricted to management and supervisors');
    }
    const { rows } = await this.db.query<{
      jobId: string;
      jobCode: string;
      styleName: string | null;
      reworkPieces: string;
    }>(
      `SELECT j.id AS "jobId", j.job_code AS "jobCode", s.name AS "styleName",
              COALESCE(SUM(qb.rework), 0)::text AS "reworkPieces"
       FROM public.jobs j
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.garment_styles s ON s.id = j.style_id
       LEFT JOIN public.bundles b ON b.job_id = j.id
       LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
       WHERE ${factoryScope} AND f.id = $4
       GROUP BY j.id, j.job_code, s.name
       HAVING COALESCE(SUM(qb.rework), 0) > 0
       ORDER BY COALESCE(SUM(qb.rework), 0) DESC
       LIMIT 100`,
      [...jobScopeParams(user), factoryId],
    );

    const items = rows.map((r) => ({
      jobId: r.jobId,
      jobCode: r.jobCode,
      styleName: r.styleName,
      ...calculateReworkCost({
        reworkPieces: Number(r.reworkPieces),
        reworkMinutesPerPiece: reworkMinutesPerPiece ?? null,
        hourlyLabourRate: hourlyRate ?? null,
      }),
    }));
    return { factoryId, items };
  }

  async getDefectHeatmap(user: AuthenticatedUser, factoryId: string) {
    const { rows } = await this.db.query<{
      lineName: string;
      styleName: string;
      inspectedUnits: string;
      passedUnits: string;
      reworkUnits: string;
      rejectedUnits: string;
    }>(
      `SELECT COALESCE(l.name, 'Unassigned') AS "lineName",
              COALESCE(gs.name, 'Unknown') AS "styleName",
              COALESCE(SUM(qb.inspected), 0)::text AS "inspectedUnits",
              COALESCE(SUM(qb.passed), 0)::text AS "passedUnits",
              COALESCE(SUM(qb.rework), 0)::text AS "reworkUnits",
              COALESCE(SUM(qb.rejected), 0)::text AS "rejectedUnits"
       FROM public.bundle_quality_balances qb
       JOIN public.bundles b ON b.id = qb.bundle_id
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.production_lines l ON l.id = j.line_id
       LEFT JOIN public.garment_styles gs ON gs.id = j.style_id
       WHERE ${factoryScope} AND f.id = $4
       GROUP BY l.name, gs.name
       ORDER BY SUM(qb.rework + qb.rejected) DESC
       LIMIT 100`,
      [...jobScopeParams(user), factoryId],
    );

    const cells = rows.map((r) => {
      const inspected = Number(r.inspectedUnits);
      const defective = Number(r.reworkUnits) + Number(r.rejectedUnits);
      const firstPassAccepted = Math.max(0, inspected - defective);
      return {
        lineName: r.lineName,
        styleName: r.styleName,
        reworkUnits: Number(r.reworkUnits),
        rejectedUnits: Number(r.rejectedUnits),
        ...computeDefectRates({
          inspectedUnits: inspected,
          firstPassAcceptedUnits: firstPassAccepted,
          uniqueDefectivePieces: defective,
          defectOccurrences: defective,
        }),
      };
    });
    return { factoryId, cells };
  }

  async getProductionReplay(user: AuthenticatedUser, jobId: string) {
    const { rows: [job] } = await this.db.query<{ id: string; jobCode: string; status: string }>(
      `SELECT j.id, j.job_code AS "jobCode", j.status
       FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
       WHERE ${jobReadScope} AND j.id = $4`,
      [...jobScopeParams(user), jobId],
    );
    if (!job) throw new NotFoundException('Job not found');

    const { rows: events } = await this.db.query<{
      id: string;
      action: string;
      entityType: string;
      entityId: string | null;
      actorName: string | null;
      actorRole: string | null;
      newValues: Record<string, unknown> | null;
      recordedAt: string;
    }>(
      `SELECT id, action, entity_type AS "entityType", entity_id AS "entityId",
              actor_name AS "actorName", actor_role AS "actorRole",
              new_values AS "newValues", created_at::text AS "recordedAt"
       FROM public.audit_logs
       WHERE organization_id = $1
         AND (entity_id = $2 OR new_values->>'jobId' = $2)
       ORDER BY created_at ASC, id ASC
       LIMIT 500`,
      [user.organizationId, jobId],
    );

    return {
      readOnly: true,
      job,
      totalEvents: events.length,
      events,
    };
  }
}

@ApiTags('Production Intelligence')
@ApiBearerAuth()
@Controller()
export class Phase10IntelligenceController {
  constructor(private readonly p10: Phase10IntelligenceService) {}

  @Get('planning/skills')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  skills(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.p10.getSkillMatrix(user, factoryId);
  }

  @Get('planning/line-balancing')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  lineBalancing(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.p10.getLineBalancing(user, factoryId);
  }

  @Post('planning/line-balancing/simulate')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  simulateLineBalancing(@CurrentUser() user: AuthenticatedUser, @Body() body: LineBalanceSimInput) {
    return this.p10.getLineBalancing(user, body.factoryId, {
      efficiencyOverride: body.efficiencyOverride,
      samOverride: body.samOverride,
    });
  }

  @Get('analytics/rework-cost')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  reworkCost(
    @CurrentUser() user: AuthenticatedUser,
    @Query('factoryId', ParseUUIDPipe) factoryId: string,
    @Query('hourlyRate') hourlyRate?: string,
    @Query('reworkMinutes') reworkMinutes?: string,
  ) {
    return this.p10.getReworkCost(
      user,
      factoryId,
      hourlyRate ? Number(hourlyRate) : undefined,
      reworkMinutes ? Number(reworkMinutes) : undefined,
    );
  }

  @Get('analytics/defect-heatmap')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  defectHeatmap(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.p10.getDefectHeatmap(user, factoryId);
  }

  @Get('analytics/jobs/:id/replay')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  replay(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.p10.getProductionReplay(user, id);
  }
}
