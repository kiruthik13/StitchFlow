import { Body, ConflictException, Controller, ForbiddenException, Injectable, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

export class CuttingOutputInput {
  @IsUUID()
  bundleId!: string;

  @IsUUID()
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  clientOccurredAt?: string;
}

@Injectable()
export class CuttingOutputService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async record(user: AuthenticatedUser, input: CuttingOutputInput) {
    if (user.role !== 'operator') throw new ForbiddenException('Cutting output requires an assigned Line Operator');
    return this.db.withTransaction(async client => {
      const { rows: [scope] } = await client.query<{
        factory_id: string; assignment_id: string; unit_id: string; line_id: string;
        shift_type: string; status: string; quantity: number;
      }>(`
        SELECT f.id AS factory_id, a.id AS assignment_id, u.id AS unit_id, l.id AS line_id,
          a.shift_type, j.status, b.quantity
        FROM public.bundles b
        JOIN public.jobs j ON j.id = b.job_id
        JOIN public.factories f ON f.id = j.factory_id AND f.is_active
        JOIN public.production_lines l ON l.id = j.line_id AND l.factory_id = f.id AND l.is_active
        JOIN public.departments d ON d.id = l.department_id AND d.is_active
        JOIN public.units u ON u.id = d.unit_id AND u.factory_id = f.id AND u.is_active
        JOIN public.cutting_assignments c ON c.job_id = j.id AND c.is_active
        JOIN public.user_assignments a ON a.id = c.assignment_id AND a.is_active
          AND a.factory_id = f.id AND a.line_id = l.id AND a.department_id = d.id AND a.unit_id = u.id
        JOIN public.profiles p ON p.id = a.profile_id AND p.organization_id = f.organization_id
          AND p.role_code = 'operator' AND p.account_status = 'active'
        WHERE p.id = $1 AND f.organization_id = $2 AND b.id = $3 AND 'Cutting' = ANY(l.stages)
        ORDER BY a.is_primary DESC, a.id LIMIT 1 FOR UPDATE OF b, j
        FOR SHARE OF c, a, p`, [user.id, user.organizationId, input.bundleId]);
      if (!scope) throw new ForbiddenException('No active cutting assignment covers this bundle');

      const { rows: [previous] } = await client.query(`
        SELECT id, bundle_id AS "bundleId", quantity, created_at AS "createdAt"
        FROM public.cutting_output_events WHERE actor_id = $1 AND request_id = $2`,
        [user.id, input.requestId]);
      if (previous) {
        if (previous.bundleId !== input.bundleId || previous.quantity !== input.quantity) {
          throw new ConflictException('Request ID already belongs to another cutting entry');
        }
        return previous;
      }

      if (scope.status !== 'active') throw new ConflictException('Cutting output requires an active job');
      const { rows: [balance] } = await client.query(`
        SELECT COALESCE(SUM(quantity), 0) AS total FROM public.cutting_output_events WHERE bundle_id = $1`,
        [input.bundleId]);
      if (Number(balance.total) + input.quantity > scope.quantity) {
        throw new ConflictException('Cutting output exceeds the remaining bundle quantity');
      }
      const { rows: [event] } = await client.query(`
        INSERT INTO public.cutting_output_events
          (bundle_id, assignment_id, actor_id, producing_line_id, shift_type, request_id, quantity, client_occurred_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (actor_id, request_id) DO NOTHING
        RETURNING id, bundle_id AS "bundleId", quantity, created_at AS "createdAt"`,
        [input.bundleId, scope.assignment_id, user.id, scope.line_id, scope.shift_type, input.requestId, input.quantity, input.clientOccurredAt ?? null]);
      if (!event) throw new ConflictException('Request ID was used for another cutting entry');

      await this.audit.record({
        organizationId: user.organizationId, factoryId: scope.factory_id, unitId: scope.unit_id,
        actorId: user.id, actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
        action: 'CUTTING_OUTPUT_RECORDED', entityType: 'cutting_output', entityId: event.id,
        newValues: { bundleId: input.bundleId, producingLineId: scope.line_id, quantity: input.quantity, shift: scope.shift_type },
      }, client);
      return event;
    });
  }
}

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class CuttingOutputController {
  constructor(private readonly cutting: CuttingOutputService) {}

  @Post('cutting')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  record(@CurrentUser() user: AuthenticatedUser, @Body() body: CuttingOutputInput) {
    return this.cutting.record(user, body);
  }
}
