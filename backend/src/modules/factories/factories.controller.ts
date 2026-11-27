import { BadRequestException, Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { FactoryScopeGuard } from '../../common/guards/factory-scope.guard';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('Factories')
@ApiBearerAuth()
@Controller('factories')
@UseGuards(FactoryScopeGuard)
export class FactoriesController {
  constructor(private readonly db: DatabaseService) {}

  private assertUuid(value: string, label = 'id') {
    if (!UUID_RE.test(value)) {
      throw new BadRequestException({ errorCode: 'ERR_VALIDATION_FAILED', message: [`${label} must be a UUID`] });
    }
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const canViewAll = user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES');
    if (!canViewAll && user.assignedFactoryIds.length === 0) return [];

    const res = await this.db.query(
      `SELECT f.id,
              f.organization_id AS "organizationId",
              f.code,
              f.name,
              f.location,
              f.total_lines AS "totalLines",
              f.active_lines AS "activeLines",
              f.capacity,
              (SELECT COUNT(*)::int FROM public.units u WHERE u.factory_id = f.id AND u.is_active) AS "unitsCount",
              (SELECT COUNT(*)::int FROM public.jobs j WHERE j.factory_id = f.id AND j.status = 'active') AS "activeJobsCount",
              (SELECT COALESCE(SUM(j.order_quantity), 0)::int FROM public.jobs j WHERE j.factory_id = f.id AND j.status <> 'cancelled') AS "orderedQty",
              (SELECT COALESCE(SUM(c.quantity), 0)::int FROM public.cutting_output_events c JOIN public.bundles b ON b.id = c.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = f.id) AS "cutQty",
              (SELECT COALESCE(SUM(bc.quantity), 0)::int FROM public.bundle_cartons bc JOIN public.bundles b ON b.id = bc.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = f.id) AS "packedQty",
              (SELECT COUNT(*)::int FROM public.production_issues pi WHERE pi.factory_id = f.id AND pi.resolved_at IS NULL) AS "openIssuesCount"
       FROM public.factories f
       WHERE f.organization_id = $1
         AND f.is_active = TRUE
         AND ($2::boolean OR f.id = ANY($3::uuid[]))
       ORDER BY f.name ASC`,
      [user.organizationId, canViewAll, user.assignedFactoryIds],
    );
    return res.rows;
  }

  @Get(':id/hierarchy')
  async getHierarchy(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.assertUuid(id, 'factoryId');
    const canViewAll = user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES');

    const factoryRes = await this.db.query(
      `SELECT f.id,
              f.code,
              f.name,
              f.location,
              f.total_lines AS "totalLines",
              f.active_lines AS "activeLines",
              f.capacity,
              (SELECT p.name FROM public.user_assignments ua JOIN public.profiles p ON p.id = ua.profile_id
               WHERE ua.factory_id = f.id AND ua.is_active AND p.role_code = 'factory-manager' LIMIT 1) AS "managerName"
       FROM public.factories f
       WHERE f.id = $1 AND f.organization_id = $2 AND f.is_active AND ($3::boolean OR f.id = ANY($4::uuid[]))`,
      [id, user.organizationId, canViewAll, user.assignedFactoryIds],
    );
    if (factoryRes.rows.length === 0) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Factory not found' });
    }

    const [unitsRes, deptsRes, linesRes, metricsRes, workforceRes] = await Promise.all([
      this.db.query(
        `SELECT u.id, u.code, u.name, u.is_active AS "isActive",
                (SELECT COUNT(*)::int FROM public.departments d WHERE d.unit_id = u.id AND d.is_active) AS "departmentsCount",
                (SELECT COUNT(*)::int FROM public.production_lines l WHERE l.factory_id = u.factory_id AND l.department_id IN (SELECT d2.id FROM public.departments d2 WHERE d2.unit_id = u.id) AND l.is_active) AS "linesCount"
         FROM public.units u
         WHERE u.factory_id = $1 AND u.is_active = TRUE
         ORDER BY u.name`,
        [id],
      ),
      this.db.query(
        `SELECT d.id, d.unit_id AS "unitId", d.code, d.name, d.is_active AS "isActive"
         FROM public.departments d
         JOIN public.units u ON u.id = d.unit_id
         WHERE u.factory_id = $1 AND d.is_active = TRUE
         ORDER BY d.name`,
        [id],
      ),
      this.db.query(
        `SELECT l.id, l.department_id AS "departmentId", l.code, l.name, l.capacity, l.stages, l.is_active AS "isActive",
                (SELECT COUNT(*)::int FROM public.jobs j WHERE j.line_id = l.id AND j.status = 'active') AS "activeJobsCount",
                (SELECT COALESCE(SUM(j.order_quantity), 0)::int FROM public.jobs j WHERE j.line_id = l.id AND j.status <> 'cancelled') AS "targetQty"
         FROM public.production_lines l
         WHERE l.factory_id = $1
         ORDER BY l.name`,
        [id],
      ),
      this.db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM public.jobs j WHERE j.factory_id = $1) AS jobs,
           (SELECT COUNT(*)::int FROM public.jobs j WHERE j.factory_id = $1 AND j.status = 'active') AS "activeJobs",
           (SELECT COALESCE(SUM(j.order_quantity), 0)::int FROM public.jobs j WHERE j.factory_id = $1 AND j.status <> 'cancelled') AS ordered,
           (SELECT COALESCE(SUM(c.quantity), 0)::int FROM public.cutting_output_events c JOIN public.bundles b ON b.id = c.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS cut,
           (SELECT COALESCE(SUM(q.inspected), 0)::int FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS inspected,
           (SELECT COALESCE(SUM(q.passed), 0)::int FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS passed,
           (SELECT COALESCE(SUM(q.rework), 0)::int FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS rework,
           (SELECT COALESCE(SUM(q.rejected), 0)::int FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS rejected,
           (SELECT COALESCE(SUM(q.released), 0)::int FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS released,
           (SELECT COALESCE(SUM(bc.quantity), 0)::int FROM public.bundle_cartons bc JOIN public.bundles b ON b.id = bc.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1) AS packed,
           (SELECT COALESCE(SUM(bc.quantity), 0)::int FROM public.carton_dispatch cd JOIN public.bundle_cartons bc ON bc.id = cd.carton_id JOIN public.bundles b ON b.id = bc.bundle_id JOIN public.jobs j ON j.id = b.job_id WHERE j.factory_id = $1 AND cd.dispatched_at IS NOT NULL) AS dispatched,
           (SELECT COUNT(*)::int FROM public.production_issues pi WHERE pi.factory_id = $1 AND pi.resolved_at IS NULL) AS "openIssues"`,
        [id],
      ),
      this.db.query(
        `SELECT p.id, p.employee_id AS "employeeId", p.name, p.role_code AS "roleCode",
                p.account_status AS "accountStatus", ua.unit_id AS "unitId",
                ua.department_id AS "departmentId", ua.line_id AS "lineId"
         FROM public.user_assignments ua
         JOIN public.profiles p ON p.id = ua.profile_id
         WHERE ua.factory_id = $1 AND ua.is_active = TRUE
         ORDER BY p.role_code, p.name`,
        [id],
      ),
    ]);

    return {
      factory: factoryRes.rows[0],
      units: unitsRes.rows,
      departments: deptsRes.rows,
      lines: linesRes.rows,
      metrics: metricsRes.rows[0],
      workforce: workforceRes.rows,
    };
  }

  @Get(':id/lines/:lineId')
  async getLineDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    this.assertUuid(id, 'factoryId');
    this.assertUuid(lineId, 'lineId');
    const canViewAll = user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES');

    const lineRes = await this.db.query(
      `SELECT l.id, l.factory_id AS "factoryId", l.department_id AS "departmentId",
              l.code, l.name, l.capacity, l.stages, l.is_active AS "isActive",
              f.name AS "factoryName", d.name AS "departmentName"
       FROM public.production_lines l
       JOIN public.factories f ON f.id = l.factory_id
       LEFT JOIN public.departments d ON d.id = l.department_id
       WHERE l.id = $1 AND l.factory_id = $2 AND f.organization_id = $3
         AND ($4::boolean OR f.id = ANY($5::uuid[]))`,
      [lineId, id, user.organizationId, canViewAll, user.assignedFactoryIds],
    );
    if (lineRes.rows.length === 0) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Production line not found' });
    }

    const [jobsRes, staffRes, issuesRes] = await Promise.all([
      this.db.query(
        `SELECT j.id, j.job_code AS "jobCode", j.order_quantity AS "orderQuantity", j.status,
                j.target_date AS "targetDate", b.name AS "buyerName", s.name AS "styleName"
         FROM public.jobs j
         LEFT JOIN public.buyers b ON b.id = j.buyer_id
         LEFT JOIN public.garment_styles s ON s.id = j.style_id
         WHERE j.line_id = $1 AND j.factory_id = $2
         ORDER BY j.target_date DESC LIMIT 20`,
        [lineId, id],
      ),
      this.db.query(
        `SELECT p.id, p.employee_id AS "employeeId", p.name, p.role_code AS "roleCode"
         FROM public.user_assignments ua
         JOIN public.profiles p ON p.id = ua.profile_id
         WHERE ua.line_id = $1 AND ua.factory_id = $2 AND ua.is_active = TRUE
         ORDER BY p.role_code, p.name`,
        [lineId, id],
      ),
      this.db.query(
        `SELECT id, category, machine_code AS "machineCode", stoppage_minutes AS "stoppageMinutes",
                description, created_at AS "createdAt", resolved_at AS "resolvedAt"
         FROM public.production_issues
         WHERE factory_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [id],
      ),
    ]);

    return {
      line: lineRes.rows[0],
      jobs: jobsRes.rows,
      staff: staffRes.rows,
      issues: issuesRes.rows,
    };
  }
}
