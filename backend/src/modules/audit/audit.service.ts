import { Injectable, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';

export interface AuditEntryInput {
  organizationId: string;
  factoryId?: string | null;
  unitId?: string | null;
  actorId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
  result?: 'success' | 'denied' | 'failed';
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'serviceRoleKey',
]);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  redact(payload?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!payload) return null;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (SENSITIVE_KEYS.has(k)) {
        clean[k] = '[REDACTED]';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        clean[k] = this.redact(v as Record<string, unknown>);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }

  async record(entry: AuditEntryInput, client?: PoolClient): Promise<void> {
    if (!client && !this.db.isDatabaseConfigured()) return;
    try {
      const sql =
        `INSERT INTO public.audit_logs (
          organization_id, factory_id, unit_id, actor_id, actor_employee_id, actor_name, actor_role,
          action, entity_type, entity_id, previous_values, new_values, reason, result
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`;
      const params = [
          entry.organizationId,
          entry.factoryId ?? null,
          entry.unitId ?? null,
          entry.actorId ?? null,
          entry.actorEmployeeId ?? null,
          entry.actorName ?? null,
          entry.actorRole ?? null,
          entry.action,
          entry.entityType,
          entry.entityId ?? null,
          entry.previousValues ? JSON.stringify(this.redact(entry.previousValues)) : null,
          entry.newValues ? JSON.stringify(this.redact(entry.newValues)) : null,
          entry.reason ?? null,
          entry.result ?? 'success',
      ];
      if (client) await client.query(sql, params);
      else await this.db.query(sql, params);

    } catch (err) {
      if (client) throw err;
      this.logger.error('Failed to write audit log');
    }
  }

  async list(organizationId: string, factoryId?: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    if (factoryId) {
      const res = await this.db.query(
        `SELECT id, organization_id, factory_id, actor_employee_id, actor_name, actor_role,
                action, entity_type, entity_id, previous_values, new_values, reason, result, created_at
         FROM public.audit_logs
         WHERE organization_id = $1 AND factory_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [organizationId, factoryId, safeLimit],
      );
      return res.rows;
    }

    const res = await this.db.query(
      `SELECT id, organization_id, factory_id, actor_employee_id, actor_name, actor_role,
              action, entity_type, entity_id, previous_values, new_values, reason, result, created_at
       FROM public.audit_logs
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, safeLimit],
    );
    return res.rows;
  }
}
