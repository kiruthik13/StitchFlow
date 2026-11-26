import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery, MasterInput } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';
import { DiscrepancyReturnInput, HandoverDecisionInput, OutputInInput } from './cut-stock.dto';

type Direction = 'output-in' | 'output-out';
interface Handover {
  id: string;
  bundle_id: string;
  location_id: string;
  destination_line_id: string | null;
  direction: Direction;
  quantity: number;
  status: 'pending' | 'received' | 'rejected';
  sender_id: string;
  receiver_id: string | null;
  received_quantity: number | null;
  decision_reason: string | null;
}

@Injectable()
export class CutStockService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async locations(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT s.id, s.factory_id AS "factoryId", s.code, s.name, s.is_active AS "isActive"
      FROM public.storage_locations s JOIN public.factories f ON f.id = s.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR s.id > $5)
      ORDER BY s.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async createLocation(user: AuthenticatedUser, input: MasterInput) {
    return this.db.withTransaction(async client => {
      const { rows: [location] } = await client.query(`
        INSERT INTO public.storage_locations (factory_id, code, name)
        SELECT f.id, $5, $6 FROM public.factories f WHERE ${factoryScope} AND f.id = $4
        ON CONFLICT (factory_id, code) DO NOTHING RETURNING id, factory_id, code, name, is_active`,
        [...jobScopeParams(user), input.factoryId, input.code.trim(), input.name.trim()]);
      if (!location) throw new ConflictException('Factory unavailable or location code already exists');
      await this.record(client, user, input.factoryId, 'STORAGE_LOCATION_CREATED', 'storage_location', location.id, {});
      return location;
    });
  }

  async updateLocation(user: AuthenticatedUser, id: string, input: MasterInput) {
    return this.db.withTransaction(async client => {
      try {
        const { rows: [location] } = await client.query(`
          UPDATE public.storage_locations s SET code = $6, name = $7
          FROM public.factories f WHERE ${factoryScope} AND f.id = $4 AND s.factory_id = f.id AND s.id = $5
          RETURNING s.id, s.factory_id AS "factoryId", s.code, s.name, s.is_active AS "isActive"`,
          [...jobScopeParams(user), input.factoryId, id, input.code.trim(), input.name.trim()]);
        if (!location) throw new NotFoundException('Storage location not found');
        await this.record(client, user, input.factoryId, 'STORAGE_LOCATION_UPDATED', 'storage_location', id, { code: location.code, name: location.name });
        return location;
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('Storage location code already exists');
        throw error;
      }
    });
  }

  async list(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT h.*, b.barcode AS "bundleCode", d.verified_at AS "returnVerifiedAt",
        d.approved_at AS "returnApprovedAt"
      FROM public.cut_stock_handovers h JOIN public.bundles b ON b.id = h.bundle_id
      LEFT JOIN public.cut_stock_discrepancy_returns d ON d.handover_id = h.id
      JOIN public.storage_locations s ON s.id = h.location_id
      JOIN public.factories f ON f.id = s.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR h.id > $5)
        AND ($6::boolean OR h.sender_id = $3 OR EXISTS (
          SELECT 1 FROM public.user_assignments a
          WHERE a.profile_id = $3 AND a.is_active AND a.factory_id = f.id AND a.line_id = h.destination_line_id
        ))
      ORDER BY h.id LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null, user.permissions.includes('CAN_MANAGE_INVENTORY')]);
    return rows;
  }

  async propose(user: AuthenticatedUser, input: OutputInInput, direction: Direction, lineId: string | null = null) {
    if ((direction === 'output-in' && user.role !== 'operator') ||
        (direction === 'output-out' && user.role !== 'store-dispatch')) {
      throw new ForbiddenException('The employee cannot send this handover');
    }
    return this.db.withTransaction(async client => {
      const scope = await this.lockBundle(client, user, input.bundleId, input.locationId);
      const result = await client.query<Handover>(`
        SELECT * FROM public.cut_stock_handovers WHERE sender_id = $1 AND request_id = $2`,
        [user.id, input.requestId]);
      const previous = result.rows[0];
      if (previous) {
        if (previous.bundle_id !== input.bundleId || previous.location_id !== input.locationId
          || previous.destination_line_id !== lineId || previous.direction !== direction || previous.quantity !== input.quantity) {
          throw new ConflictException('Request ID already belongs to another handover');
        }
        return previous;
      }

      if (scope.status !== 'active') throw new ConflictException('Handover requires an active job');
      if (direction === 'output-in') {
        const { rows: [balance] } = await client.query<{
          eligible: boolean; cut: string; reserved: string;
        }>(`
          SELECT EXISTS (
            SELECT 1 FROM public.cutting_assignments c
            JOIN public.user_assignments a ON a.id = c.assignment_id
            WHERE c.job_id = $1 AND c.is_active AND a.is_active AND a.profile_id = $2
              AND a.factory_id = $4 AND a.line_id = $5
              AND a.unit_id = $6 AND a.department_id = $7
          ) AS eligible,
          (SELECT COALESCE(SUM(quantity), 0) FROM public.cutting_output_events WHERE bundle_id = $3) AS cut,
          (SELECT COALESCE(SUM(h.quantity), 0) FROM public.cut_stock_handovers h
           LEFT JOIN public.cut_stock_discrepancy_returns d ON d.handover_id = h.id
           WHERE h.bundle_id = $3 AND h.direction = 'output-in' AND d.approved_at IS NULL) AS reserved`,
          [scope.job_id, user.id, input.bundleId, scope.factory_id, scope.line_id, scope.unit_id, scope.department_id]);
        if (!balance.eligible) throw new ForbiddenException('An active cutting assignment is required');
        if (input.quantity > Number(balance.cut) - Number(balance.reserved)) {
          throw new ConflictException('Quantity exceeds unreserved confirmed cutting output');
        }
      } else {
        const { rows: [available] } = await client.query<{ balance: string }>(`
          SELECT COALESCE(SUM(CASE
            WHEN direction = 'output-in' AND status = 'received' THEN quantity
            WHEN direction = 'output-out' AND d.approved_at IS NULL THEN -quantity
            ELSE 0 END), 0) AS balance
          FROM public.cut_stock_handovers h LEFT JOIN public.cut_stock_discrepancy_returns d ON d.handover_id = h.id
          WHERE h.bundle_id = $1 AND h.location_id = $2`,
          [input.bundleId, input.locationId]);
        if (input.quantity > Number(available.balance)) {
          throw new ConflictException('Quantity exceeds available stock at this location');
        }
        const { rowCount } = await client.query(`
          SELECT 1 FROM public.production_lines l
          JOIN public.departments d ON d.id = l.department_id AND d.is_active
          JOIN public.units u ON u.id = d.unit_id AND u.is_active AND u.factory_id = l.factory_id
          WHERE l.id = $1 AND l.factory_id = $2 AND l.is_active`, [lineId, scope.factory_id]);
        if (!rowCount) throw new BadRequestException('Destination line is outside the source factory');
      }

      const { rows: [handover] } = await client.query<Handover>(`
        INSERT INTO public.cut_stock_handovers
          (bundle_id, location_id, destination_line_id, direction, quantity, sender_id, request_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (sender_id, request_id) DO NOTHING RETURNING *`,
        [input.bundleId, input.locationId, lineId, direction, input.quantity, user.id, input.requestId]);
      if (!handover) throw new ConflictException('Request ID was used for another handover');
      await this.record(client, user, scope.factory_id, 'CUT_STOCK_HANDOVER_SENT', 'cut_stock_handover', handover.id,
        { direction, bundleId: input.bundleId, locationId: input.locationId, destinationLineId: lineId, quantity: input.quantity });
      return handover;
    });
  }

  async decide(user: AuthenticatedUser, id: string, input: HandoverDecisionInput) {
    const reason = input.reason?.trim() || null;
    if (input.status === 'rejected' && !reason) throw new BadRequestException('A discrepancy reason is required');
    return this.db.withTransaction(async client => {
      const { rows: [target] } = await client.query<{ bundle_id: string; location_id: string }>(`
        SELECT h.bundle_id, h.location_id FROM public.cut_stock_handovers h
        JOIN public.storage_locations s ON s.id = h.location_id
        JOIN public.factories f ON f.id = s.factory_id WHERE ${factoryScope} AND h.id = $4`,
        [...jobScopeParams(user), id]);
      if (!target) throw new NotFoundException('Handover not found');
      const scope = await this.lockBundle(client, user, target.bundle_id, target.location_id);
      const { rows: [handover] } = await client.query<Handover>(
        'SELECT * FROM public.cut_stock_handovers WHERE id = $1 FOR UPDATE', [id],
      );
      if (!handover || user.id === handover.sender_id) throw new ForbiddenException('A different employee must receive the handover');
      if (handover.direction === 'output-in') {
        if (user.role !== 'store-dispatch' || !user.permissions.includes('CAN_MANAGE_INVENTORY')) {
          throw new ForbiddenException('Store Staff must receive cutting output');
        }
      } else {
        const { rowCount } = await client.query(`
          SELECT 1 FROM public.user_assignments a
          JOIN public.production_lines l ON l.id = a.line_id AND l.factory_id = a.factory_id AND l.is_active
          JOIN public.departments d ON d.id = l.department_id AND d.id = a.department_id AND d.is_active
          JOIN public.units u ON u.id = d.unit_id AND u.id = a.unit_id AND u.factory_id = a.factory_id AND u.is_active
          WHERE a.profile_id = $1 AND a.factory_id = $2 AND a.line_id = $3 AND a.is_active`,
          [user.id, scope.factory_id, handover.destination_line_id]);
        if (!rowCount || user.role !== 'operator') throw new ForbiddenException('The assigned destination Line Operator must receive this issue');
      }
      if (handover.status !== 'pending') {
        if (handover.status === input.status && handover.receiver_id === user.id
          && handover.received_quantity === input.actualQuantity && handover.decision_reason === reason) return handover;
        throw new ConflictException('This handover was already decided');
      }
      if (input.status === 'received' && input.actualQuantity !== handover.quantity) {
        throw new ConflictException('Reported quantity differs from the proposed quantity. Record a discrepancy.');
      }
      const { rows: [decided] } = await client.query<Handover>(`
        UPDATE public.cut_stock_handovers SET status = $2, receiver_id = $3,
          received_quantity = $4, decision_reason = $5, decided_at = now() WHERE id = $1 RETURNING *`,
        [id, input.status, user.id, input.actualQuantity, reason]);
      await this.record(client, user, scope.factory_id, 'CUT_STOCK_HANDOVER_DECIDED', 'cut_stock_handover', id,
        { status: input.status, actualQuantity: input.actualQuantity }, reason);
      return decided;
    });
  }

  async verifyReturn(user: AuthenticatedUser, id: string, input: DiscrepancyReturnInput) {
    return this.db.withTransaction(async client => {
      const { handover, factoryId } = await this.lockDiscrepancy(client, user, id);
      if (handover.sender_id !== user.id || user.role !== (handover.direction === 'output-in' ? 'operator' : 'store-dispatch')) {
        throw new ForbiddenException('The original sender must confirm that the pieces are back at the source');
      }
      if (input.verifiedQuantity !== handover.quantity) throw new ConflictException('The full quantity must be verified at the source');
      const reason = input.reason.trim();
      const { rows: [saved] } = await client.query(`
        INSERT INTO public.cut_stock_discrepancy_returns (handover_id, verified_quantity, verified_by, reason)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`, [id, input.verifiedQuantity, user.id, reason]);
      if (!saved) {
        const { rows: [old] } = await client.query(
          'SELECT * FROM public.cut_stock_discrepancy_returns WHERE handover_id = $1', [id],
        );
        if (old?.verified_quantity === input.verifiedQuantity && old.reason === reason) return old;
        throw new ConflictException('This return was already verified');
      }
      await this.record(client, user, factoryId, 'CUT_STOCK_RETURN_VERIFIED', 'cut_stock_handover', id,
        { verifiedQuantity: input.verifiedQuantity }, reason);
      return saved;
    });
  }

  async approveReturn(user: AuthenticatedUser, id: string) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('A Factory Manager must authorize the stock release');
    return this.db.withTransaction(async client => {
      const { handover, factoryId } = await this.lockDiscrepancy(client, user, id);
      const { rows: [current] } = await client.query(
        'SELECT * FROM public.cut_stock_discrepancy_returns WHERE handover_id = $1 FOR UPDATE', [id],
      );
      if (!current || current.verified_quantity !== handover.quantity || current.verified_by === user.id) {
        throw new ConflictException('A separate sender verification of the full return is required');
      }
      if (current.approved_at) return current;
      const { rows: [result] } = await client.query(`
        UPDATE public.cut_stock_discrepancy_returns SET approved_by = $2, approved_at = now()
        WHERE handover_id = $1 RETURNING *`, [id, user.id]);
      await this.record(client, user, factoryId, 'CUT_STOCK_RETURN_APPROVED', 'cut_stock_handover', id, {});
      return result;
    });
  }

  private async lockDiscrepancy(client: PoolClient, user: AuthenticatedUser, id: string) {
    const { rows: [target] } = await client.query<Handover>(`
      SELECT h.* FROM public.cut_stock_handovers h JOIN public.storage_locations s ON s.id = h.location_id
      JOIN public.factories f ON f.id = s.factory_id WHERE ${factoryScope} AND h.id = $4`,
      [...jobScopeParams(user), id]);
    if (!target) throw new NotFoundException('Handover not found');
    const scope = await this.lockBundle(client, user, target.bundle_id, target.location_id);
    const { rows: [handover] } = await client.query<Handover>(
      'SELECT * FROM public.cut_stock_handovers WHERE id = $1 FOR UPDATE', [id],
    );
    if (handover?.status !== 'rejected') throw new ConflictException('Only a rejected handover can be reconciled');
    return { handover, factoryId: scope.factory_id };
  }

  private async lockBundle(client: PoolClient, user: AuthenticatedUser, bundleId: string, locationId: string) {
    const { rows: [scope] } = await client.query<{
      job_id: string; factory_id: string; status: string; line_id: string; unit_id: string; department_id: string;
    }>(`
      SELECT j.id AS job_id, f.id AS factory_id, j.status, l.id AS line_id, u.id AS unit_id, d.id AS department_id
      FROM public.bundles b JOIN public.jobs j ON j.id = b.job_id
      JOIN public.factories f ON f.id = j.factory_id
      JOIN public.storage_locations s ON s.factory_id = f.id AND s.id = $5 AND s.is_active
      JOIN public.production_lines l ON l.id = j.line_id AND l.factory_id = f.id AND l.is_active
      JOIN public.departments d ON d.id = l.department_id AND d.is_active
      JOIN public.units u ON u.id = d.unit_id AND u.factory_id = f.id AND u.is_active
      WHERE ${factoryScope} AND b.id = $4 FOR UPDATE OF b, j`,
      [...jobScopeParams(user), bundleId, locationId]);
    if (!scope) throw new NotFoundException('Bundle or location not found for your factory');
    return scope;
  }

  private record(client: PoolClient, user: AuthenticatedUser, factoryId: string, action: string,
    entityType: string, entityId: string, newValues: Record<string, unknown>, reason?: string | null) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId, actorId: user.id, actorEmployeeId: user.employeeId,
      actorName: user.name, actorRole: user.role, action, entityType, entityId, newValues, reason,
    }, client);
  }
}
