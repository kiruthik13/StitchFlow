import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ApproveEmployeeDto, ProvisionRosterDto, UpdateAccountStatusDto, UpdateRosterStatusDto } from './users.dto';

@Injectable()
export class UsersService {
  private readonly managedProfileScope = `
    p.organization_id = $1
    AND ($2::boolean OR (
      p.role_code NOT IN ('md', 'factory-manager')
      AND EXISTS (
        SELECT 1 FROM public.user_assignments ua
        WHERE ua.profile_id = p.id AND ua.is_active AND ua.factory_id = ANY($3::uuid[])
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_assignments ua
        WHERE ua.profile_id = p.id AND ua.is_active AND ua.factory_id <> ALL($3::uuid[])
      )
    ))`;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async listRoster(actor: AuthenticatedUser, factoryId?: string) {
    const res = await this.db.query(
      `SELECT ee.employee_id AS "employeeId", ee.email, ee.factory_id AS "factoryId",
              f.name AS "factoryName", ee.is_active AS "isActive",
              p.id AS "profileId", p.name AS "registeredName", p.role_code AS "roleCode",
              p.account_status AS "accountStatus"
       FROM public.employee_enrollment ee
       JOIN public.factories f ON f.id = ee.factory_id
       LEFT JOIN public.profiles p ON p.organization_id = ee.organization_id AND p.employee_id = ee.employee_id
       WHERE ee.organization_id = $1
         AND ($2::boolean OR ee.factory_id = ANY($3::uuid[]))
         AND ($4::uuid IS NULL OR ee.factory_id = $4)
       ORDER BY ee.employee_id ASC LIMIT 200`,
      [...this.scopeParams(actor), factoryId ?? null],
    );
    return res.rows;
  }

  async provisionRoster(actor: AuthenticatedUser, dto: ProvisionRosterDto) {
    const employeeId = dto.employeeId.trim();
    const email = dto.email.trim().toLowerCase();
    return this.db.withTransaction(async client => {
      const factory = await client.query(
        `SELECT 1 FROM public.factories f
         WHERE f.id = $1 AND f.organization_id = $2 AND f.is_active
           AND ($3::boolean OR f.id = ANY($4::uuid[]))`,
        [dto.factoryId, ...this.scopeParams(actor)],
      );
      if (!factory.rowCount) throw new ForbiddenException('Factory is outside your authorized scope');
      try {
        const { rows: [row] } = await client.query(
          `INSERT INTO public.employee_enrollment (organization_id, employee_id, factory_id, email, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING employee_id AS "employeeId", email, factory_id AS "factoryId", is_active AS "isActive"`,
          [actor.organizationId, employeeId, dto.factoryId, email],
        );
        await this.audit.record({
          organizationId: actor.organizationId,
          factoryId: dto.factoryId,
          actorId: actor.id,
          actorEmployeeId: actor.employeeId,
          actorName: actor.name,
          actorRole: actor.role,
          action: 'EMPLOYEE_ROSTER_PROVISIONED',
          entityType: 'employee_enrollment',
          entityId: employeeId,
          newValues: row,
          result: 'success',
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') {
          throw new ConflictException('Employee ID or email is already enrolled in this organization');
        }
        throw e;
      }
    });
  }

  async updateRosterStatus(actor: AuthenticatedUser, employeeId: string, dto: UpdateRosterStatusDto) {
    const normalizedId = employeeId.trim();
    return this.db.withTransaction(async client => {
      const existing = await client.query<{ factory_id: string; is_active: boolean; email: string }>(
        `SELECT ee.factory_id, ee.is_active, ee.email
         FROM public.employee_enrollment ee
         WHERE ee.organization_id = $1 AND ee.employee_id = $2
           AND ($3::boolean OR ee.factory_id = ANY($4::uuid[]))
         FOR UPDATE OF ee`,
        [actor.organizationId, normalizedId, actor.role === 'md', actor.assignedFactoryIds],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Roster entry not found');
      const { rows: [row] } = await client.query(
        `UPDATE public.employee_enrollment
         SET is_active = $1
         WHERE organization_id = $2 AND employee_id = $3
         RETURNING employee_id AS "employeeId", email, factory_id AS "factoryId", is_active AS "isActive"`,
        [dto.isActive, actor.organizationId, normalizedId],
      );
      await this.audit.record({
        organizationId: actor.organizationId,
        factoryId: prev.factory_id,
        actorId: actor.id,
        actorEmployeeId: actor.employeeId,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'EMPLOYEE_ROSTER_STATUS_UPDATED',
        entityType: 'employee_enrollment',
        entityId: normalizedId,
        previousValues: { isActive: prev.is_active },
        newValues: { isActive: dto.isActive },
        result: 'success',
      }, client);
      return row;
    });
  }

  async listUsers(actor: AuthenticatedUser) {
    const res = await this.db.query(
      `SELECT p.id, p.employee_id, p.name, p.email, p.designation, p.role_code, p.account_status,
              p.created_at, p.updated_at
       FROM public.profiles p
       WHERE ${this.managedProfileScope}
       ORDER BY p.created_at DESC`,
      this.scopeParams(actor),
    );
    return res.rows;
  }

  async approveEmployee(actor: AuthenticatedUser, targetId: string, dto: ApproveEmployeeDto) {
    this.rejectSelfManagement(actor, targetId);
    // Only MD may assign 'md' or 'factory-manager'
    if ((dto.role === 'md' || dto.role === 'factory-manager') && actor.role !== 'md') {
      throw new ForbiddenException({
        errorCode: 'ERR_PRIVILEGE_ESCALATION_DENIED',
        message: 'Only Managing Director can assign MD or Factory Manager roles',
      });
    }

    const nextRole = await this.db.withTransaction(async client => {
      const existing = await client.query<{ role_code: string; account_status: string; email: string }>(
        `SELECT p.role_code, p.account_status, p.email FROM public.profiles p
         WHERE ${this.managedProfileScope} AND p.id = $4 FOR UPDATE OF p`,
        [...this.scopeParams(actor), targetId],
      );
      const previous = existing.rows[0];
      if (!previous) throw new NotFoundException('Employee not found');
      if (previous.account_status !== 'pending') throw new ConflictException('Employee is no longer pending');
      if (dto.decision === 'active') await this.requireVerifiedEmail(targetId, previous.email);
      const role = dto.role ?? previous.role_code;

      if (dto.lineId && !dto.factoryId) {
        throw new ForbiddenException('A factory is required when assigning a line');
      }
      if (dto.factoryId) {
        const factory = await client.query(
          `SELECT 1 FROM public.factories f
           WHERE f.id = $1 AND f.organization_id = $2 AND f.is_active
             AND ($3::boolean OR f.id = ANY($4::uuid[]))
             AND ($5::uuid IS NULL OR EXISTS (
               SELECT 1 FROM public.production_lines pl
               JOIN public.departments d ON d.id = pl.department_id AND d.is_active
               JOIN public.units u ON u.id = d.unit_id AND u.factory_id = f.id AND u.is_active
               WHERE pl.id = $5 AND pl.factory_id = f.id AND pl.is_active
             ))`,
          [dto.factoryId, ...this.scopeParams(actor), dto.lineId ?? null],
        );
        if (!factory.rowCount) throw new ForbiddenException('Invalid factory or line assignment');
      }
      await client.query(
        `UPDATE public.profiles
         SET account_status = $1, role_code = $2, approved_by = $3, approved_at = NOW(),
             updated_by = $3, updated_at = NOW()
         WHERE id = $4`,
        [dto.decision, role, actor.id, targetId],
      );

      if (dto.factoryId) {
        await client.query(
          `UPDATE public.user_assignments
           SET factory_id = $1, line_id = $2, updated_at = NOW(),
               unit_id = (SELECT d.unit_id FROM public.production_lines pl JOIN public.departments d ON d.id = pl.department_id WHERE pl.id = $2),
               department_id = (SELECT pl.department_id FROM public.production_lines pl WHERE pl.id = $2),
               workstation_id = NULL
           WHERE profile_id = $3 AND is_primary = TRUE AND is_active`,
          [dto.factoryId, dto.lineId ?? null, targetId],
        );
      }
      await this.audit.record({
        organizationId: actor.organizationId,
        factoryId: dto.factoryId ?? actor.primaryFactoryId,
        actorId: actor.id,
        actorEmployeeId: actor.employeeId,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'USER_APPROVAL_DECISION',
        entityType: 'profile',
        entityId: targetId,
        previousValues: { accountStatus: previous.account_status, role: previous.role_code },
        newValues: { accountStatus: dto.decision, role },
        reason: dto.reason ?? null,
        result: 'success',
      }, client);
      return role;
    });

    await this.redis.invalidateUserAuthCache(targetId);
    return { id: targetId, accountStatus: dto.decision, role: nextRole };
  }

  async updateStatus(actor: AuthenticatedUser, targetId: string, dto: UpdateAccountStatusDto) {
    this.rejectSelfManagement(actor, targetId);
    await this.db.withTransaction(async client => {
      const existing = await client.query<{ account_status: string }>(
        `SELECT p.account_status FROM public.profiles p
         WHERE ${this.managedProfileScope} AND p.id = $4 FOR UPDATE OF p`,
        [...this.scopeParams(actor), targetId],
      );
      const previousStatus = existing.rows[0]?.account_status;
      if (!previousStatus) throw new NotFoundException('Employee not found');
      if (previousStatus !== 'active' && previousStatus !== 'suspended') {
        throw new ConflictException('Pending and rejected accounts require the approval workflow');
      }
      if (dto.status === previousStatus) return;
      if (dto.status === 'active') await this.requireVerifiedEmail(targetId);

      await client.query(
        `UPDATE public.profiles SET account_status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
        [dto.status, actor.id, targetId],
      );
      await this.audit.record({
        organizationId: actor.organizationId,
        factoryId: actor.primaryFactoryId,
        actorId: actor.id,
        actorEmployeeId: actor.employeeId,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'USER_STATUS_CHANGE',
        entityType: 'profile',
        entityId: targetId,
        previousValues: { accountStatus: previousStatus },
        newValues: { accountStatus: dto.status },
        reason: dto.reason ?? null,
        result: 'success',
      }, client);
    });

    await this.redis.invalidateUserAuthCache(targetId);
    return { id: targetId, accountStatus: dto.status };
  }

  private async requireVerifiedEmail(id: string, expectedEmail?: string) {
    const { data, error } = await this.db.getSupabaseAdmin().auth.admin.getUserById(id);
    if (error || !data.user?.email_confirmed_at || (expectedEmail && data.user.email?.toLowerCase() !== expectedEmail.toLowerCase())) {
      throw new ForbiddenException({ errorCode: 'ERR_EMAIL_UNVERIFIED', message: 'Employee email must be verified before activation' });
    }
  }

  private scopeParams(actor: AuthenticatedUser): [string, boolean, string[]] {
    return [actor.organizationId, actor.role === 'md', actor.assignedFactoryIds];
  }

  private rejectSelfManagement(actor: AuthenticatedUser, targetId: string) {
    if (actor.id === targetId) {
      throw new ForbiddenException('Employees cannot change their own account status or role');
    }
  }
}
