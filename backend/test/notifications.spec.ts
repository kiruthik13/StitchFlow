import { NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../src/database/database.service';
import { mapAuditActionToEventType, NOTIFICATION_EVENT_TYPES } from '../src/modules/notifications/notification-catalog';
import { RecipientResolverService } from '../src/modules/notifications/recipient-resolver.service';
import { NotificationOutboxService } from '../src/modules/notifications/notification-outbox.service';
import { ExpoPushService } from '../src/modules/notifications/expo-push.service';
import { NotificationsController } from '../src/modules/notifications/notifications.controller';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';

const orgUser = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id,
  email: `${id}@stitchflow.dev`,
  employeeId: `EMP-${id}`,
  name: id,
  role,
  accountStatus: 'active',
  organizationId: '11111111-1111-1111-1111-111111111111',
  assignedFactoryIds: ['22222222-2222-2222-2222-222222222201'],
  primaryFactoryId: '22222222-2222-2222-2222-222222222201',
  permissions: [],
});

describe('Notification Engine & Security', () => {
  it('exposes the full typed event catalog and maps audit actions accurately', () => {
    expect(NOTIFICATION_EVENT_TYPES.length).toBeGreaterThanOrEqual(60);
    expect(mapAuditActionToEventType('JOB_CREATED')).toBe('JOB_APPROVAL_REQUESTED');
    expect(mapAuditActionToEventType('JOB_APPROVAL_DECIDED', { decision: 'approved' })).toBe('JOB_APPROVED');
    expect(mapAuditActionToEventType('JOB_APPROVAL_DECIDED', { decision: 'rejected' })).toBe('JOB_REJECTED');
    expect(mapAuditActionToEventType('STAGE_COMPLETED')).toBe('PRODUCTION_STAGE_COMPLETED');
    expect(mapAuditActionToEventType('QUALITY_INSPECTION', { rework: 5 })).toBe('QC_REWORK_REQUESTED');
    expect(mapAuditActionToEventType('QUALITY_REWORK')).toBe('QC_REWORK_COMPLETED');
    expect(mapAuditActionToEventType('QUALITY_RELEASE')).toBe('BUNDLE_READY_FOR_PACKING');
    expect(mapAuditActionToEventType('SHIPMENT_MANIFEST_CREATED')).toBe('DISPATCH_APPROVAL_REQUESTED');
    expect(mapAuditActionToEventType('SHIPMENT_MANIFEST_EXECUTED')).toBe('DISPATCH_COMPLETED');
  });

  it('enqueues durable outbox events idempotently inside the business transaction', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const resolver = new RecipientResolverService(db);
    const push = new ExpoPushService(db);
    const outbox = new NotificationOutboxService(db, resolver, push);
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) } as unknown as PoolClient;

    await outbox.enqueueInTransaction(client, {
      organizationId: 'org-1',
      factoryId: 'fac-1',
      eventType: 'PRODUCTION_STAGE_COMPLETED',
      actorUserId: 'op-1',
      entityType: 'bundle',
      entityId: 'bnd-1',
      jobId: 'job-1',
      bundleId: 'bnd-1',
      idempotencyKey: 'PRODUCTION_STAGE_COMPLETED:req-123',
    });

    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (client.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
    expect(params).toContain('PRODUCTION_STAGE_COMPLETED:req-123');
  });

  it('resolves next route operator and supervisor dynamically without notifying actor or unrelated users', async () => {
    const query = jest.fn()
      // 1. job_route_steps
      .mockResolvedValueOnce({
        rows: [
          { id: 'step-1', ordinal: 1, stage_code: 'SEWING', assignment_ids: ['assign-op1'] },
          { id: 'step-2', ordinal: 2, stage_code: 'IRONING', assignment_ids: ['assign-op2'] },
        ],
      })
      // 2. next step assignees
      .mockResolvedValueOnce({ rows: [{ profile_id: 'op-2' }] })
      // 3. supervisors in factory/line
      .mockResolvedValueOnce({ rows: [{ id: 'sup-1' }, { id: 'op-1' }] });

    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const resolver = new RecipientResolverService(db);

    const recipients = await resolver.resolveRecipients({
      id: 'evt-1',
      organization_id: 'org-1',
      factory_id: 'fac-1',
      event_type: 'PRODUCTION_STAGE_COMPLETED',
      actor_user_id: 'op-1',
      entity_type: 'bundle',
      entity_id: 'bnd-1',
      job_id: 'job-1',
      bundle_id: 'bnd-1',
      production_line_id: 'line-1',
      event_payload: { stepId: 'step-1' },
    });

    const ids = recipients.map((r) => r.userId);
    expect(ids).toEqual(['op-2', 'sup-1']);
    expect(ids).not.toContain('op-1');
  });

  it('enforces recipient ownership on read/detail endpoints', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const controller = new NotificationsController(db);
    const user = orgUser('user-a', 'operator');

    await expect(controller.getOne(user, '33333333-3333-3333-3333-333333333333')).rejects.toThrow(NotFoundException);
    expect(query.mock.calls[0][1]).toEqual([
      '33333333-3333-3333-3333-333333333333',
      'user-a',
      '11111111-1111-1111-1111-111111111111',
    ]);
  });

  it('renders multilingual push templates in en, ta, and hi without translating IDs', () => {
    const db = { isDatabaseConfigured: () => false } as unknown as DatabaseService;
    const push = new ExpoPushService(db);

    const en = push.renderLocalizedText('en', 'notifications:events.QC_REWORK_REQUESTED.title', {
      bundleCode: 'BND-00521',
      rework: 15,
    });
    const ta = push.renderLocalizedText('ta', 'notifications:events.QC_REWORK_REQUESTED.title', {
      bundleCode: 'BND-00521',
      rework: 15,
    });
    const hi = push.renderLocalizedText('hi', 'notifications:events.QC_REWORK_REQUESTED.title', {
      bundleCode: 'BND-00521',
      rework: 15,
    });

    expect(en.body).toContain('BND-00521');
    expect(ta.body).toContain('BND-00521');
    expect(hi.body).toContain('BND-00521');
  });
});
