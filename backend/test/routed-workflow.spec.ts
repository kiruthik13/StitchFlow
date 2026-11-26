import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../src/modules/audit/audit.service';
import { DatabaseService } from '../src/database/database.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { WorkflowService } from '../src/modules/workflow/workflow.service';
import { applyInspection, applyReinspection } from '../src/modules/workflow/quality-balance';

const base = { inspected: 0, passed: 0, held: 0, rejected: 0, rework: 0, reworked: 0, released: 0 };
const actor: AuthenticatedUser = {
  id: 'employee', email: 'person@example.test', employeeId: 'EMP-01', name: 'Person', role: 'operator',
  accountStatus: 'active', organizationId: 'org', assignedFactoryIds: ['factory'], permissions: ['CAN_ENTER_PRODUCTION'],
};
const scope = { id: 'bundle', job_id: 'job', factory_id: 'factory', quantity: 100, status: 'active' };
const request = { bundleId: 'bundle', requestId: 'event', quantity: 10 };

function setup() {
  const query = jest.fn();
  const client = { query };
  const record = jest.fn();
  const db = { withTransaction: jest.fn(async callback => callback(client)) };
  return { query, client, record, service: new WorkflowService(db as unknown as DatabaseService, { record } as unknown as AuditService) };
}

describe('Quality quantity reconciliation', () => {
  it('keeps unique production and final rejection totals after rework', () => {
    const before = applyInspection(base, 1000, {
      bundleId: 'b', requestId: 'a', passed: 850, rejected: 50, rework: 100, held: 0,
    });
    const after = applyReinspection({ ...before, reworked: 100 }, {
      bundleId: 'b', requestId: 'b', fromRework: 100, fromHold: 0, passed: 100, rejected: 0, rework: 0, held: 0,
    });
    expect(after).toMatchObject({ inspected: 1000, passed: 950, rejected: 50, rework: 0, reworked: 0 });
  });

  it('rejects attempts to reinspect unfinished rework', () => {
    expect(() => applyReinspection({ ...base, inspected: 100, rework: 100, reworked: 3 }, {
      bundleId: 'b', requestId: 'b', fromRework: 4, fromHold: 0, passed: 4, rejected: 0, rework: 0, held: 0,
    })).toThrow(ConflictException);
  });

  it('rejects reinspection outcomes that do not match selected pieces', () => {
    expect(() => applyReinspection(base, {
      bundleId: 'b', requestId: 'b', fromRework: 1, fromHold: 0, passed: 2, rejected: 0, rework: 0, held: 0,
    })).toThrow(BadRequestException);
  });
});

describe('Production, packing and dispatch transactions', () => {
  it('prevents skipping a configured earlier stage', async () => {
    const { query, record, service } = setup();
    query.mockResolvedValueOnce({ rows: [scope] }).mockResolvedValueOnce({ rows: [{ eligible: true, ordinal: 2 }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ available: 0 }] });
    await expect(service.completeStage(actor, { bundleId: 'bundle', requestId: 'r', stepId: 'step' }))
      .rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });

  it('prevents a Factory Manager from releasing quality', async () => {
    const { query, service } = setup();
    await expect(service.release({ ...actor, role: 'factory-manager' }, request)).rejects.toThrow(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects packing over the released balance after earlier cartons', async () => {
    const { query, record, service } = setup();
    query.mockResolvedValueOnce({ rows: [scope] }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ released: 15 }] })
      .mockResolvedValueOnce({ rows: [{ total: '6' }] });
    await expect(service.pack({ ...actor, role: 'packing-staff' }, request)).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });

  it('requires finished-goods receipt before dispatch approval', async () => {
    const { query, record, service } = setup();
    query.mockResolvedValueOnce({ rows: [{ bundle_id: 'bundle' }] }).mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 0 });
    await expect(service.dispatch({ ...actor, role: 'factory-manager' }, 'carton', false)).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });
});
