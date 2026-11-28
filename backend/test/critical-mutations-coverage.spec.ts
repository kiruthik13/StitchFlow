import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { WorkflowService } from '../src/modules/workflow/workflow.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { JobWorkflowService } from '../src/modules/jobs/job-workflow.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationOutboxService } from '../src/modules/notifications/notification-outbox.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';

const orgId = '11111111-1111-1111-1111-111111111111';
const facId = '22222222-2222-2222-2222-222222222201';
const jobId = '33333333-3333-3333-3333-333333333301';
const bundleId = '44444444-4444-4444-4444-444444444401';
const stepId = '55555555-5555-5555-5555-555555555501';
const cartonId = '66666666-6666-6666-6666-666666666601';
const reqId = '77777777-7777-4777-8777-777777777701';

const userOf = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id,
  email: `${role}@stitchflow.dev`,
  employeeId: `EMP-${role.toUpperCase()}`,
  name: role,
  role,
  accountStatus: 'active',
  organizationId: orgId,
  assignedFactoryIds: [facId],
  primaryFactoryId: facId,
  permissions: ['CAN_LOOKUP_BARCODE', 'CAN_ENTER_PRODUCTION', 'CAN_INSPECT_QUALITY', 'CAN_PACK_CARTONS', 'CAN_APPROVE_DISPATCH', 'CAN_EXECUTE_DISPATCH'],
});

describe('Critical Mutations, Transaction Integrity, & Outbox Coverage', () => {
  it('WorkflowService.completeStage enforces assignment, idempotency conflict, available qty, and records STAGE_COMPLETED', async () => {
    const client = { query: jest.fn() };
    const db = { withTransaction: jest.fn((fn) => fn(client)) } as unknown as DatabaseService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const svc = new WorkflowService(db, audit);
    const op = userOf('u-op', 'operator');

    // 1. Unassigned operator -> ForbiddenException
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rows: [{ ordinal: 1, stage_code: 'sewing-out', line_id: 'l1', eligible: false }] });
    await expect(svc.completeStage(op, { bundleId, stepId, requestId: reqId, quantity: 50 })).rejects.toThrow(ForbiddenException);

    // 2. Output exceeds available -> ConflictException
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rows: [{ ordinal: 1, stage_code: 'sewing-out', line_id: 'l1', eligible: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ available: 20 }] });
    await expect(svc.completeStage(op, { bundleId, stepId, requestId: reqId, quantity: 50 })).rejects.toThrow(ConflictException);

    // 3. Valid completion -> inserts event and records audit
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rows: [{ ordinal: 1, stage_code: 'sewing-out', line_id: 'l1', eligible: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ available: 100 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ev-1', bundle_id: bundleId, step_id: stepId, quantity: 100 }] });
    const res = await svc.completeStage(op, { bundleId, stepId, requestId: reqId, quantity: 100 });
    expect(res).toMatchObject({ id: 'ev-1', quantity: 100 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'STAGE_COMPLETED' }), client);
  });

  it('WorkflowService.quality enforces QC balance including held, release <= passed, and pack <= released', async () => {
    const client = { query: jest.fn() };
    const db = { withTransaction: jest.fn((fn) => fn(client)) } as unknown as DatabaseService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const svc = new WorkflowService(db, audit);
    const qc = userOf('u-qc', 'qc-inspector');
    const packer = userOf('u-pack', 'packing-staff');

    // Inspect with held=5, passed=85, rework=7, rejected=3 -> inspected=100
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // requireDuty
      .mockResolvedValueOnce({ rows: [] }) // previous
      .mockResolvedValueOnce({ rows: [{ ready: true }] }) // route
      .mockResolvedValueOnce({ rows: [{ inspected: 0, passed: 0, rejected: 0, rework: 0, held: 0, reworked: 0, released: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'qev-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const inspRes = await svc.inspect(qc, { bundleId, requestId: reqId, passed: 85, rework: 7, rejected: 3, held: 5 });
    expect(inspRes.balance).toEqual({
      inspected: 100, passed: 85, rejected: 3, rework: 7, held: 5, reworked: 0, released: 0,
    });

    // Release > passed -> ConflictException
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ready: true }] })
      .mockResolvedValueOnce({ rows: [{ inspected: 100, passed: 85, rejected: 3, rework: 7, held: 5, reworked: 0, released: 0 }] });
    await expect(svc.release(qc, { bundleId, requestId: reqId, quantity: 90 })).rejects.toThrow(ConflictException);

    // Pack > released -> ConflictException
    client.query
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ inspected: 100, passed: 85, rejected: 3, rework: 7, held: 5, reworked: 0, released: 80 }] })
      .mockResolvedValueOnce({ rows: [{ total: '50' }] });
    await expect(svc.pack(packer, { bundleId, requestId: reqId, quantity: 35 })).rejects.toThrow(ConflictException);
  });

  it('WorkflowService.dispatch enforces store receipt and two-party approver vs executor separation', async () => {
    const client = { query: jest.fn() };
    const db = { withTransaction: jest.fn((fn) => fn(client)) } as unknown as DatabaseService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const svc = new WorkflowService(db, audit);
    const store = userOf('u-store', 'store-dispatch');

    // Execute without store receipt -> ConflictException
    client.query
      .mockResolvedValueOnce({ rows: [{ bundle_id: bundleId }] })
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // not in manifest
      .mockResolvedValueOnce({ rows: [] }) // current dispatch
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // store receipt missing
    await expect(svc.dispatch(store, cartonId, true)).rejects.toThrow(ConflictException);

    // Same user approved and attempts execute -> ConflictException
    client.query
      .mockResolvedValueOnce({ rows: [{ bundle_id: bundleId }] })
      .mockResolvedValueOnce({ rows: [{ id: bundleId, quantity: 100, job_id: jobId, status: 'active', factory_id: facId }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ carton_id: cartonId, approved_by: 'u-store', dispatched_at: null }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] });
    await expect(svc.dispatch(store, cartonId, true)).rejects.toThrow(ConflictException);
  });

  it('AuditService redacts sensitive keys and enqueues transactional outbox with idempotencyKey', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const db = { isDatabaseConfigured: () => true } as unknown as DatabaseService;
    const outbox = { enqueueInTransaction: jest.fn().mockResolvedValue(undefined), scheduleDrain: jest.fn() } as unknown as NotificationOutboxService;
    const audit = new AuditService(db, outbox);

    await audit.record({
      organizationId: orgId,
      factoryId: facId,
      actorId: 'u-1',
      action: 'STAGE_COMPLETED',
      entityType: 'bundle',
      entityId: bundleId,
      newValues: { quantity: 50, requestId: reqId, token: 'secret-jwt' },
    }, client as never);

    expect(client.query).toHaveBeenCalledTimes(1);
    const insertedJson = client.query.mock.calls[0][1][11] as string;
    expect(insertedJson).toContain('[REDACTED]');
    expect(insertedJson).not.toContain('secret-jwt');
    expect(outbox.enqueueInTransaction).toHaveBeenCalledWith(client, expect.objectContaining({
      eventType: 'PRODUCTION_STAGE_COMPLETED',
      idempotencyKey: `PRODUCTION_STAGE_COMPLETED:${reqId}`,
    }));
    expect(outbox.scheduleDrain).toHaveBeenCalled();
  });

  it('JobWorkflowService.decide requires rejection reason and resolves job/location barcodes', async () => {
    const client = { query: jest.fn() };
    const query = jest.fn();
    const db = { isDatabaseConfigured: () => true, query, withTransaction: jest.fn((fn) => fn(client)) } as unknown as DatabaseService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const svc = new JobWorkflowService(db, audit);
    const fm = userOf('u-fm', 'factory-manager');

    await expect(svc.decide(fm, jobId, { decision: 'rejected', reason: '   ' })).rejects.toThrow(BadRequestException);

    // Barcode resolve hits storage location (4th lookup)
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'loc-1', code: 'LOC-A1', name: 'Cut Store', factoryId: facId }] });
    const loc = await svc.resolveUniversalBarcode(fm, { barcode: 'LOC-A1', symbology: 'CODE_128' });
    expect(loc).toMatchObject({ entityType: 'location', code: 'LOC-A1' });
  });
});
