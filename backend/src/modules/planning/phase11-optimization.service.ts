import {
  BadRequestException,
  Body,
  ConflictException,
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
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { randomUUID } from 'crypto';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

export function optimizeCartonPlan(availableQty: number, maxPerCarton: number) {
  const safeAvailable = Math.max(0, Math.floor(availableQty));
  const safeCap = Math.max(1, Math.floor(maxPerCarton));
  if (safeAvailable === 0) {
    return { totalPieces: 0, cartonCount: 0, cartons: [] as Array<{ index: number; quantity: number; utilizationPercent: number }> };
  }
  const cartons: Array<{ index: number; quantity: number; utilizationPercent: number }> = [];
  let remaining = safeAvailable;
  let index = 1;
  while (remaining > 0) {
    const qty = Math.min(remaining, safeCap);
    cartons.push({
      index: index++,
      quantity: qty,
      utilizationPercent: Number(((qty / safeCap) * 100).toFixed(1)),
    });
    remaining -= qty;
  }
  return {
    totalPieces: safeAvailable,
    cartonCount: cartons.length,
    cartons,
  };
}

export class SplitBundleInput {
  @IsArray()
  @ArrayMinSize(2)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  quantities!: number[];
}

export class MergeBundlesInput {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  bundleIds!: string[];
}

export class OptimizeCartonsInput {
  @IsUUID() bundleId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) maxPerCarton!: number;
}

@Injectable()
export class Phase11OptimizationService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async splitBundle(user: AuthenticatedUser, bundleId: string, input: SplitBundleInput) {
    if (!['factory-manager', 'supervisor'].includes(user.role)) {
      throw new ForbiddenException('Only Factory Manager or Supervisor can split bundles');
    }
    return this.db.withTransaction(async (client) => {
      const { rows: [parent] } = await client.query<{
        id: string;
        job_id: string;
        factory_id: string;
        size: string;
        color: string;
        quantity: number;
      }>(
        `SELECT b.id, b.job_id, j.factory_id, b.size, b.color, b.quantity
         FROM public.bundles b
         JOIN public.jobs j ON j.id = b.job_id
         JOIN public.factories f ON f.id = j.factory_id
         WHERE ${factoryScope} AND b.id = $4
         FOR UPDATE OF b, j`,
        [...jobScopeParams(user), bundleId],
      );
      if (!parent) throw new NotFoundException('Bundle not found');
      const totalSplit = input.quantities.reduce((s, q) => s + q, 0);
      if (totalSplit !== parent.quantity) {
        throw new ConflictException(`Split quantities (${totalSplit}) must equal parent bundle quantity (${parent.quantity})`);
      }

      const childIds: string[] = [];
      for (const qty of input.quantities) {
        const reqId = randomUUID();
        const { rows: [child] } = await client.query<{ id: string }>(
          `INSERT INTO public.bundles (job_id, request_id, size, color, quantity, created_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [parent.job_id, reqId, parent.size, parent.color, qty, user.id],
        );
        childIds.push(child.id);
      }

      await this.audit.record(
        {
          organizationId: user.organizationId,
          factoryId: parent.factory_id,
          actorId: user.id,
          actorEmployeeId: user.employeeId,
          actorName: user.name,
          actorRole: user.role,
          action: 'BUNDLE_SPLIT',
          entityType: 'bundle',
          entityId: parent.id,
          newValues: { parentBundleId: parent.id, childBundleIds: childIds, quantities: input.quantities },
        },
        client,
      );

      return { parentBundleId: parent.id, conservedQuantity: totalSplit, childBundleIds: childIds, quantities: input.quantities };
    });
  }

  async mergeBundles(user: AuthenticatedUser, input: MergeBundlesInput) {
    if (!['factory-manager', 'supervisor'].includes(user.role)) {
      throw new ForbiddenException('Only Factory Manager or Supervisor can merge bundles');
    }
    return this.db.withTransaction(async (client) => {
      const { rows } = await client.query<{
        id: string;
        job_id: string;
        factory_id: string;
        size: string;
        color: string;
        quantity: number;
        released: number;
      }>(
        `SELECT b.id, b.job_id, j.factory_id, b.size, b.color, b.quantity, COALESCE(qb.released, 0)::int AS released
         FROM public.bundles b
         JOIN public.jobs j ON j.id = b.job_id
         JOIN public.factories f ON f.id = j.factory_id
         LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
         WHERE ${factoryScope} AND b.id = ANY($4::uuid[])
         FOR UPDATE OF b`,
        [...jobScopeParams(user), input.bundleIds],
      );
      if (rows.length !== input.bundleIds.length) {
        throw new NotFoundException('One or more bundles were not found in your scope');
      }
      const first = rows[0];
      const compatible = rows.every(
        (r) =>
          r.job_id === first.job_id &&
          r.size === first.size &&
          r.color === first.color &&
          (r.released > 0) === (first.released > 0),
      );
      if (!compatible) {
        throw new ConflictException('Bundles are incompatible for merge (job, size, color, or release state mismatch)');
      }
      const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
      const { rows: [merged] } = await client.query<{ id: string }>(
        `INSERT INTO public.bundles (job_id, request_id, size, color, quantity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [first.job_id, randomUUID(), first.size, first.color, totalQty, user.id],
      );
      await this.audit.record(
        {
          organizationId: user.organizationId,
          factoryId: first.factory_id,
          actorId: user.id,
          actorEmployeeId: user.employeeId,
          actorName: user.name,
          actorRole: user.role,
          action: 'BUNDLE_MERGED',
          entityType: 'bundle',
          entityId: merged.id,
          newValues: { sourceBundleIds: input.bundleIds, totalQuantity: totalQty },
        },
        client,
      );
      return { mergedBundleId: merged.id, sourceBundleIds: input.bundleIds, totalQuantity: totalQty };
    });
  }

  async getMachineMaintenance(user: AuthenticatedUser, factoryId: string) {
    const { rows } = await this.db.query<{
      lineId: string;
      lineName: string;
      openIssues: string;
      resolvedIssues: string;
      totalDowntimeHours: string;
      lastReportedAt: string | null;
    }>(
      `SELECT l.id AS "lineId", l.name AS "lineName",
              COUNT(*) FILTER (WHERE pi.status != 'resolved')::text AS "openIssues",
              COUNT(*) FILTER (WHERE pi.status = 'resolved')::text AS "resolvedIssues",
              COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(pi.resolved_at, now()) - pi.created_at)) / 3600.0), 0)::numeric(10,2)::text AS "totalDowntimeHours",
              MAX(pi.created_at)::text AS "lastReportedAt"
       FROM public.production_lines l
       JOIN public.factories f ON f.id = l.factory_id
       LEFT JOIN public.production_issues pi ON pi.line_id = l.id
       WHERE ${factoryScope} AND f.id = $4 AND l.is_active = true
       GROUP BY l.id, l.name
       ORDER BY l.name ASC`,
      [...jobScopeParams(user), factoryId],
    );

    const machines = rows.map((r) => {
      const open = Number(r.openIssues);
      const resolved = Number(r.resolvedIssues);
      const downtime = Number(r.totalDowntimeHours);
      return {
        lineId: r.lineId,
        lineName: r.lineName,
        status: open > 0 ? ('Stopped' as const) : ('Available' as const),
        openIssues: open,
        resolvedIssues: resolved,
        totalDowntimeHours: downtime,
        mttrHours: resolved > 0 ? Number((downtime / resolved).toFixed(2)) : null,
        lastReportedAt: r.lastReportedAt,
      };
    });
    return { factoryId, machines };
  }

  async getFabricTraceability(user: AuthenticatedUser, factoryId: string) {
    const { rows } = await this.db.query<{
      materialId: string;
      sku: string;
      name: string;
      baseUnit: string;
      receivedQty: string;
      issuedQty: string;
      jobCode: string | null;
    }>(
      `SELECT rm.id AS "materialId", rm.sku, rm.name, rm.base_unit AS "baseUnit",
              COALESCE(SUM(CASE WHEN t.direction = 'receipt' THEN t.quantity ELSE 0 END), 0)::text AS "receivedQty",
              COALESCE(SUM(CASE WHEN t.direction = 'issue' THEN t.quantity ELSE 0 END), 0)::text AS "issuedQty",
              MAX(j.job_code) AS "jobCode"
       FROM public.raw_materials rm
       JOIN public.factories f ON f.id = rm.factory_id
       LEFT JOIN public.raw_material_transactions t ON t.material_id = rm.id
       LEFT JOIN public.jobs j ON j.id = t.job_id
       WHERE ${factoryScope} AND f.id = $4
       GROUP BY rm.id, rm.sku, rm.name, rm.base_unit
       ORDER BY rm.name ASC
       LIMIT 100`,
      [...jobScopeParams(user), factoryId],
    );
    return {
      factoryId,
      lots: rows.map((r) => ({
        ...r,
        receivedQty: Number(r.receivedQty),
        issuedQty: Number(r.issuedQty),
        lineageStatus: r.jobCode ? 'linked' : 'incomplete_lineage',
      })),
    };
  }

  async optimizeCartons(user: AuthenticatedUser, input: OptimizeCartonsInput) {
    const { rows: [row] } = await this.db.query<{
      bundleCode: string;
      released: number;
      packed: string;
    }>(
      `SELECT b.barcode AS "bundleCode",
              COALESCE(qb.released, 0)::int AS released,
              COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c WHERE c.bundle_id = b.id), 0)::text AS packed
       FROM public.bundles b
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
       WHERE ${factoryScope} AND b.id = $4`,
      [...jobScopeParams(user), input.bundleId],
    );
    if (!row) throw new NotFoundException('Bundle not found');
    const remainingPackable = Math.max(0, Number(row.released) - Number(row.packed));
    return {
      bundleId: input.bundleId,
      bundleCode: row.bundleCode,
      released: Number(row.released),
      alreadyPacked: Number(row.packed),
      remainingPackable,
      maxPerCarton: input.maxPerCarton,
      recommendation: optimizeCartonPlan(remainingPackable, input.maxPerCarton),
    };
  }

  async getDailyDigest(user: AuthenticatedUser, factoryId?: string) {
    if (!['md', 'factory-manager', 'supervisor'].includes(user.role)) {
      throw new ForbiddenException('Daily digest is restricted to MD, Factory Manager, and Supervisor');
    }
    const targetFactory = factoryId ?? user.primaryFactoryId ?? user.assignedFactoryIds[0] ?? null;
    const { rows: [stats] } = await this.db.query<{
      activeJobs: string;
      completedJobs: string;
      overdueJobs: string;
      inspected: string;
      passed: string;
      rework: string;
      rejected: string;
      packed: string;
      dispatched: string;
      openIssues: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE j.status = 'active')::text AS "activeJobs",
         COUNT(*) FILTER (WHERE j.status = 'completed')::text AS "completedJobs",
         COUNT(*) FILTER (WHERE j.status = 'active' AND j.target_date < CURRENT_DATE)::text AS "overdueJobs",
         COALESCE(SUM(qb.inspected), 0)::text AS inspected,
         COALESCE(SUM(qb.passed), 0)::text AS passed,
         COALESCE(SUM(qb.rework), 0)::text AS rework,
         COALESCE(SUM(qb.rejected), 0)::text AS rejected,
         COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c
                   JOIN public.bundles b2 ON b2.id = c.bundle_id
                   JOIN public.jobs j2 ON j2.id = b2.job_id
                   WHERE j2.organization_id = $1 AND ($4::uuid IS NULL OR j2.factory_id = $4)), 0)::text AS packed,
         COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c
                   JOIN public.carton_dispatch d ON d.carton_id = c.id AND d.dispatched_at IS NOT NULL
                   JOIN public.bundles b2 ON b2.id = c.bundle_id
                   JOIN public.jobs j2 ON j2.id = b2.job_id
                   WHERE j2.organization_id = $1 AND ($4::uuid IS NULL OR j2.factory_id = $4)), 0)::text AS dispatched,
         COALESCE((SELECT COUNT(*) FROM public.production_issues pi
                   WHERE pi.status != 'resolved' AND ($4::uuid IS NULL OR pi.factory_id = $4)), 0)::text AS "openIssues"
       FROM public.jobs j
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.bundles b ON b.job_id = j.id
       LEFT JOIN public.bundle_quality_balances qb ON qb.bundle_id = b.id
       WHERE ${factoryScope} AND ($4::uuid IS NULL OR f.id = $4)`,
      [...jobScopeParams(user), targetFactory],
    );

    return {
      reportDate: new Date().toISOString().slice(0, 10),
      scope: user.role === 'md' && !factoryId ? 'organization' : 'factory',
      factoryId: targetFactory,
      activeJobs: Number(stats?.activeJobs ?? 0),
      completedJobs: Number(stats?.completedJobs ?? 0),
      overdueJobs: Number(stats?.overdueJobs ?? 0),
      qc: {
        inspected: Number(stats?.inspected ?? 0),
        passed: Number(stats?.passed ?? 0),
        rework: Number(stats?.rework ?? 0),
        rejected: Number(stats?.rejected ?? 0),
      },
      packed: Number(stats?.packed ?? 0),
      dispatched: Number(stats?.dispatched ?? 0),
      openIssues: Number(stats?.openIssues ?? 0),
    };
  }
}

@ApiTags('Enterprise Optimization')
@ApiBearerAuth()
@Controller()
export class Phase11OptimizationController {
  constructor(private readonly p11: Phase11OptimizationService) {}

  @Post('bundles/:id/split')
  @RequirePermissions('CAN_MANAGE_WORKFLOW')
  split(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: SplitBundleInput) {
    return this.p11.splitBundle(user, id, body);
  }

  @Post('bundles/merge')
  @RequirePermissions('CAN_MANAGE_WORKFLOW')
  merge(@CurrentUser() user: AuthenticatedUser, @Body() body: MergeBundlesInput) {
    return this.p11.mergeBundles(user, body);
  }

  @Get('analytics/machines')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  machines(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.p11.getMachineMaintenance(user, factoryId);
  }

  @Get('analytics/fabric-traceability')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  fabricTraceability(@CurrentUser() user: AuthenticatedUser, @Query('factoryId', ParseUUIDPipe) factoryId: string) {
    return this.p11.getFabricTraceability(user, factoryId);
  }

  @Post('packing/optimize-cartons')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  optimizeCartons(@CurrentUser() user: AuthenticatedUser, @Body() body: OptimizeCartonsInput) {
    return this.p11.optimizeCartons(user, body);
  }

  @Get('analytics/daily-digest')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  dailyDigest(@CurrentUser() user: AuthenticatedUser, @Query('factoryId') factoryId?: string) {
    return this.p11.getDailyDigest(user, factoryId);
  }
}
