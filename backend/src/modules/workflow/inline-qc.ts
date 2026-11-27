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

  async listAudits(user: AuthenticatedUser, query: FactoryQuery) {
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
    return this.db.withTransaction(async client => {
      const factoryCheck = await client.query(
        `SELECT 1 FROM public.factories f WHERE ${factoryScope} AND f.id = $4`,
        [...jobScopeParams(user), body.factoryId],
      );
      if (!factoryCheck.rowCount) throw new ForbiddenException('Factory is outside your authorized scope');

      const status = body.defectQty > 0 ? 'alert' : 'pass';
      const { rows: [row] } = await client.query(
        `INSERT INTO public.inline_qc_audits
           (factory_id, line_id, bundle_id, station_name, operator_name, sample_qty, defect_qty, defect_notes, status, inspector_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, factory_id AS "factoryId", line_id AS "lineId", bundle_id AS "bundleId",
                   station_name AS "stationName", operator_name AS "operatorName",
                   sample_qty AS "sampleQty", defect_qty AS "defectQty",
                   defect_notes AS "defectNotes", status, created_at AS "createdAt"`,
        [
          body.factoryId,
          body.lineId ?? null,
          body.bundleId ?? null,
          body.stationName.trim(),
          body.operatorName.trim(),
          body.sampleQty,
          body.defectQty,
          body.defectNotes?.trim() ?? null,
          status,
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
        action: 'INLINE_QC_AUDIT_RECORDED',
        entityType: 'inline_qc_audit',
        entityId: row.id,
        newValues: row,
      }, client);
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
              COALESCE(q.released, 0)::integer AS released
       FROM public.bundles b
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = b.id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY b.created_at DESC LIMIT 100`,
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
