import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

export class UpsertSamPlanInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsUUID() styleId!: string;
  @ApiProperty() @IsObject() operationBreakdown!: Record<string, number>;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.1) @Max(1000) totalSam!: number;
}

export class UpsertWorkforcePlanInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsUUID() lineId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(5000) plannedOperators!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(5000) presentOperators!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2000) helpersCount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(60) @Max(1440) shiftMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(150) efficiencyPercent?: number;
}

export interface DeliveryPredictionInput {
  remainingQty: number;
  reworkQty: number;
  dailyCapacity: number;
  startDate: string;
  targetDate: string;
  holidays: string[];
}

export function predictDeliveryDate(input: DeliveryPredictionInput) {
  const effectiveLoad = Math.max(0, input.remainingQty) + Math.max(0, input.reworkQty);
  if (effectiveLoad === 0) {
    return {
      effectiveLoad: 0,
      workingDaysNeeded: 0,
      predictedDate: input.startDate,
      targetDate: input.targetDate,
      daysDelta: 0,
      riskLevel: 'on-track' as const,
    };
  }
  const capacity = Math.max(1, input.dailyCapacity);
  const workingDaysNeeded = Math.ceil(effectiveLoad / capacity);
  const holidaySet = new Set(input.holidays);
  const cursor = new Date(`${input.startDate}T00:00:00Z`);
  let counted = 0;
  let guard = 0;
  while (counted < workingDaysNeeded && guard < 1095) {
    guard += 1;
    const iso = cursor.toISOString().slice(0, 10);
    const isSunday = cursor.getUTCDay() === 0;
    if (!isSunday && !holidaySet.has(iso)) {
      counted += 1;
      if (counted === workingDaysNeeded) break;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const predictedDate = cursor.toISOString().slice(0, 10);
  const targetMs = Date.parse(`${input.targetDate}T00:00:00Z`);
  const predictedMs = Date.parse(`${predictedDate}T00:00:00Z`);
  const daysDelta = Math.round((predictedMs - targetMs) / 86_400_000);
  const riskLevel = daysDelta > 2 ? 'delayed' : daysDelta > 0 ? 'at-risk' : 'on-track';
  return {
    effectiveLoad,
    workingDaysNeeded,
    predictedDate,
    targetDate: input.targetDate,
    daysDelta,
    riskLevel,
  };
}

@Injectable()
export class PlanningIntelligenceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async assertFactory(user: AuthenticatedUser, factoryId: string) {
    const { rowCount } = await this.db.query(
      `SELECT 1 FROM public.factories f WHERE ${factoryScope} AND f.id = $4`,
      [...jobScopeParams(user), factoryId],
    );
    if (!rowCount) throw new ForbiddenException('Factory is outside your authorized scope');
  }

  async listSamPlans(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT sp.id, sp.factory_id AS "factoryId", sp.style_id AS "styleId", gs.name AS "styleName",
              gs.code AS "styleCode", sp.operation_breakdown AS "operationBreakdown",
              sp.total_sam::float8 AS "totalSam", sp.target_pcs_per_hour AS "targetPcsPerHour",
              sp.updated_at AS "updatedAt"
       FROM public.sam_plans sp
       JOIN public.garment_styles gs ON gs.id = sp.style_id
       JOIN public.factories f ON f.id = sp.factory_id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY gs.name ASC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async upsertSamPlan(user: AuthenticatedUser, body: UpsertSamPlanInput) {
    await this.assertFactory(user, body.factoryId);
    const targetPcsPerHour = body.totalSam > 0 ? Math.round(60 / body.totalSam) : 0;
    return this.db.withTransaction(async client => {
      const style = await client.query(
        'SELECT 1 FROM public.garment_styles WHERE id = $1 AND factory_id = $2 AND is_active',
        [body.styleId, body.factoryId],
      );
      if (!style.rowCount) throw new BadRequestException('Style not found in this factory');
      const { rows: [row] } = await client.query(
        `INSERT INTO public.sam_plans (factory_id, style_id, operation_breakdown, total_sam, target_pcs_per_hour, updated_by, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, NOW())
         ON CONFLICT (factory_id, style_id) DO UPDATE
         SET operation_breakdown = EXCLUDED.operation_breakdown,
             total_sam = EXCLUDED.total_sam,
             target_pcs_per_hour = EXCLUDED.target_pcs_per_hour,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
         RETURNING id, factory_id AS "factoryId", style_id AS "styleId", operation_breakdown AS "operationBreakdown",
                   total_sam::float8 AS "totalSam", target_pcs_per_hour AS "targetPcsPerHour", updated_at AS "updatedAt"`,
        [body.factoryId, body.styleId, JSON.stringify(body.operationBreakdown), body.totalSam, targetPcsPerHour, user.id],
      );
      await this.audit.record({
        organizationId: user.organizationId,
        factoryId: body.factoryId,
        actorId: user.id,
        actorEmployeeId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'SAM_PLAN_UPSERTED',
        entityType: 'sam_plan',
        entityId: row.id,
        newValues: row,
      }, client);
      return row;
    });
  }

  async listWorkforcePlans(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT pl.id AS "lineId", pl.name AS "lineName", pl.code AS "lineCode",
              COALESCE(wp.planned_operators, 20)::integer AS "plannedOperators",
              COALESCE(wp.present_operators, 20)::integer AS "presentOperators",
              COALESCE(wp.helpers_count, 2)::integer AS "helpersCount",
              COALESCE(wp.shift_minutes, 480)::integer AS "shiftMinutes",
              COALESCE(wp.efficiency_percent, 80)::float8 AS "efficiencyPercent",
              wp.updated_at AS "updatedAt"
       FROM public.production_lines pl
       JOIN public.factories f ON f.id = pl.factory_id
       LEFT JOIN public.workforce_plans wp ON wp.line_id = pl.id AND wp.factory_id = pl.factory_id
       WHERE ${factoryScope} AND f.id = $4 AND pl.is_active
       ORDER BY pl.name ASC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async upsertWorkforcePlan(user: AuthenticatedUser, body: UpsertWorkforcePlanInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      const line = await client.query(
        'SELECT 1 FROM public.production_lines WHERE id = $1 AND factory_id = $2 AND is_active',
        [body.lineId, body.factoryId],
      );
      if (!line.rowCount) throw new BadRequestException('Production line not found in this factory');
      const { rows: [row] } = await client.query(
        `INSERT INTO public.workforce_plans
           (factory_id, line_id, planned_operators, present_operators, helpers_count, shift_minutes, efficiency_percent, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (factory_id, line_id) DO UPDATE
         SET planned_operators = EXCLUDED.planned_operators,
             present_operators = EXCLUDED.present_operators,
             helpers_count = EXCLUDED.helpers_count,
             shift_minutes = EXCLUDED.shift_minutes,
             efficiency_percent = EXCLUDED.efficiency_percent,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
         RETURNING id, factory_id AS "factoryId", line_id AS "lineId", planned_operators AS "plannedOperators",
                   present_operators AS "presentOperators", helpers_count AS "helpersCount",
                   shift_minutes AS "shiftMinutes", efficiency_percent::float8 AS "efficiencyPercent", updated_at AS "updatedAt"`,
        [
          body.factoryId,
          body.lineId,
          body.plannedOperators,
          body.presentOperators,
          body.helpersCount ?? 0,
          body.shiftMinutes ?? 480,
          body.efficiencyPercent ?? 80,
          user.id,
        ],
      );
      await this.audit.record({
        organizationId: user.organizationId,
        factoryId: body.factoryId,
        actorId: user.id,
        actorEmployeeId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'WORKFORCE_PLAN_UPSERTED',
        entityType: 'workforce_plan',
        entityId: row.id,
        newValues: row,
      }, client);
      return row;
    });
  }

  async detectBottlenecks(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows: reworkRows } = await this.db.query<{
      jobCode: string;
      lineName: string;
      reworkQty: number;
      wipQty: number;
    }>(
      `SELECT j.job_code AS "jobCode", pl.name AS "lineName",
              COALESCE(SUM(q.rework), 0)::integer AS "reworkQty",
              COALESCE(SUM(b.quantity - COALESCE(q.released, 0)), 0)::integer AS "wipQty"
       FROM public.jobs j
       JOIN public.factories f ON f.id = j.factory_id
       JOIN public.production_lines pl ON pl.id = j.line_id
       LEFT JOIN public.bundles b ON b.job_id = j.id
       LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = b.id
       WHERE ${factoryScope} AND f.id = $4 AND j.status = 'active'
       GROUP BY j.id, j.job_code, pl.name
       HAVING COALESCE(SUM(q.rework), 0) > 0 OR COALESCE(SUM(b.quantity - COALESCE(q.released, 0)), 0) > 0
       ORDER BY COALESCE(SUM(q.rework), 0) DESC, "wipQty" DESC LIMIT 20`,
      [...jobScopeParams(user), query.factoryId],
    );

    const { rows: slowStations } = await this.db.query<{
      operationName: string;
      operatorName: string;
      lineName: string;
      targetPace: number;
      actualPace: number;
    }>(
      `SELECT tm.operation_name AS "operationName", tm.operator_name AS "operatorName",
              pl.name AS "lineName", tm.target_pace AS "targetPace", tm.actual_pace AS "actualPace"
       FROM public.tailor_mappings tm
       JOIN public.factories f ON f.id = tm.factory_id
       JOIN public.production_lines pl ON pl.id = tm.line_id
       WHERE ${factoryScope} AND f.id = $4 AND tm.is_active AND tm.actual_pace < tm.target_pace
       ORDER BY (tm.target_pace - tm.actual_pace) DESC LIMIT 20`,
      [...jobScopeParams(user), query.factoryId],
    );

    const bottlenecks = [
      ...reworkRows
        .filter(r => r.reworkQty > 0)
        .map((r, idx) => ({
          id: `rw-${idx}`,
          stage: 'QC Rework Loop',
          lineName: r.lineName,
          jobCode: r.jobCode,
          piledPieces: r.wipQty,
          reworkBacklog: r.reworkQty,
          severity: r.reworkQty >= 15 ? 'critical' : 'warning',
          rootCause: `${r.reworkQty} rework pieces pending rectification and reinspection.`,
          recommendation: 'Prioritize rework return before releasing downstream bundles.',
        })),
      ...slowStations.map((s, idx) => {
        const variancePct = Math.round(((s.targetPace - s.actualPace) / Math.max(1, s.targetPace)) * 100);
        return {
          id: `st-${idx}`,
          stage: s.operationName,
          lineName: s.lineName,
          jobCode: s.operatorName,
          piledPieces: Math.max(0, s.targetPace - s.actualPace),
          reworkBacklog: 0,
          severity: variancePct >= 25 ? 'critical' : 'warning',
          rootCause: `Operator ${s.operatorName} running at ${s.actualPace} pcs/hr vs ${s.targetPace} pcs/hr target (-${variancePct}%).`,
          recommendation: 'Pair helper or rebalance station workload.',
        };
      }),
    ];

    return bottlenecks;
  }

  async deliveryPredictions(user: AuthenticatedUser, query: FactoryQuery) {
    const today = new Date().toISOString().slice(0, 10);
    const { rows: holidays } = await this.db.query<{ holiday_date: string }>(
      `SELECT h.holiday_date::text FROM public.factory_calendar_holidays h
       JOIN public.factories f ON f.id = h.factory_id
       WHERE ${factoryScope} AND f.id = $4`,
      [...jobScopeParams(user), query.factoryId],
    );
    const holidayDates = holidays.map(h => h.holiday_date);

    const { rows: jobs } = await this.db.query<{
      id: string;
      jobCode: string;
      orderQuantity: number;
      targetDate: string;
      releasedQty: number;
      reworkQty: number;
      presentOperators: number;
      shiftMinutes: number;
      efficiencyPercent: number;
      totalSam: number;
    }>(
      `SELECT j.id, j.job_code AS "jobCode", j.order_quantity AS "orderQuantity", j.target_date::text AS "targetDate",
              COALESCE((SELECT SUM(q.released) FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id WHERE b.job_id = j.id), 0)::integer AS "releasedQty",
              COALESCE((SELECT SUM(q.rework) FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id WHERE b.job_id = j.id), 0)::integer AS "reworkQty",
              COALESCE(wp.present_operators, 20)::integer AS "presentOperators",
              COALESCE(wp.shift_minutes, 480)::integer AS "shiftMinutes",
              COALESCE(wp.efficiency_percent, 80)::float8 AS "efficiencyPercent",
              COALESCE(sp.total_sam, 15)::float8 AS "totalSam"
       FROM public.jobs j
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.workforce_plans wp ON wp.factory_id = j.factory_id AND wp.line_id = j.line_id
       LEFT JOIN public.sam_plans sp ON sp.factory_id = j.factory_id AND sp.style_id = j.style_id
       WHERE ${factoryScope} AND f.id = $4 AND j.status = 'active'
       ORDER BY j.target_date ASC LIMIT 50`,
      [...jobScopeParams(user), query.factoryId],
    );

    return jobs.map(j => {
      const remainingQty = Math.max(0, j.orderQuantity - j.releasedQty);
      const dailyCapacity = Math.max(
        1,
        Math.floor((j.presentOperators * j.shiftMinutes * (j.efficiencyPercent / 100)) / Math.max(0.1, j.totalSam)),
      );
      const prediction = predictDeliveryDate({
        remainingQty,
        reworkQty: j.reworkQty,
        dailyCapacity,
        startDate: today,
        targetDate: j.targetDate,
        holidays: holidayDates,
      });
      return {
        jobId: j.id,
        jobCode: j.jobCode,
        dailyCapacity,
        ...prediction,
      };
    });
  }
}

@ApiTags('Planning & Intelligence')
@ApiBearerAuth()
@Controller('planning')
export class PlanningIntelligenceController {
  constructor(private readonly intel: PlanningIntelligenceService) {}

  @Get('sam')
  @RequirePermissions('CAN_VIEW_REPORTS')
  listSam(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.intel.listSamPlans(user, query);
  }

  @Put('sam')
  @RequirePermissions('CAN_MANAGE_JOBS')
  upsertSam(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertSamPlanInput) {
    return this.intel.upsertSamPlan(user, body);
  }

  @Get('workforce')
  @RequirePermissions('CAN_VIEW_REPORTS')
  listWorkforce(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.intel.listWorkforcePlans(user, query);
  }

  @Put('workforce')
  @RequirePermissions('CAN_MANAGE_JOBS')
  upsertWorkforce(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertWorkforcePlanInput) {
    return this.intel.upsertWorkforcePlan(user, body);
  }

  @Get('bottlenecks')
  @RequirePermissions('CAN_VIEW_REPORTS')
  bottlenecks(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.intel.detectBottlenecks(user, query);
  }

  @Get('delivery-predictions')
  @RequirePermissions('CAN_VIEW_REPORTS')
  deliveryPredictions(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.intel.deliveryPredictions(user, query);
  }
}
