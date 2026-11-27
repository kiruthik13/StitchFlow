import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from './jobs.dto';
import { BarcodeInput, DecisionInput, GenerateBundleInput, ReprintInput } from './job-workflow.dto';
import { extractLookupCandidates } from './barcode-processor';
import { factoryScope, jobReadScope, jobScopeParams } from './jobs.service';

const bundleProjection = `
  SELECT b.id, b.barcode AS "bundleCode", b.job_id AS "jobId", j.job_code AS "jobCode",
    j.factory_id AS "factoryId", j.line_id AS "lineId", b.size, b.color, b.quantity,
    b.created_at AS "createdAt", gen_random_uuid() AS "requestId"
  FROM public.bundles b
  JOIN public.jobs j ON j.id = b.job_id
  JOIN public.factories f ON f.id = j.factory_id`;

@Injectable()
export class JobWorkflowService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) { }

  async pending(user: AuthenticatedUser, query: FactoryQuery) {
    const result = await this.db.query(`
      SELECT j.id, j.job_code AS "jobCode", j.order_quantity AS "orderQuantity", j.target_date AS "targetDate"
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND j.status = 'draft'
        AND ($5::uuid IS NULL OR j.id > $5)
      ORDER BY j.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return result.rows;
  }

  async decide(user: AuthenticatedUser, jobId: string, input: DecisionInput) {
    const reason = input.reason?.trim() || null;
    if (input.decision === 'rejected' && !reason) throw new BadRequestException('A rejection reason is required');
    return this.db.withTransaction(async client => {
      const job = await this.lockJob(client, user, jobId);
      const result = await client.query(
        'SELECT decision, reason FROM public.job_approvals WHERE job_id = $1', [jobId],
      );
      const recorded = result.rows[0];
      if (recorded?.decision === input.decision && recorded.reason === reason) {
        return { jobId, decision: recorded.decision, status: job.status };
      }
      if (recorded || job.status !== 'draft') throw new ConflictException('Only a draft job can be decided');
      const status = input.decision === 'approved' ? 'active' : 'cancelled';
      await client.query(`
        INSERT INTO public.job_approvals (job_id, decision, decided_by, reason)
        VALUES ($1, $2, $3, $4)`, [jobId, input.decision, user.id, reason]);
      await client.query('UPDATE public.jobs SET status = $2 WHERE id = $1', [jobId, status]);
      await this.record(client, user, job.factory_id, 'JOB_APPROVAL_DECIDED', 'job', jobId,
        { decision: input.decision, status }, reason);
      return { jobId, decision: input.decision, status };
    });
  }

  async allocation(user: AuthenticatedUser, jobId: string) {
    const { rows: [job] } = await this.db.query(`
      SELECT gen_random_uuid() AS "requestId", j.sizes, j.colors,
        j.order_quantity - COALESCE((SELECT SUM(b.quantity) FROM public.bundles b WHERE b.job_id = j.id), 0) AS remaining,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('size', v.size, 'color', v.color,
          'remaining', v.quantity - COALESCE((SELECT SUM(b.quantity) FROM public.bundles b
            WHERE b.job_id = j.id AND b.size = v.size AND b.color = v.color), 0)) ORDER BY v.size, v.color)
          FROM public.job_items v WHERE v.job_id = j.id), '[]'::jsonb) AS variants,
        COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM (
          SELECT b.id, b.barcode AS "bundleCode", b.quantity, b.size, b.color FROM public.bundles b
          WHERE b.job_id = j.id ORDER BY b.id LIMIT 100
        ) AS t), '[]'::jsonb) AS bundles
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND j.id = $4`, [...jobScopeParams(user), jobId]);
    if (!job) throw new NotFoundException('Job not found');
    return { ...job, remaining: Number(job.remaining) };
  }

  async generate(user: AuthenticatedUser, jobId: string, input: GenerateBundleInput) {
    const size = input.size.trim();
    const color = input.color.trim();
    return this.db.withTransaction(async client => {
      const job = await this.lockJob(client, user, jobId);
      const previous = await client.query(`
        ${bundleProjection} WHERE j.id = $1 AND b.request_id = $2`, [jobId, input.requestId]);
      const bundle = previous.rows[0];
      if (bundle) {
        if (bundle.size !== size || bundle.color !== color || bundle.quantity !== input.quantity) {
          throw new ConflictException('Request ID is already associated with a different bundle');
        }
        return bundle;
      }
      if (job.status !== 'active') throw new ConflictException('Bundle generation requires an active job');
      if (!job.sizes.includes(size) || !job.colors.includes(color)) {
        throw new BadRequestException('Size or color does not belong to this job');
      }
      const { rows: [allocation] } = await client.query<{
        total: string; variant_total: string; has_items: boolean; variant_limit: number | null;
      }>(`
        SELECT COALESCE(SUM(quantity), 0) AS total,
          COALESCE(SUM(quantity) FILTER (WHERE size = $2 AND color = $3), 0) AS variant_total,
          EXISTS (SELECT 1 FROM public.job_items v WHERE v.job_id = $1) AS has_items,
          (SELECT quantity FROM public.job_items v WHERE v.job_id = $1 AND v.size = $2 AND v.color = $3) AS variant_limit
        FROM public.bundles WHERE job_id = $1`, [jobId, size, color]);
      if (Number(allocation.total) + input.quantity > job.order_quantity) {
        throw new ConflictException('Bundle quantity exceeds the unallocated job quantity');
      }
      if (allocation.has_items && (allocation.variant_limit === null
        || Number(allocation.variant_total) + input.quantity > allocation.variant_limit)) {
        throw new ConflictException('Bundle exceeds the unallocated quantity of this size and color');
      }
      const { rows: [created] } = await client.query(`
        INSERT INTO public.bundles (job_id, request_id, size, color, quantity, created_by)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [jobId, input.requestId, size, color, input.quantity, user.id]);
      await this.record(client, user, job.factory_id, 'BUNDLE_CREATED', 'bundle', created.id, { size, color, quantity: input.quantity });
      return (await client.query(`${bundleProjection} WHERE b.id = $1`, [created.id])).rows[0];
    });
  }

  async list(user: AuthenticatedUser, query: FactoryQuery) {
    const result = await this.db.query(`${bundleProjection}
      WHERE ${jobReadScope} AND f.id = $4 AND ($5::uuid IS NULL OR b.id > $5)
      ORDER BY b.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return result.rows;
  }

  async find(user: AuthenticatedUser, value: string, field: 'id' | 'barcode') {
    const predicate = field === 'barcode' ? 'UPPER(b.barcode) = UPPER($4)' : 'b.id = $4';
    const { rows } = await this.db.query(`${bundleProjection}
      WHERE ${jobReadScope} AND ${predicate}`, [...jobScopeParams(user), value]);
    if (!rows[0]) throw new NotFoundException('Bundle not found');
    return rows[0];
  }

  async resolveUniversalBarcode(user: AuthenticatedUser, input: BarcodeInput) {
    const { cleaned, candidates, gs1 } = extractLookupCandidates(input.barcode);
    if (!cleaned || candidates.length === 0) {
      throw new BadRequestException('Invalid empty barcode');
    }
    const upperCandidates = candidates.map((c) => c.toUpperCase());

    // 1. Registered production bundle
    const { rows: bundleRows } = await this.db.query(
      `${bundleProjection}
       WHERE ${jobReadScope} AND UPPER(b.barcode) = ANY($4::text[])
       LIMIT 1`,
      [...jobScopeParams(user), upperCandidates],
    );
    if (bundleRows[0]) {
      return {
        ...bundleRows[0],
        entityType: 'bundle',
        symbology: input.symbology ?? null,
        gs1: gs1 ?? null,
      };
    }

    // 2. Registered export/packing carton
    const { rows: cartonRows } = await this.db.query(
      `SELECT c.id, c.barcode, c.quantity, c.bundle_id AS "bundleId",
              b.barcode AS "bundleCode", j.job_code AS "jobCode", f.id AS "factoryId"
       FROM public.bundle_cartons c
       JOIN public.bundles b ON b.id = c.bundle_id
       JOIN public.jobs j ON j.id = b.job_id
       JOIN public.factories f ON f.id = j.factory_id
       WHERE ${jobReadScope} AND UPPER(c.barcode) = ANY($4::text[])
       LIMIT 1`,
      [...jobScopeParams(user), upperCandidates],
    );
    if (cartonRows[0]) {
      return {
        ...cartonRows[0],
        entityType: 'carton',
        symbology: input.symbology ?? null,
        gs1: gs1 ?? null,
      };
    }

    // 3. Registered work order (job_code)
    const { rows: jobRows } = await this.db.query(
      `SELECT j.id, j.job_code AS "jobCode", j.status, j.order_quantity AS "orderQuantity",
              j.factory_id AS "factoryId"
       FROM public.jobs j
       JOIN public.factories f ON f.id = j.factory_id
       WHERE ${jobReadScope} AND UPPER(j.job_code) = ANY($4::text[])
       LIMIT 1`,
      [...jobScopeParams(user), upperCandidates],
    );
    if (jobRows[0]) {
      return {
        ...jobRows[0],
        entityType: 'job',
        symbology: input.symbology ?? null,
        gs1: gs1 ?? null,
      };
    }

    // 4. Registered storage location
    const { rows: locRows } = await this.db.query(
      `SELECT sl.id, sl.code, sl.name, sl.factory_id AS "factoryId"
       FROM public.storage_locations sl
       JOIN public.factories f ON f.id = sl.factory_id
       WHERE ${factoryScope} AND UPPER(sl.code) = ANY($4::text[])
       LIMIT 1`,
      [...jobScopeParams(user), upperCandidates],
    );
    if (locRows[0]) {
      return {
        ...locRows[0],
        entityType: 'location',
        symbology: input.symbology ?? null,
        gs1: gs1 ?? null,
      };
    }

    throw new NotFoundException('Barcode is not registered in StitchFlow');
  }

  async printQueue(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT t.id, t.bundle_id AS "bundleId", b.barcode AS "bundleCode", j.job_code AS "jobCode",
             b.size, b.color, b.quantity, t.actor_id AS "actorId",
             COALESCE(p.name, 'System') AS "requestedBy", t.reason, t.created_at AS "createdAt"
      FROM public.tag_print_logs t
      JOIN public.bundles b ON b.id = t.bundle_id
      JOIN public.jobs j ON j.id = b.job_id
      JOIN public.factories f ON f.id = j.factory_id
      LEFT JOIN public.profiles p ON p.id = t.actor_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR t.id > $5)
      ORDER BY t.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async tagPayload(user: AuthenticatedUser, bundleId: string, format: 'zpl' | 'tspl') {
    const bundle = (await this.find(user, bundleId, 'id')) as {
      id: string;
      bundleCode: string;
      jobId: string;
      jobCode: string;
      factoryId: string;
      lineId: string;
      size: string;
      color: string;
      quantity: number;
    };
    const payload = this.buildThermalPayload(bundle, format);
    return {
      bundle,
      format,
      mimeType: format === 'zpl' ? 'application/x-zpl' : 'application/x-tspl',
      payload,
    };
  }

  private buildThermalPayload(
    bundle: { bundleCode: string; jobCode: string; size: string; color: string; quantity: number },
    format: 'zpl' | 'tspl',
    printLogId?: string,
  ): string {
    if (format === 'tspl') {
      return [
        'SIZE 50 mm, 30 mm',
        'GAP 3 mm, 0 mm',
        'DIRECTION 1',
        'CLS',
        `TEXT 20,20,"3",0,1,1,"JOB: ${bundle.jobCode}"`,
        `TEXT 20,55,"2",0,1,1,"${bundle.size} | ${bundle.color} | QTY ${bundle.quantity}"`,
        `BARCODE 20,90,"128",60,1,0,2,2,"${bundle.bundleCode}"`,
        ...(printLogId ? [`TEXT 20,175,"1",0,1,1,"REPRINT ${printLogId.slice(0, 8)}"`] : []),
        'PRINT 1,1',
      ].join('\n');
    }
    return [
      '^XA',
      '^PW400',
      '^LL240',
      `^FO20,20^A0N,28,28^FDJOB: ${bundle.jobCode}^FS`,
      `^FO20,56^A0N,22,22^FD${bundle.size} | ${bundle.color} | QTY ${bundle.quantity}^FS`,
      `^FO20,92^BY2,2,64^BCN,64,Y,N,N^FD${bundle.bundleCode}^FS`,
      ...(printLogId ? [`^FO20,192^A0N,18,18^FDREPRINT: ${printLogId.slice(0, 8)}^FS`] : []),
      '^XZ',
    ].join('\n');
  }

  async printLogs(user: AuthenticatedUser, bundleId: string) {
    const { rows } = await this.db.query(`
      SELECT t.id, t.actor_id AS "actorId", t.reason, t.created_at AS "createdAt"
      FROM public.tag_print_logs t
      JOIN public.bundles b ON b.id = t.bundle_id
      JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND b.id = $4 ORDER BY t.created_at DESC LIMIT 100`,
      [...jobScopeParams(user), bundleId]);
    return rows;
  }

  async reprint(user: AuthenticatedUser, id: string, input: ReprintInput) {
    const reason = input.reason.trim();
    return this.db.withTransaction(async client => {
      const scoped = await client.query(`${bundleProjection}
        WHERE ${factoryScope} AND b.id = $4 FOR UPDATE OF b`, [...jobScopeParams(user), id]);
      const bundle = scoped.rows[0];
      if (!bundle) throw new NotFoundException('Bundle not found');
      const previous = await client.query(
        'SELECT id, reason, actor_id FROM public.tag_print_logs WHERE bundle_id = $1 AND request_id = $2',
        [id, input.requestId],
      );
      const recorded = previous.rows[0];
      if (recorded) {
        if (recorded.reason !== reason || recorded.actor_id !== user.id) {
          throw new ConflictException('Request ID already belongs to another print request');
        }
        return {
          bundle,
          printLogId: recorded.id,
          zplPayload: this.buildThermalPayload(bundle, 'zpl', recorded.id),
          tsplPayload: this.buildThermalPayload(bundle, 'tspl', recorded.id),
        };
      }
      const { rows: [entry] } = await client.query(`
        INSERT INTO public.tag_print_logs (bundle_id, request_id, actor_id, reason)
        VALUES ($1,$2,$3,$4) RETURNING id`, [id, input.requestId, user.id, reason]);
      await this.record(client, user, bundle.factoryId, 'BUNDLE_TAG_REPRINT_REQUESTED', 'bundle', id,
        { barcode: bundle.bundleCode, printLogId: entry.id }, reason);
      return {
        bundle,
        printLogId: entry.id,
        zplPayload: this.buildThermalPayload(bundle, 'zpl', entry.id),
        tsplPayload: this.buildThermalPayload(bundle, 'tspl', entry.id),
      };
    });
  }

  private async lockJob(client: PoolClient, user: AuthenticatedUser, id: string) {
    const { rows } = await client.query<{
      id: string; factory_id: string; status: string; sizes: string[]; colors: string[]; order_quantity: number;
    }>(`
      SELECT j.id, j.factory_id, j.status, j.sizes, j.colors, j.order_quantity
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND j.id = $4 FOR UPDATE OF j`, [...jobScopeParams(user), id]);
    if (!rows[0]) throw new NotFoundException('Job not found');
    return rows[0];
  }

  private record(client: PoolClient, user: AuthenticatedUser, factoryId: string, action: string,
    entityType: string, entityId: string, newValues: Record<string, unknown>, reason?: string | null) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId, actorId: user.id, actorEmployeeId: user.employeeId,
      actorName: user.name, actorRole: user.role, action, entityType, entityId, newValues, reason,
    }, client);
  }
}
