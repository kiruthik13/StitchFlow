import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsUUID, Matches, ValidateNested } from 'class-validator';
import { PoolClient } from 'pg';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

class RouteStepInput {
  @Matches(/^[a-z][a-z0-9-]{0,31}$/)
  stageCode!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  lineId!: string;

  @IsIn(['operator', 'supervisor'])
  role!: 'operator' | 'supervisor';

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  assignmentIds!: string[];
}

class DutyAssignmentInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  assignmentId!: string;

  @IsIn(['qc', 'rework', 'packing'])
  duty!: 'qc' | 'rework' | 'packing';
}

class RouteInput {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => RouteStepInput)
  steps!: RouteStepInput[];

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((value: DutyAssignmentInput) => value?.assignmentId + ':' + value?.duty)
  @ValidateNested({ each: true })
  @Type(() => DutyAssignmentInput)
  duties!: DutyAssignmentInput[];

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  cuttingAssignmentIds!: string[];
}

const roles = { qc: 'qc-inspector', rework: 'operator', packing: 'packing-staff' } as const;

@Injectable()
export class RouteSetupService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async configure(user: AuthenticatedUser, jobId: string, input: RouteInput) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('A Factory Manager must configure routes');
    if (Object.keys(roles).some(duty => !input.duties.some(item => item.duty === duty))) {
      throw new BadRequestException('QC, rework and packing assignments are required before a route can be saved');
    }
    return this.db.withTransaction(async client => {
      const { rows: [job] } = await client.query<{ factory_id: string; line_id: string; status: string; configured: boolean }>(`
        SELECT f.id AS factory_id, j.line_id, j.status, EXISTS(SELECT 1 FROM public.job_route_steps s WHERE s.job_id = j.id) AS configured
        FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
        WHERE ${factoryScope} AND j.id = $4 FOR UPDATE OF j`, [...jobScopeParams(user), jobId]);
      if (!job) throw new NotFoundException('Job not found');
      if (job.configured || !['draft', 'active'].includes(job.status)) {
        throw new ConflictException('This job cannot accept a new route');
      }

      if (input.cuttingAssignmentIds.length) {
        await this.validateAssignments(client, job.factory_id, 'operator', input.cuttingAssignmentIds, job.line_id);
        await client.query(`
          INSERT INTO public.cutting_assignments (job_id, assignment_id)
          SELECT $1, assignment_id FROM unnest($2::uuid[]) AS assignments(assignment_id)
          ON CONFLICT (job_id, assignment_id) DO NOTHING`, [jobId, input.cuttingAssignmentIds]);
      }

      const ids: string[] = [];
      for (const [index, step] of input.steps.entries()) {
        await this.validateAssignments(client, job.factory_id, step.role, step.assignmentIds, step.lineId);
        const { rows: [saved] } = await client.query<{ id: string }>(`
          INSERT INTO public.job_route_steps (job_id, ordinal, stage_code, line_id, role_code)
          VALUES ($1,$2,$3,$4,$5) RETURNING id`, [jobId, index + 1, step.stageCode, step.lineId, step.role]);
        await client.query(`
          INSERT INTO public.job_step_assignments (step_id, assignment_id)
          SELECT $1, assignment_id FROM unnest($2::uuid[]) AS assignments(assignment_id)`,
          [saved.id, step.assignmentIds]);
        ids.push(saved.id);
      }
      for (const duty of input.duties) {
        await this.validateAssignments(client, job.factory_id, roles[duty.duty], [duty.assignmentId]);
        await client.query(`
          INSERT INTO public.job_quality_assignments (job_id, assignment_id, duty) VALUES ($1,$2,$3)`,
          [jobId, duty.assignmentId, duty.duty]);
      }

      await this.audit.record({
        organizationId: user.organizationId, factoryId: job.factory_id, actorId: user.id,
        actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
        action: 'JOB_ROUTE_CONFIGURED', entityType: 'job', entityId: jobId, newValues: { stepIds: ids },
      }, client);
      return { jobId, stepIds: ids };
    });
  }

  async details(user: AuthenticatedUser, jobId: string) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('A Factory Manager must configure routes');
    const { rows: [job] } = await this.db.query(`
      SELECT j.line_id AS "cuttingLineId", j.status,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'stageCode', s.stage_code,
          'lineName', l.name, 'role', s.role_code) ORDER BY s.ordinal)
          FROM public.job_route_steps s JOIN public.production_lines l ON l.id = s.line_id WHERE s.job_id = j.id), '[]'::jsonb) AS steps,
        COALESCE((SELECT max_rejected_quantity FROM public.job_close_policies WHERE job_id = j.id), 0) AS "maxRejectedQuantity"
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND j.id = $4`, [...jobScopeParams(user), jobId]);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async eligible(user: AuthenticatedUser, jobId: string) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('A Factory Manager must configure routes');
    const { rows } = await this.db.query(`
      SELECT a.id, a.line_id AS "lineId", p.role_code AS role, p.name AS "employeeName",
        p.employee_id AS "employeeId", l.name AS "lineName", a.shift_type AS "shift"
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      JOIN public.user_assignments a ON a.factory_id = f.id AND a.is_active
      JOIN public.profiles p ON p.id = a.profile_id AND p.organization_id = f.organization_id AND p.account_status = 'active'
      JOIN public.production_lines l ON l.id = a.line_id AND l.factory_id = f.id AND l.is_active
      JOIN public.departments d ON d.id = a.department_id AND d.id = l.department_id AND d.is_active
      JOIN public.units u ON u.id = a.unit_id AND u.id = d.unit_id AND u.factory_id = f.id AND u.is_active
      WHERE ${factoryScope} AND j.id = $4 AND p.role_code IN ('operator','supervisor','qc-inspector','packing-staff')
      ORDER BY l.name, p.employee_id, a.id LIMIT 500`, [...jobScopeParams(user), jobId]);
    return rows;
  }

  private async validateAssignments(client: PoolClient, factoryId: string, role: string, assignmentIds: string[], lineId?: string) {
    const { rowCount } = await client.query(`
      SELECT a.id FROM public.user_assignments a
      JOIN public.factories f ON f.id = a.factory_id AND f.is_active
      JOIN public.profiles p ON p.id = a.profile_id AND p.organization_id = f.organization_id
        AND p.account_status = 'active' AND p.role_code = $3
      JOIN public.production_lines l ON l.id = a.line_id AND l.factory_id = a.factory_id AND l.is_active
      JOIN public.departments d ON d.id = a.department_id AND d.id = l.department_id AND d.is_active
      JOIN public.units u ON u.id = a.unit_id AND u.id = d.unit_id AND u.factory_id = a.factory_id AND u.is_active
      WHERE a.id = ANY($1::uuid[]) AND a.factory_id = $2 AND a.is_active
        AND ($4::uuid IS NULL OR a.line_id = $4)`, [assignmentIds, factoryId, role, lineId ?? null]);
    if (rowCount !== assignmentIds.length) throw new ForbiddenException('Route assignment is outside the required factory, line or role');
  }
}

@ApiTags('Production workflow')
@ApiBearerAuth()
@Controller('jobs')
export class RouteSetupController {
  constructor(private readonly routes: RouteSetupService) {}

  @Get(':id/route-assignments')
  @RequirePermissions('CAN_MANAGE_JOBS')
  eligible(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.routes.eligible(user, id);
  }

  @Get(':id/route')
  @RequirePermissions('CAN_MANAGE_JOBS')
  details(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.routes.details(user, id);
  }

  @Post(':id/route')
  @RequirePermissions('CAN_MANAGE_JOBS')
  configure(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: RouteInput) {
    return this.routes.configure(user, id, body);
  }
}
