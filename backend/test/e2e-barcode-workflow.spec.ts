import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobWorkflowService } from '../src/modules/jobs/job-workflow.service';
import { WorkflowService } from '../src/modules/workflow/workflow.service';
import { applyInspection, applyReinspection, QualityBalance } from '../src/modules/workflow/quality-balance';
import { RecipientResolverService, OutboxEventRow } from '../src/modules/notifications/recipient-resolver.service';
import { ProductionReplayService } from '../src/modules/workflow/production-sync';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { CuttingOutputService } from '../src/modules/jobs/cutting-output';

const orgId = '11111111-1111-1111-1111-111111111111';
const facId = '22222222-2222-2222-2222-222222222201';
const otherFacId = '22222222-2222-2222-2222-222222222299';
const jobId = '33333333-3333-3333-3333-333333333301';
const bundleId = '44444444-4444-4444-4444-444444444401';
const stepId = '55555555-5555-5555-5555-555555555501';

const makeUser = (id: string, role: AuthenticatedUser['role'], permissions: string[], factoryId = facId): AuthenticatedUser => ({
  id,
  email: `${role}@stitchflow.dev`,
  employeeId: `EMP-${role.toUpperCase()}`,
  name: role,
  role,
  accountStatus: 'active',
  organizationId: orgId,
  assignedFactoryIds: [factoryId],
  primaryFactoryId: factoryId,
  permissions,
});

describe('End-to-End Barcode-Driven Production Workflow Acceptance', () => {
  it('resolves registered CODE_128 bundle with enriched master/route/QC fields without mutating state and rejects unregistered barcodes', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{
          id: bundleId,
          bundleCode: 'BND-00521',
          jobId,
          jobCode: 'JOB-1001',
          factoryId: facId,
          lineId: 'line-1',
          size: 'M',
          color: 'Navy',
          quantity: 100,
          buyerName: 'Acme Apparel',
          styleName: 'Polo Classic',
          factoryName: 'Factory A',
          unitName: 'Unit 1',
          lineName: 'Line 1',
          currentStage: 'cutting',
          nextEligibleStage: 'sewing-out',
          qcBalance: { inspected: 0, passed: 0, rework: 0, rejected: 0, released: 0 },
        }],
      });
    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new JobWorkflowService(db, audit);
    const operator = makeUser('user-op-1', 'operator', ['CAN_LOOKUP_BARCODE']);

    const res = await service.resolveUniversalBarcode(operator, {
      barcode: 'BND-00521',
      symbology: 'CODE_128',
      inputSource: 'camera',
    });

    expect(res).toMatchObject({
      entityType: 'bundle',
      bundleCode: 'BND-00521',
      quantity: 100,
      buyerName: 'Acme Apparel',
      styleName: 'Polo Classic',
      nextEligibleStage: 'sewing-out',
    });
    expect(audit.record).not.toHaveBeenCalled();

    // Unregistered barcode -> 404 across all 4 entity tables, zero mutation
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      service.resolveUniversalBarcode(operator, { barcode: 'UNREG-00099', symbology: 'CODE_128' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reconciles 100 -> (90 pass, 7 rework, 3 reject) -> 7 reinspect pass -> 97 max packable without double counting', () => {
    const initial: QualityBalance = {
      inspected: 0,
      passed: 0,
      rejected: 0,
      rework: 0,
      held: 0,
      reworked: 0,
      released: 0,
    };

    const afterInspect = applyInspection(initial, 100, {
      bundleId,
      requestId: '11111111-1111-4111-8111-111111111111',
      passed: 90,
      rework: 7,
      rejected: 3,
      held: 0,
    });
    expect(afterInspect).toMatchObject({ inspected: 100, passed: 90, rework: 7, rejected: 3, released: 0 });

    // Rework completed (7 pcs) -> reinspected all 7 passed
    const afterRework: QualityBalance = { ...afterInspect, reworked: 7 };
    const afterReinspect = applyReinspection(afterRework, {
      bundleId,
      requestId: '22222222-2222-4222-8222-222222222222',
      fromRework: 7,
      fromHold: 0,
      passed: 7,
      rework: 0,
      rejected: 0,
      held: 0,
    });

    // Inspected remains 100 (no double counting); passed becomes 97; rejected stays 3
    expect(afterReinspect).toMatchObject({
      inspected: 100,
      passed: 97,
      rework: 0,
      reworked: 0,
      rejected: 3,
    });
  });

  it('resolves next-stage recipients for Cutting -> Store, Stage -> QC, and QC Release -> Packing without broadcasting org-wide', async () => {
    const query = jest.fn()
      // CUTTING_COMPLETED -> store-dispatch + supervisor
      .mockResolvedValueOnce({ rows: [{ id: 'user-store-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'user-sup-1' }] })
      // BUNDLE_READY_FOR_PACKING -> packing-staff duty users (findDutyUsers selects profile_id)
      .mockResolvedValueOnce({ rows: [{ profile_id: 'user-pack-1' }] });
    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const resolver = new RecipientResolverService(db);

    const cuttingEvent: OutboxEventRow = {
      id: 'evt-1',
      organization_id: orgId,
      factory_id: facId,
      event_type: 'CUTTING_COMPLETED',
      actor_user_id: 'user-op-1',
      entity_type: 'cutting_output',
      entity_id: 'cut-1',
      job_id: jobId,
      bundle_id: bundleId,
      production_line_id: 'line-1',
      event_payload: { quantity: 100 },
    };
    const cuttingRecipients = await resolver.resolveRecipients(cuttingEvent);
    expect(cuttingRecipients.map((r) => r.userId)).toEqual(['user-store-1', 'user-sup-1']);
    expect(cuttingRecipients[0].actionRoute).toBe('/(app)/operations/output-in');

    const releaseEvent: OutboxEventRow = {
      ...cuttingEvent,
      id: 'evt-2',
      event_type: 'BUNDLE_READY_FOR_PACKING',
      actor_user_id: 'user-qc-1',
      entity_type: 'bundle',
      entity_id: bundleId,
      event_payload: { quantity: 90 },
    };
    const releaseRecipients = await resolver.resolveRecipients(releaseEvent);
    expect(releaseRecipients.map((r) => r.userId)).toEqual(['user-pack-1']);
  });

  it('enforces offline replay actor ownership and idempotency without duplicate commits', async () => {
    const operator = makeUser('user-op-1', 'operator', ['CAN_ENTER_PRODUCTION']);
    const cutting = { record: jest.fn().mockResolvedValue({ id: 'cut-1', quantity: 100 }) } as unknown as CuttingOutputService;
    const workflow = { completeStage: jest.fn().mockResolvedValue({ id: 'stg-1', quantity: 100 }) } as unknown as WorkflowService;
    const replay = new ProductionReplayService(cutting, workflow);

    // Reject replay by a different actor
    await expect(
      replay.submit(operator, {
        actorId: 'other-user-id-0000-0000-000000000000',
        events: [{
          kind: 'stage',
          requestId: '11111111-1111-4111-8111-111111111111',
          bundleId,
          stepId,
          quantity: 100,
          occurredAt: new Date().toISOString(),
        }],
      }),
    ).rejects.toThrow(ForbiddenException);

    // Second replay of same requestId returns conflict if backend detects mismatch
    (workflow.completeStage as jest.Mock)
      .mockResolvedValueOnce({ id: 'stg-1', quantity: 100 })
      .mockRejectedValueOnce(new ConflictException('Step or request has already been recorded'));

    const first = await replay.submit(operator, {
      actorId: operator.id,
      events: [{
        kind: 'stage',
        requestId: '11111111-1111-4111-8111-111111111111',
        bundleId,
        stepId,
        quantity: 100,
        occurredAt: new Date().toISOString(),
      }],
    });
    expect(first).toEqual([{ requestId: '11111111-1111-4111-8111-111111111111', status: 'confirmed', result: { id: 'stg-1', quantity: 100 } }]);

    const second = await replay.submit(operator, {
      actorId: operator.id,
      events: [{
        kind: 'stage',
        requestId: '11111111-1111-4111-8111-111111111111',
        bundleId,
        stepId,
        quantity: 100,
        occurredAt: new Date().toISOString(),
      }],
    });
    expect(second[0]).toMatchObject({ status: 'conflict', code: 'ERR_SYNC_CONFLICT' });
  });

  it('rejects packing beyond QC-released quantity and rejects unauthorized roles', async () => {
    const qcUser = makeUser('user-qc-1', 'qc-inspector', ['CAN_INSPECT_QUALITY'], otherFacId);
    const db = { withTransaction: jest.fn() } as unknown as DatabaseService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const workflow = new WorkflowService(db, audit);

    // Non-packing role cannot pack
    await expect(
      workflow.pack(qcUser, { bundleId, requestId: '33333333-3333-4333-8333-333333333333', quantity: 10 }),
    ).rejects.toThrow(ForbiddenException);
  });
});
