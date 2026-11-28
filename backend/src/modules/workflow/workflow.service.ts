import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AuthenticatedUser, RoleCode } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';
import { applyInspection, applyReinspection, QualityBalance } from './quality-balance';
import { BundleRequest, QualityDisposition, QualityReinspection, QuantityRequest, StageCompletion } from './workflow.dto';

interface BundleScope {
  id: string;
  quantity: number;
  job_id: string;
  factory_id: string;
  status: string;
}

type QualityAction = 'inspection' | 'reinspection' | 'rework' | 'release';
const emptyBalance: QualityBalance = { inspected: 0, passed: 0, rejected: 0, rework: 0, held: 0, reworked: 0, released: 0 };

@Injectable()
export class WorkflowService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async stages(user: AuthenticatedUser, bundleId: string) {
    const { rows } = await this.db.query(`
      SELECT s.id, s.ordinal, s.stage_code AS "stageCode", s.line_id AS "lineId", p.completed_at AS "completedAt",
        gen_random_uuid() AS "requestId", p.completed, p.available,
        j.status = 'active' AND p.available > 0 AS ready
      FROM public.bundles b JOIN public.jobs j ON j.id = b.job_id
      JOIN public.factories f ON f.id = j.factory_id
      JOIN public.job_route_steps s ON s.job_id = j.id
      JOIN public.bundle_route_progress p ON p.bundle_id = b.id AND p.step_id = s.id
      WHERE ${factoryScope} AND b.id = $4 AND (
        $5::boolean OR EXISTS (
          SELECT 1 FROM public.job_step_assignments w
          JOIN public.user_assignments a ON a.id = w.assignment_id
          WHERE w.step_id = s.id AND a.profile_id = $3 AND a.is_active AND a.factory_id = f.id
            AND a.line_id = s.line_id AND s.role_code = $6
        ))
      ORDER BY s.ordinal`, [...jobScopeParams(user), bundleId, user.role === 'factory-manager', user.role]);
    return rows;
  }

  async qualityStatus(user: AuthenticatedUser, id: string) {
    const duty = user.role === 'qc-inspector' ? 'qc'
      : user.role === 'packing-staff' ? 'packing' : user.role === 'operator' ? 'rework' : null;
    if (!duty) throw new ForbiddenException('No matching job duty');
    return this.db.withTransaction(async client => {
      const bundle = await this.lockBundle(client, user, id);
      await this.requireDuty(client, user, bundle, duty);
      const { rows: [progress] } = await client.query<{ ready: boolean; packed: string; pendingStages: string[] }>(`
        SELECT EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1)
          AND NOT EXISTS (
            SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1 AND NOT EXISTS (
              SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = $2 AND e.step_id = s.id AND e.completed_at IS NOT NULL
            )
          ) AS ready,
          (SELECT COALESCE(SUM(quantity), 0) FROM public.bundle_cartons WHERE bundle_id = $2) AS packed,
          ARRAY(
            SELECT s.stage_code FROM public.job_route_steps s
            WHERE s.job_id = $1 AND NOT EXISTS (
              SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = $2 AND e.step_id = s.id AND e.completed_at IS NOT NULL
            )
            ORDER BY s.ordinal ASC
          ) AS "pendingStages"`,
        [bundle.job_id, id]);
      const { rows: [request] } = await client.query<{ id: string }>('SELECT gen_random_uuid() AS id');
      return {
        ...await this.balance(client, id), duty, ready: progress.ready && bundle.status === 'active',
        pendingStages: progress.pendingStages ?? [],
        packed: Number(progress.packed), quantity: bundle.quantity, requestId: request.id,
      };
    });
  }

  async completeStage(user: AuthenticatedUser, input: StageCompletion) {
    return this.db.withTransaction(async client => {
      const bundle = await this.lockBundle(client, user, input.bundleId);
      const { rows: [step] } = await client.query<{ ordinal: number; stage_code: string; line_id: string; eligible: boolean }>(`
        SELECT s.ordinal, s.stage_code, s.line_id, EXISTS (
          SELECT 1 FROM public.job_step_assignments w
          JOIN public.user_assignments a ON a.id = w.assignment_id AND a.is_active
          JOIN public.production_lines l ON l.id = s.line_id AND l.factory_id = $5 AND l.is_active
          JOIN public.departments d ON d.id = l.department_id AND d.is_active
          JOIN public.units u ON u.id = d.unit_id AND u.factory_id = l.factory_id AND u.is_active
          WHERE w.step_id = s.id AND a.profile_id = $3 AND a.factory_id = l.factory_id
            AND a.line_id = l.id AND a.department_id = d.id AND a.unit_id = u.id AND s.role_code = $4
        ) AS eligible FROM public.job_route_steps s WHERE s.job_id = $1 AND s.id = $2`,
        [bundle.job_id, input.stepId, user.id, user.role, bundle.factory_id]);
      if (!step?.eligible) throw new ForbiddenException('No active work assignment for this route step');

      const { rows: [previous] } = await client.query(
        'SELECT * FROM public.bundle_stage_events WHERE actor_id = $1 AND request_id = $2', [user.id, input.requestId],
      );
      const quantity = input.quantity ?? bundle.quantity;
      if (previous) {
        if (previous.bundle_id !== bundle.id || previous.step_id !== input.stepId || previous.quantity !== quantity) {
          throw new ConflictException('Request ID already refers to a different stage completion');
        }
        return previous;
      }

      this.requireActive(bundle);
      const { rows: [progress] } = await client.query<{ available: number }>(
        'SELECT available FROM public.bundle_route_progress WHERE bundle_id = $1 AND step_id = $2', [bundle.id, input.stepId],
      );
      if (!progress || progress.available < quantity) {
        throw new ConflictException('Output exceeds the confirmed quantity available at this route step');
      }
      const { rows: [event] } = await client.query(`
        INSERT INTO public.bundle_stage_events (bundle_id, step_id, actor_id, request_id, quantity, client_occurred_at)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING *`,
        [bundle.id, input.stepId, user.id, input.requestId, quantity, input.clientOccurredAt ?? null]);
      if (!event) throw new ConflictException('Step or request has already been recorded');
      await this.record(client, user, bundle, 'STAGE_COMPLETED', { stepId: input.stepId, stageCode: step.stage_code, quantity });
      return event;
    });
  }

  inspect(user: AuthenticatedUser, input: QualityDisposition) {
    const { passed, rejected, rework, held } = input;
    return this.quality(user, input, 'inspection', { passed, rejected, rework, held },
      (balance, quantity) => applyInspection(balance, quantity, input));
  }

  reinspect(user: AuthenticatedUser, input: QualityReinspection) {
    const { passed, rejected, rework, held, fromRework, fromHold } = input;
    return this.quality(user, input, 'reinspection', { passed, rejected, rework, held, fromRework, fromHold },
      balance => applyReinspection(balance, input));
  }

  rework(user: AuthenticatedUser, input: QuantityRequest) {
    return this.quality(user, input, 'rework', { quantity: input.quantity }, balance => {
      if (balance.reworked + input.quantity > balance.rework) throw new ConflictException('Quantity exceeds unfinished rework');
      return { ...balance, reworked: balance.reworked + input.quantity };
    });
  }

  release(user: AuthenticatedUser, input: QuantityRequest) {
    return this.quality(user, input, 'release', { quantity: input.quantity }, balance => {
      if (balance.released + input.quantity > balance.passed) throw new ConflictException('Release exceeds passed quantity');
      return { ...balance, released: balance.released + input.quantity };
    });
  }

  private async quality(user: AuthenticatedUser, input: BundleRequest, action: QualityAction,
    payload: Record<string, number>, update: (balance: QualityBalance, quantity: number) => QualityBalance) {
    this.requireRole(user, action === 'rework' ? 'operator' : 'qc-inspector');
    return this.db.withTransaction(async client => {
      const bundle = await this.lockBundle(client, user, input.bundleId);
      await this.requireDuty(client, user, bundle, action === 'rework' ? 'rework' : 'qc');
      const { rows: [previous] } = await client.query<{ id: string; matches: boolean }>(`
        SELECT id, bundle_id = $3 AND action = $4 AND payload = $5::jsonb AS matches
        FROM public.bundle_quality_events WHERE actor_id = $1 AND request_id = $2`,
        [user.id, input.requestId, bundle.id, action, JSON.stringify(payload)]);
      if (previous) {
        if (!previous.matches) throw new ConflictException('Request ID already refers to a different quality event');
        return { eventId: previous.id, balance: await this.balance(client, bundle.id) };
      }
      this.requireActive(bundle);
      const { rows: [route] } = await client.query<{ ready: boolean }>(`
        SELECT EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1)
          AND NOT EXISTS (
            SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1 AND NOT EXISTS (
              SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = $2 AND e.step_id = s.id AND e.completed_at IS NOT NULL
            )
          ) AS ready`, [bundle.job_id, bundle.id]);
      if (!route.ready) throw new ConflictException('Production route has not reached the QC checkpoint');

      const next = update(await this.balance(client, bundle.id), bundle.quantity);
      const { rows: [event] } = await client.query<{ id: string }>(`
        INSERT INTO public.bundle_quality_events (bundle_id, actor_id, request_id, action, payload)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
        [bundle.id, user.id, input.requestId, action, JSON.stringify(payload)]);
      if (!event) throw new ConflictException('Request ID has already been used');
      await client.query(`
        INSERT INTO public.bundle_quality_balances (bundle_id, inspected, passed, rejected, rework, held, reworked, released)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (bundle_id) DO UPDATE SET inspected = EXCLUDED.inspected, passed = EXCLUDED.passed,
          rejected = EXCLUDED.rejected, rework = EXCLUDED.rework, held = EXCLUDED.held,
          reworked = EXCLUDED.reworked, released = EXCLUDED.released`,
        [bundle.id, next.inspected, next.passed, next.rejected, next.rework, next.held, next.reworked, next.released]);
      await this.record(client, user, bundle, 'QUALITY_' + action.toUpperCase(), { ...payload, qualityEventId: event.id });
      return { eventId: event.id, balance: next };
    });
  }

  async pack(user: AuthenticatedUser, input: QuantityRequest) {
    this.requireRole(user, 'packing-staff');
    return this.db.withTransaction(async client => {
      const bundle = await this.lockBundle(client, user, input.bundleId);
      await this.requireDuty(client, user, bundle, 'packing');
      const { rows: [old] } = await client.query(
        'SELECT * FROM public.bundle_cartons WHERE actor_id = $1 AND request_id = $2', [user.id, input.requestId],
      );
      if (old) {
        if (old.bundle_id !== bundle.id || old.quantity !== input.quantity) throw new ConflictException('Carton request was already used');
        return old;
      }
      this.requireActive(bundle);
      const { released } = await this.balance(client, bundle.id);
      const { rows: [packed] } = await client.query<{ total: string }>(
        'SELECT COALESCE(SUM(quantity), 0) AS total FROM public.bundle_cartons WHERE bundle_id = $1', [bundle.id],
      );
      if (Number(packed.total) + input.quantity > released) throw new ConflictException('Packing exceeds remaining QC-released quantity');
      const { rows: [carton] } = await client.query(`
        INSERT INTO public.bundle_cartons (bundle_id, quantity, actor_id, request_id)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`,
        [bundle.id, input.quantity, user.id, input.requestId]);
      if (!carton) throw new ConflictException('Carton request was already used');
      await this.record(client, user, bundle, 'CARTON_PACKED', { cartonId: carton.id, quantity: input.quantity });
      return carton;
    });
  }

  async cartons(user: AuthenticatedUser, factoryId: string, after?: string) {
    const { rows } = await this.db.query(`
      SELECT c.id, c.barcode, c.quantity, c.created_at AS "createdAt",
        j.job_code AS "jobCode", s.name AS "styleName", bu.name AS "buyerName", f.name AS "factoryName",
        b.barcode AS "bundleCode", b.size, b.color, p.name AS "packedByName",
        gen_random_uuid() AS "requestId", r.received_at AS "receivedAt", d.approved_at AS "approvedAt",
        d.dispatched_at AS "dispatchedAt", d.gate_pass AS "gatePass", mc.manifest_id AS "manifestId"
      FROM public.bundle_cartons c JOIN public.bundles b ON b.id = c.bundle_id
      JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
      LEFT JOIN public.garment_styles s ON s.id = j.style_id
      LEFT JOIN public.buyers bu ON bu.id = j.buyer_id
      LEFT JOIN public.profiles p ON p.id = c.actor_id
      LEFT JOIN public.carton_store_receipts r ON r.carton_id = c.id
      LEFT JOIN public.carton_dispatch d ON d.carton_id = c.id
      LEFT JOIN public.shipment_manifest_cartons mc ON mc.carton_id = c.id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR c.id > $5)
      ORDER BY c.id LIMIT 100`, [...jobScopeParams(user), factoryId, after ?? null]);
    return rows;
  }

  async receiveCarton(user: AuthenticatedUser, cartonId: string) {
    this.requireRole(user, 'store-dispatch');
    return this.db.withTransaction(async client => {
      const bundle = await this.lockCartonBundle(client, user, cartonId);
      const { rows: [old] } = await client.query(
        'SELECT * FROM public.carton_store_receipts WHERE carton_id = $1', [cartonId],
      );
      if (old) return old;
      this.requireActive(bundle);
      const { rows: [receipt] } = await client.query(`
        INSERT INTO public.carton_store_receipts (carton_id, received_by)
        VALUES ($1,$2) RETURNING *`, [cartonId, user.id]);
      await this.record(client, user, bundle, 'CARTON_RECEIVED_BY_STORE', { cartonId });
      return receipt;
    });
  }

  async dispatch(user: AuthenticatedUser, cartonId: string, execute: boolean) {
    this.requireRole(user, execute ? 'store-dispatch' : 'factory-manager');
    return this.db.withTransaction(async client => {
      const bundle = await this.lockCartonBundle(client, user, cartonId);
      const { rowCount: inManifest } = await client.query(
        'SELECT 1 FROM public.shipment_manifest_cartons WHERE carton_id = $1', [cartonId],
      );
      if (inManifest) throw new ConflictException('Use the shipment manifest to dispatch this carton');
      const { rows: [current] } = await client.query(
        'SELECT * FROM public.carton_dispatch WHERE carton_id = $1 FOR UPDATE', [cartonId],
      );
      if (!execute && current) return current;
      if (execute && current?.dispatched_at) return current;
      this.requireActive(bundle);
      const { rowCount: storeConfirmed } = await client.query(
        'SELECT 1 FROM public.carton_store_receipts WHERE carton_id = $1', [cartonId],
      );
      if (!storeConfirmed) throw new ConflictException('Store must receive the carton before dispatch');
      if (execute && (!current || current.approved_by === user.id)) {
        throw new ConflictException('Dispatch requires prior approval by another employee');
      }
      const { rows: [result] } = execute
        ? await client.query(`
            UPDATE public.carton_dispatch
            SET dispatched_by = $2, dispatched_at = now(), gate_pass = gen_random_uuid()
            WHERE carton_id = $1 RETURNING *`, [cartonId, user.id])
        : await client.query(`
            INSERT INTO public.carton_dispatch(carton_id, approved_by) VALUES ($1,$2) RETURNING *`,
          [cartonId, user.id]);
      await this.record(client, user, bundle, execute ? 'CARTON_DISPATCHED' : 'CARTON_DISPATCH_APPROVED',
        { cartonId, gatePass: result.gate_pass });
      return result;
    });
  }

  private async lockCartonBundle(client: PoolClient, user: AuthenticatedUser, cartonId: string) {
    const { rows: [carton] } = await client.query<{ bundle_id: string }>(`
      SELECT c.bundle_id FROM public.bundle_cartons c JOIN public.bundles b ON b.id = c.bundle_id
      JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND c.id = $4`, [...jobScopeParams(user), cartonId]);
    if (!carton) throw new NotFoundException('Carton not found');
    return this.lockBundle(client, user, carton.bundle_id);
  }

  private async lockBundle(client: PoolClient, user: AuthenticatedUser, id: string) {
    const { rows: [bundle] } = await client.query<BundleScope>(`
      SELECT b.id, b.quantity, j.id AS job_id, j.status, f.id AS factory_id
      FROM public.bundles b JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND b.id = $4 FOR UPDATE OF b, j`, [...jobScopeParams(user), id]);
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  private async requireDuty(client: PoolClient, user: AuthenticatedUser, bundle: BundleScope, duty: 'qc' | 'rework' | 'packing') {
    const { rowCount } = await client.query(`
      SELECT 1 FROM public.job_quality_assignments w
      JOIN public.user_assignments a ON a.id = w.assignment_id
      JOIN public.units u ON u.id = a.unit_id AND u.factory_id = a.factory_id AND u.is_active
      JOIN public.departments d ON d.id = a.department_id AND d.unit_id = u.id AND d.is_active
      JOIN public.production_lines l ON l.id = a.line_id AND l.factory_id = a.factory_id AND l.department_id = d.id AND l.is_active
      WHERE w.job_id = $1 AND a.profile_id = $2 AND a.factory_id = $3 AND a.is_active AND w.duty = $4`,
      [bundle.job_id, user.id, bundle.factory_id, duty]);
    if (!rowCount) throw new ForbiddenException('An active job assignment is required');
  }

  private async balance(client: PoolClient, bundleId: string): Promise<QualityBalance> {
    const { rows: [balance] } = await client.query<QualityBalance>(`
      SELECT inspected, passed, rejected, rework, held, reworked, released
      FROM public.bundle_quality_balances WHERE bundle_id = $1`, [bundleId]);
    return balance ?? emptyBalance;
  }

  private requireActive(bundle: BundleScope) {
    if (bundle.status !== 'active') throw new ConflictException('The job must be active');
  }

  private requireRole(user: AuthenticatedUser, role: RoleCode) {
    if (user.role !== role) throw new ForbiddenException('The employee role cannot perform this action');
  }

  private record(client: PoolClient, user: AuthenticatedUser, bundle: BundleScope, action: string, newValues: Record<string, unknown>) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId: bundle.factory_id, actorId: user.id,
      actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
      action, entityType: 'bundle', entityId: bundle.id, newValues,
    }, client);
  }
}
