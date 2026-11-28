import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, Matches } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

export class InlineAuditInput {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) requestId?: string;
  @ApiProperty() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) factoryId!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) lineId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) bundleId?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) stationName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) operatorName!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(1000) sampleQty!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(1000) defectQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) defectNotes?: string;
}

@Injectable()
export class InlineQcService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async cleanupDuplicates(factoryId: string): Promise<number> {
    const res = await this.db.query(
      `WITH ranked AS (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY factory_id,
                               COALESCE(line_id::text, ''),
                               LOWER(TRIM(station_name)),
                               LOWER(TRIM(operator_name)),
                               sample_qty,
                               defect_qty,
                               COALESCE(TRIM(defect_notes), ''),
                               DATE_TRUNC('hour', created_at)
                  ORDER BY created_at DESC, id DESC
                ) AS rn
         FROM public.inline_qc_audits
         WHERE factory_id = $1
       )
       DELETE FROM public.inline_qc_audits a
       USING ranked r
       WHERE a.id = r.id AND r.rn > 1`,
      [factoryId],
    );
    return res.rowCount ?? 0;
  }

  async listAudits(user: AuthenticatedUser, query: FactoryQuery) {
    await this.cleanupDuplicates(query.factoryId);
    const { rows } = await this.db.query(
      `SELECT a.id, a.factory_id AS "factoryId", a.line_id AS "lineId", a.bundle_id AS "bundleId",
              a.station_name AS "stationName", a.operator_name AS "operatorName",
              a.sample_qty AS "sampleQty", a.defect_qty AS "defectQty",
              a.defect_notes AS "defectNotes", a.status,
              COALESCE(p.name, 'Inspector') AS "inspectorName", a.created_at AS "createdAt"
       FROM public.inline_qc_audits a
       JOIN public.factories f ON f.id = a.factory_id
       LEFT JOIN public.profiles p ON p.id = a.inspector_id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY a.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async recordAudit(user: AuthenticatedUser, body: InlineAuditInput) {
    if (body.defectQty > body.sampleQty) {
      throw new BadRequestException('Defect quantity cannot exceed sample quantity');
    }
    const stationName = body.stationName.trim();
    const operatorName = body.operatorName.trim();
    const defectNotes = body.defectNotes?.trim() || null;

    return this.db.withTransaction(async client => {
      const factoryCheck = await client.query(
        `SELECT 1 FROM public.factories f WHERE ${factoryScope} AND f.id = $4`,
        [...jobScopeParams(user), body.factoryId],
      );
      if (!factoryCheck.rowCount) throw new ForbiddenException('Factory is outside your authorized scope');

      const status = body.defectQty > 0 ? 'alert' : 'pass';
      const { rows: [row] } = await client.query(
        `WITH recent_dup AS (
           SELECT a.id, a.factory_id AS "factoryId", a.line_id AS "lineId", a.bundle_id AS "bundleId",
                  a.station_name AS "stationName", a.operator_name AS "operatorName",
                  a.sample_qty AS "sampleQty", a.defect_qty AS "defectQty",
                  a.defect_notes AS "defectNotes", a.status, a.created_at AS "createdAt"
           FROM public.inline_qc_audits a
           WHERE a.factory_id = $1
             AND COALESCE(a.line_id::text, '') = COALESCE($2::text, '')
             AND LOWER(TRIM(a.station_name)) = LOWER($4)
             AND LOWER(TRIM(a.operator_name)) = LOWER($5)
             AND a.sample_qty = $6
             AND a.defect_qty = $7
             AND COALESCE(TRIM(a.defect_notes), '') = COALESCE($8, '')
             AND a.created_at >= NOW() - INTERVAL '10 minutes'
           ORDER BY a.created_at DESC LIMIT 1
         ),
         inserted AS (
           INSERT INTO public.inline_qc_audits
             (factory_id, line_id, bundle_id, station_name, operator_name, sample_qty, defect_qty, defect_notes, status, inspector_id)
           SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
           WHERE NOT EXISTS (SELECT 1 FROM recent_dup)
           RETURNING id, factory_id AS "factoryId", line_id AS "lineId", bundle_id AS "bundleId",
                     station_name AS "stationName", operator_name AS "operatorName",
                     sample_qty AS "sampleQty", defect_qty AS "defectQty",
                     defect_notes AS "defectNotes", status, created_at AS "createdAt"
         )
         SELECT id, "factoryId", "lineId", "bundleId", "stationName", "operatorName",
                "sampleQty", "defectQty", "defectNotes", status, "createdAt", TRUE AS "wasInserted"
         FROM inserted
         UNION ALL
         SELECT id, "factoryId", "lineId", "bundleId", "stationName", "operatorName",
                "sampleQty", "defectQty", "defectNotes", status, "createdAt", FALSE AS "wasInserted"
         FROM recent_dup
         LIMIT 1`,
        [
          body.factoryId,
          body.lineId ?? null,
          body.bundleId ?? null,
          stationName,
          operatorName,
          body.sampleQty,
          body.defectQty,
          defectNotes,
          status,
          user.id,
        ],
      );
      if ((row as { wasInserted?: boolean }).wasInserted !== false) {
        await this.audit.record({
          organizationId: user.organizationId,
          factoryId: body.factoryId,
          actorId: user.id,
          actorEmployeeId: user.employeeId,
          actorName: user.name,
          actorRole: user.role,
          action: 'INLINE_QC_AUDIT_RECORDED',
          entityType: 'inline_qc_audit',
          entityId: row.id,
          newValues: { ...row, ...(body.requestId ? { requestId: body.requestId } : {}) },
        }, client);
      }
      return row;
    });
  }

  async listQualityBundles(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT b.id, b.barcode AS "bundleCode", j.job_code AS "jobCode", b.size, b.color, b.quantity,
              COALESCE(q.inspected, 0)::integer AS inspected,
              COALESCE(q.passed, 0)::integer AS passed,
              COALESCE(q.rework, 0)::integer AS rework,
              COALESCE(q.rejected, 0)::integer AS rejected,
              COALESCE(q.reworked, 0)::integer AS reworked,
              COALESCE(q.released, 0)::integer AS released,
              (
                j.status = 'active'
                AND EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = j.id)
                AND NOT EXISTS (
                  SELECT 1 FROM public.job_route_steps s
                  WHERE s.job_id = j.id
                    AND NOT EXISTS (
                      SELECT 1 FROM public.bundle_route_progress e
                      WHERE e.bundle_id = b.id AND e.step_id = s.id AND e.completed_at IS NOT NULL
                    )
                )
              ) AS ready,
              ARRAY(
                SELECT s.stage_code
                FROM public.job_route_steps s
                WHERE s.job_id = j.id
                  AND NOT EXISTS (
                    SELECT 1 FROM public.bundle_route_progress e
                    WHERE e.bundle_id = b.id AND e.step_id = s.id AND e.completed_at IS NOT NULL
                  )
                ORDER BY s.ordinal ASC
              ) AS "pendingStages"
       FROM public.bundles b
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = b.id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY ready DESC, b.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }
}

@ApiTags('Quality')
@ApiBearerAuth()
@Controller('quality')
export class InlineQcController {
  constructor(private readonly inlineQc: InlineQcService) {}

  @Get('inline-audits')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  listAudits(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.inlineQc.listAudits(user, query);
  }

  @Post('inline-audits')
  @RequirePermissions('CAN_PERFORM_QC')
  recordAudit(@CurrentUser() user: AuthenticatedUser, @Body() body: InlineAuditInput) {
    return this.inlineQc.recordAudit(user, body);
  }

  @Get('bundles')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  listQualityBundles(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.inlineQc.listQualityBundles(user, query);
  }
}
