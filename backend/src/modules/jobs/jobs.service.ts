import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { FactoryQuery, JobInput, JobListQuery, JobStatusInput, MasterInput, MasterKind, MasterUpdateInput, masterTables } from './jobs.dto';

const jobProjection = `
  SELECT j.id, j.job_code AS "jobCode", j.factory_id AS "factoryId",
    f.name AS "factoryName", j.buyer_id AS "buyerId", b.name AS "buyerName",
    j.style_id AS "styleId", s.name AS "styleName", j.line_id AS "lineId",
    l.name AS "lineName", j.order_quantity AS "orderQuantity", j.status,
    j.start_date::text AS "startDate", j.target_date::text AS "targetDate", j.colors, j.sizes,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('size', v.size, 'color', v.color, 'quantity', v.quantity)
      ORDER BY v.size, v.color) FROM public.job_items v WHERE v.job_id = j.id), '[]'::jsonb) AS items,
    COALESCE((SELECT SUM(e.quantity) FROM public.cutting_output_events e JOIN public.bundles cb ON cb.id = e.bundle_id WHERE cb.job_id = j.id), 0)::integer AS "cuttingQty", COALESCE((SELECT SUM(e.quantity) FROM public.bundle_stage_events e
      JOIN public.bundles sb ON sb.id = e.bundle_id JOIN public.job_route_steps s ON s.id = e.step_id
      WHERE sb.job_id = j.id AND s.stage_code = 'sewing-out'
        AND NOT EXISTS (SELECT 1 FROM public.job_route_steps earlier
          WHERE earlier.job_id = j.id AND earlier.stage_code = 'sewing-out' AND earlier.ordinal < s.ordinal)), 0)::integer AS "sewingOutQty",
    COALESCE((SELECT SUM(c.quantity) FROM public.bundle_cartons c JOIN public.bundles pb ON pb.id = c.bundle_id
      WHERE pb.job_id = j.id), 0)::integer AS "packingQty",
    COALESCE((SELECT SUM(q.rework) FROM public.bundle_quality_balances q JOIN public.bundles qb ON qb.id = q.bundle_id
      WHERE qb.job_id = j.id), 0)::integer AS "reworkQty",
    COALESCE((SELECT SUM(q.rejected) FROM public.bundle_quality_balances q JOIN public.bundles qb ON qb.id = q.bundle_id
      WHERE qb.job_id = j.id), 0)::integer AS "rejectedQty",
    COALESCE((SELECT SUM(qb.quantity - COALESCE(q.inspected, 0) + COALESCE(q.reworked, 0) + COALESCE(q.held, 0))
      FROM public.bundles qb LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = qb.id WHERE qb.job_id = j.id
        AND EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = j.id)
        AND NOT EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = j.id AND NOT EXISTS (
          SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = qb.id AND e.step_id = s.id AND e.completed_at IS NOT NULL))), 0)::integer AS "pendingQcQty", 0 AS efficiency, 0 AS "samValue"
  FROM public.jobs j
  JOIN public.factories f ON f.id = j.factory_id
  JOIN public.buyers b ON b.id = j.buyer_id AND b.factory_id = j.factory_id
  JOIN public.garment_styles s ON s.id = j.style_id AND s.factory_id = j.factory_id
  JOIN public.production_lines l ON l.id = j.line_id AND l.factory_id = j.factory_id`;

export const factoryScope = `
  f.organization_id = $1 AND f.is_active
  AND ($2::boolean OR EXISTS (
    SELECT 1 FROM public.user_assignments ua
    WHERE ua.profile_id = $3 AND ua.factory_id = f.id AND ua.is_active
  ))`;

export const jobReadScope = `
  ${factoryScope}
  AND EXISTS (
    SELECT 1 FROM public.profiles viewer
    WHERE viewer.id = $3 AND viewer.organization_id = f.organization_id AND viewer.account_status = 'active'
      AND (
        viewer.role_code NOT IN ('operator', 'supervisor')
        OR EXISTS (
          SELECT 1 FROM public.user_assignments a
          WHERE a.profile_id = viewer.id AND a.factory_id = f.id AND a.is_active
            AND (
              (a.line_id = j.line_id AND (viewer.role_code = 'supervisor' OR EXISTS (
                SELECT 1 FROM public.cutting_assignments c
                WHERE c.job_id = j.id AND c.assignment_id = a.id AND c.is_active
              )))
              OR EXISTS (
                SELECT 1 FROM public.job_step_assignments w JOIN public.job_route_steps s ON s.id = w.step_id
                WHERE s.job_id = j.id AND w.assignment_id = a.id AND s.line_id = a.line_id
                  AND s.role_code = viewer.role_code
              )
              OR EXISTS (
                SELECT 1 FROM public.job_quality_assignments w
                WHERE w.job_id = j.id AND w.assignment_id = a.id AND w.duty = 'rework' AND viewer.role_code = 'operator'
              )
            )
        )
      )
  )`;

export function jobScopeParams(user: AuthenticatedUser) {
  return [user.organizationId, user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES'), user.id];
}

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  async list(user: AuthenticatedUser, query: JobListQuery) {
    return (await this.db.query(`${jobProjection}
      WHERE ${jobReadScope} AND ($4::uuid IS NULL OR f.id = $4) AND ($5::uuid IS NULL OR j.id > $5)
      ORDER BY j.id LIMIT 100`, [...jobScopeParams(user), query.factoryId ?? null, query.after ?? null])).rows;
  }

  async get(user: AuthenticatedUser, id: string) {
    const result = await this.db.query(`${jobProjection} WHERE ${jobReadScope} AND j.id = $4`, [...jobScopeParams(user), id]);
    if (!result.rows[0]) throw new NotFoundException('Job not found');
    return result.rows[0];
  }

  async listMasters(user: AuthenticatedUser, kind: MasterKind, query: FactoryQuery) {
    return (await this.db.query(`
      SELECT m.id, m.code, m.name, m.factory_id AS "factoryId", m.is_active AS "isActive"
      FROM public.${masterTables[kind]} m JOIN public.factories f ON f.id = m.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR m.id > $5)
      ORDER BY m.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null])).rows;
  }

  async createMaster(user: AuthenticatedUser, kind: MasterKind, input: MasterInput) {
    return this.db.withTransaction(async client => {
      const { rows } = await client.query(`
        INSERT INTO public.${masterTables[kind]} (factory_id, code, name)
        SELECT f.id, $5, $6 FROM public.factories f WHERE ${factoryScope} AND f.id = $4
        ON CONFLICT (factory_id, code) DO NOTHING
        RETURNING id, code, name, factory_id AS "factoryId", is_active AS "isActive"`,
        [...jobScopeParams(user), input.factoryId, input.code.trim(), input.name.trim()]);
      if (!rows[0]) throw new ConflictException('Factory unavailable or master code already exists');
      await this.audit(client, user, input.factoryId, 'MASTER_CREATED', kind, rows[0].id);
      return rows[0];
    });
  }

  async updateMaster(user: AuthenticatedUser, kind: MasterKind, id: string, input: MasterUpdateInput) {
    return this.db.withTransaction(async client => {
      try {
        const { rows: [record] } = await client.query(`
          UPDATE public.${masterTables[kind]} m SET code = $6, name = $7, is_active = COALESCE($8::boolean, m.is_active)
          FROM public.factories f WHERE ${factoryScope} AND f.id = $4 AND m.factory_id = f.id AND m.id = $5
          RETURNING m.id, m.code, m.name, m.factory_id AS "factoryId", m.is_active AS "isActive"`,
          [...jobScopeParams(user), input.factoryId, id, input.code.trim(), input.name.trim(), input.isActive ?? null]);
        if (!record) throw new NotFoundException('Master record not found');
        await this.audit(client, user, input.factoryId, 'MASTER_UPDATED', kind, id);
        return record;
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('Master code already exists');
        throw error;
      }
    });
  }

  async create(user: AuthenticatedUser, input: JobInput) {
    if (input.targetDate < input.startDate) throw new BadRequestException('Target date precedes start date');
    const sizes = input.sizes.map(value => value.trim());
    const colors = input.colors.map(value => value.trim());
    const items = input.items?.map(({ size, color, quantity }) => ({ size: size.trim(), color: color.trim(), quantity }));
    if (items) {
      const unique = new Set(items.map(item => JSON.stringify([item.size, item.color])));
      if (unique.size !== items.length || items.some(item => !sizes.includes(item.size) || !colors.includes(item.color))
        || items.reduce((sum, item) => sum + item.quantity, 0) !== input.orderQuantity) {
        throw new BadRequestException({
          errorCode: 'ERR_JOB_VARIANTS', message: 'Unique size and color quantities must match the order total',
        });
      }
    }
    return this.db.withTransaction(async client => {
      const { rows } = await client.query(`
        INSERT INTO public.jobs (factory_id, buyer_id, style_id, line_id, job_code, order_quantity, start_date, target_date, colors, sizes)
        SELECT f.id, b.id, s.id, l.id, $8, $9, $10, $11, $12, $13
        FROM public.factories f
        JOIN public.buyers b ON b.factory_id = f.id AND b.id = $5 AND b.is_active
        JOIN public.garment_styles s ON s.factory_id = f.id AND s.id = $6 AND s.is_active
        JOIN public.production_lines l ON l.factory_id = f.id AND l.id = $7 AND l.is_active
        WHERE ${factoryScope} AND f.id = $4
        ON CONFLICT (factory_id, job_code) DO NOTHING RETURNING id`,
        [...jobScopeParams(user), input.factoryId, input.buyerId, input.styleId, input.lineId,
          input.jobCode.trim(), input.orderQuantity, input.startDate, input.targetDate,
          colors, sizes]);
      if (!rows[0]) throw new ConflictException('Job code already exists or factory and master selection is unavailable');
      if (items) {
        await client.query(`
          INSERT INTO public.job_items (job_id, size, color, quantity)
          SELECT $1, v.size, v.color, v.quantity
          FROM jsonb_to_recordset($2::jsonb) AS v(size text, color text, quantity integer)`,
          [rows[0].id, JSON.stringify(items)]);
      }
      await this.audit(client, user, input.factoryId, 'JOB_CREATED', 'job', rows[0].id);
      return (await client.query(`${jobProjection} WHERE j.id = $1`, [rows[0].id])).rows[0];
    });
  }

  async changeStatus(user: AuthenticatedUser, id: string, next: JobStatusInput['status']) {
    return this.db.withTransaction(async client => {
      const { rows } = await client.query(`${jobProjection}
        WHERE ${factoryScope} AND j.id = $4 FOR UPDATE OF j`, [...jobScopeParams(user), id]);
      const job = rows[0];
      if (!job) throw new NotFoundException('Job not found');
      if (job.status === next) return job;
      const allowed = (next === 'active' && job.status === 'on-hold')
        || (next === 'on-hold' && job.status === 'active')
        || (next === 'cancelled' && job.status === 'draft');
      if (!allowed) throw new ConflictException('Invalid job status transition');
      await client.query('UPDATE public.jobs SET status = $2 WHERE id = $1', [id, next]);
      await this.audit(client, user, job.factoryId, 'JOB_STATUS_CHANGED', 'job', id, job.status, next);
      return { ...job, status: next };
    });
  }

  private async audit(client: PoolClient, user: AuthenticatedUser, factoryId: string,
    action: string, entity: string, id: string, previous?: string, next?: string) {
    await client.query(`
      INSERT INTO public.audit_logs (organization_id, factory_id, actor_id, actor_employee_id,
        actor_name, actor_role, action, entity_type, entity_id, previous_values, new_values)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [user.organizationId, factoryId, user.id, user.employeeId, user.name, user.role, action, entity, id,
        previous ? JSON.stringify({ status: previous }) : null, next ? JSON.stringify({ status: next }) : null]);
  }
}
