import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, Matches } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

export class ReportIssueInput {
  @ApiProperty() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) factoryId!: string;
  @ApiProperty({ enum: ['machine', 'needle', 'fabric', 'power', 'trims', 'other'] })
  @IsIn(['machine', 'needle', 'fabric', 'power', 'trims', 'other']) category!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) machineCode!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(10080) stoppageMinutes!: number;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(1000) description!: string;
}

export class CreateWorkAssignmentInput {
  @ApiProperty() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) factoryId!: string;
  @ApiProperty() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' }) bundleId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) operatorName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) operatorEmployeeId?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) stageName!: string;
}

@Injectable()
export class ProductionFloorService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async assertFactory(user: AuthenticatedUser, factoryId: string) {
    const { rowCount } = await this.db.query(
      `SELECT 1 FROM public.factories f WHERE ${factoryScope} AND f.id = $4`,
      [...jobScopeParams(user), factoryId],
    );
    if (!rowCount) throw new ForbiddenException('Factory is outside your authorized scope');
  }

  async listIssues(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT pi.id, pi.factory_id AS "factoryId", pi.category, pi.machine_code AS "machineCode",
              pi.stoppage_minutes AS "stoppageMinutes", pi.description, pi.status,
              COALESCE(p.name, 'Operator') AS "reportedByName", pi.created_at AS "createdAt"
       FROM public.production_issues pi
       JOIN public.factories f ON f.id = pi.factory_id
       LEFT JOIN public.profiles p ON p.id = pi.reported_by
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY pi.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async reportIssue(user: AuthenticatedUser, body: ReportIssueInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      const { rows: [row] } = await client.query(
        `INSERT INTO public.production_issues (factory_id, category, machine_code, stoppage_minutes, description, reported_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, factory_id AS "factoryId", category, machine_code AS "machineCode",
                   stoppage_minutes AS "stoppageMinutes", description, status, created_at AS "createdAt"`,
        [body.factoryId, body.category, body.machineCode.trim(), body.stoppageMinutes, body.description.trim(), user.id],
      );
      await this.audit.record({
        organizationId: user.organizationId,
        factoryId: body.factoryId,
        actorId: user.id,
        actorEmployeeId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'PRODUCTION_ISSUE_REPORTED',
        entityType: 'production_issue',
        entityId: row.id,
        newValues: row,
      }, client);
      return row;
    });
  }

  async resolveIssue(user: AuthenticatedUser, id: string) {
    return this.db.withTransaction(async client => {
      const existing = await client.query(
        `SELECT pi.id, pi.factory_id, pi.status FROM public.production_issues pi
         JOIN public.factories f ON f.id = pi.factory_id
         WHERE ${factoryScope} AND pi.id = $4 FOR UPDATE OF pi`,
        [...jobScopeParams(user), id],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Production issue not found');
      const { rows: [row] } = await client.query(
        `UPDATE public.production_issues
         SET status = 'resolved', resolved_by = $1, resolved_at = NOW()
         WHERE id = $2
         RETURNING id, factory_id AS "factoryId", status, resolved_at AS "resolvedAt"`,
        [user.id, id],
      );
      await this.audit.record({
        organizationId: user.organizationId,
        factoryId: prev.factory_id,
        actorId: user.id,
        actorEmployeeId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'PRODUCTION_ISSUE_RESOLVED',
        entityType: 'production_issue',
        entityId: id,
        previousValues: { status: prev.status },
        newValues: { status: 'resolved' },
      }, client);
      return row;
    });
  }

  async listAssignments(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT wa.id, wa.factory_id AS "factoryId", wa.bundle_id AS "bundleId", b.barcode AS "bundleCode",
              j.job_code AS "jobCode", b.quantity, wa.operator_name AS "operatorName",
              wa.operator_employee_id AS "operatorEmployeeId", wa.stage_name AS "stageName",
              wa.status, wa.created_at AS "createdAt"
       FROM public.work_assignments wa
       JOIN public.factories f ON f.id = wa.factory_id
       JOIN public.bundles b ON b.id = wa.bundle_id
       JOIN public.jobs j ON j.id = b.job_id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY wa.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async createAssignment(user: AuthenticatedUser, body: CreateWorkAssignmentInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      const bundleCheck = await client.query(
        `SELECT 1 FROM public.bundles b
         JOIN public.jobs j ON j.id = b.job_id
         WHERE b.id = $1 AND j.factory_id = $2`,
        [body.bundleId, body.factoryId],
      );
      if (!bundleCheck.rowCount) throw new BadRequestException('Bundle does not belong to this factory');
      const { rows: [row] } = await client.query(
        `INSERT INTO public.work_assignments (factory_id, bundle_id, operator_name, operator_employee_id, stage_name, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, factory_id AS "factoryId", bundle_id AS "bundleId", operator_name AS "operatorName",
                   operator_employee_id AS "operatorEmployeeId", stage_name AS "stageName", status, created_at AS "createdAt"`,
        [body.factoryId, body.bundleId, body.operatorName.trim(), body.operatorEmployeeId?.trim() ?? null, body.stageName.trim(), user.id],
      );
      await this.audit.record({
        organizationId: user.organizationId,
        factoryId: body.factoryId,
        actorId: user.id,
        actorEmployeeId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'WORK_ASSIGNMENT_CREATED',
        entityType: 'work_assignment',
        entityId: row.id,
        newValues: row,
      }, client);
      return row;
    });
  }
}

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class ProductionFloorController {
  constructor(private readonly floor: ProductionFloorService) {}

  @Get('issues')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  listIssues(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.floor.listIssues(user, query);
  }

  @Post('issues')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  reportIssue(@CurrentUser() user: AuthenticatedUser, @Body() body: ReportIssueInput) {
    return this.floor.reportIssue(user, body);
  }

  @Patch('issues/:id/resolve')
  @RequirePermissions('CAN_MANAGE_JOBS')
  resolveIssue(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.floor.resolveIssue(user, id);
  }

  @Get('work-assignments')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  listAssignments(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.floor.listAssignments(user, query);
  }

  @Post('work-assignments')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  createAssignment(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateWorkAssignmentInput) {
    return this.floor.createAssignment(user, body);
  }
}
