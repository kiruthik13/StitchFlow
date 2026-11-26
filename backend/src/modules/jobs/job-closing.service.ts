import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IsInt, Matches, Max, MaxLength, Min } from 'class-validator';
import { PoolClient } from 'pg';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobScopeParams } from './jobs.service';

export class ClosePolicyInput {
  @IsInt()
  @Min(0)
  @Max(100000000)
  maxRejectedQuantity!: number;

  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

@Injectable()
export class JobClosingService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async configure(user: AuthenticatedUser, jobId: string, input: ClosePolicyInput) {
    this.requireManager(user);
    return this.db.withTransaction(async client => {
      const job = await this.lockJob(client, user, jobId);
      if (job.status !== 'draft') throw new ConflictException('Closing policy can only be configured for a draft job');
      if (input.maxRejectedQuantity >= job.order_quantity) {
        throw new ConflictException('Rejection allowance must be below the order quantity');
      }
      const { rows: [old] } = await client.query<{
        max_rejected_quantity: number; reason: string;
      }>('SELECT max_rejected_quantity, reason FROM public.job_close_policies WHERE job_id = $1', [jobId]);
      const reason = input.reason.trim();
      if (old?.max_rejected_quantity === input.maxRejectedQuantity && old.reason === reason) {
        return { jobId, maxRejectedQuantity: input.maxRejectedQuantity };
      }
      await client.query(`
        INSERT INTO public.job_close_policies (job_id, max_rejected_quantity, reason, configured_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (job_id) DO UPDATE SET max_rejected_quantity = EXCLUDED.max_rejected_quantity,
          reason = EXCLUDED.reason, configured_by = EXCLUDED.configured_by, configured_at = now()`,
        [jobId, input.maxRejectedQuantity, reason, user.id]);
      await this.audit.record({
        organizationId: user.organizationId, factoryId: job.factory_id,
        actorId: user.id, actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
        action: 'JOB_CLOSE_POLICY_CONFIGURED', entityType: 'job', entityId: jobId, reason,
        previousValues: old ? { maxRejectedQuantity: old.max_rejected_quantity } : null,
        newValues: { maxRejectedQuantity: input.maxRejectedQuantity },
      }, client);
      return { jobId, maxRejectedQuantity: input.maxRejectedQuantity };
    });
  }

  async close(user: AuthenticatedUser, jobId: string) {
    this.requireManager(user);
    return this.db.withTransaction(async client => {
      const job = await this.lockJob(client, user, jobId);
      if (job.status === 'closed') return { jobId, status: 'closed' };
      if (job.status !== 'active') throw new ConflictException('Only an active job can close');
      const { rows: [rollup] } = await client.query<{
        allocated: string; rejected: string; allowed_rejected: number; unsettled: boolean;
      }>(`
        SELECT COALESCE(SUM(b.quantity), 0) AS allocated,
          COALESCE(SUM(q.rejected), 0) AS rejected,
          COALESCE((SELECT max_rejected_quantity FROM public.job_close_policies WHERE job_id = $1), 0) AS allowed_rejected,
          COALESCE(BOOL_OR(
            q.bundle_id IS NULL OR q.inspected <> b.quantity OR q.rework <> 0 OR q.held <> 0 OR q.released <> q.passed
            OR b.quantity <> cutting.total
            OR b.quantity <> inventory.received OR b.quantity <> inventory.issued OR inventory.unsettled
            OR NOT EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1)
            OR EXISTS (
              SELECT 1 FROM public.job_route_steps s WHERE s.job_id = $1 AND NOT EXISTS (
                SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = b.id AND e.step_id = s.id AND e.completed_at IS NOT NULL
              )
            )
            OR q.released <> shipping.packed OR shipping.packed <> shipping.dispatched
          ), false) AS unsettled
        FROM public.bundles b LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = b.id
        CROSS JOIN LATERAL (
          SELECT COALESCE(SUM(e.quantity), 0) AS total FROM public.cutting_output_events e WHERE e.bundle_id = b.id
        ) cutting
        CROSS JOIN LATERAL (
          SELECT COALESCE(SUM(h.quantity) FILTER (WHERE h.direction = 'output-in' AND h.status = 'received'), 0) AS received,
            COALESCE(SUM(h.quantity) FILTER (WHERE h.direction = 'output-out' AND h.status = 'received'), 0) AS issued,
            COALESCE(BOOL_OR(h.status <> 'received' AND d.approved_at IS NULL), false) AS unsettled
          FROM public.cut_stock_handovers h LEFT JOIN public.cut_stock_discrepancy_returns d ON d.handover_id = h.id
          WHERE h.bundle_id = b.id
        ) inventory
        CROSS JOIN LATERAL (
          SELECT COALESCE(SUM(c.quantity), 0) AS packed,
            COALESCE(SUM(c.quantity) FILTER (WHERE d.dispatched_at IS NOT NULL), 0) AS dispatched
          FROM public.bundle_cartons c LEFT JOIN public.carton_dispatch d ON d.carton_id = c.id WHERE c.bundle_id = b.id
        ) shipping
        WHERE b.job_id = $1`, [jobId]);
      if (Number(rollup.allocated) !== job.order_quantity || rollup.unsettled) {
        throw new ConflictException({
          errorCode: 'ERR_JOB_UNRECONCILED',
          message: 'Reconcile allocation, cutting, inventory, production, quality, packing and dispatch before closing',
        });
      }
      if (Number(rollup.rejected) > rollup.allowed_rejected) {
        throw new ConflictException({
          errorCode: 'ERR_JOB_REJECTION_LIMIT', message: 'Rejected quantity exceeds the configured closing policy',
        });
      }
      await client.query("UPDATE public.jobs SET status = 'closed' WHERE id = $1", [jobId]);
      await this.audit.record({
        organizationId: user.organizationId, factoryId: job.factory_id,
        actorId: user.id, actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
        action: 'JOB_STATUS_CHANGED', entityType: 'job', entityId: jobId,
        previousValues: { status: job.status },
        newValues: { status: 'closed', orderQuantity: job.order_quantity, rejectedQuantity: Number(rollup.rejected) },
      }, client);
      return { jobId, status: 'closed' };
    });
  }

  private async lockJob(client: PoolClient, user: AuthenticatedUser, id: string) {
    const { rows: [job] } = await client.query<{ factory_id: string; order_quantity: number; status: string }>(`
      SELECT f.id AS factory_id, j.order_quantity, j.status FROM public.jobs j
      JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND j.id = $4 FOR UPDATE OF j`, [...jobScopeParams(user), id]);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private requireManager(user: AuthenticatedUser) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('Closing requires the assigned Factory Manager');
  }
}
