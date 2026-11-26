import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JobClosingService } from '../src/modules/jobs/job-closing.service';
import { CutStockService } from '../src/modules/inventory/cut-stock.service';
import { summarizeQueues } from '../src/modules/planning/workflow-queues';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';

const manager: AuthenticatedUser = {
  id: 'fm', organizationId: 'org', employeeId: 'EMP-01', name: 'Manager', email: 'manager@example.test',
  role: 'factory-manager', accountStatus: 'active', assignedFactoryIds: ['factory'], permissions: ['CAN_CLOSE_JOB'],
};
const job = { factory_id: 'factory', order_quantity: 100, status: 'active' };
const rollup = { allocated: '100', rejected: '2', allowed_rejected: 2, unsettled: false };

function setup() {
  const query = jest.fn();
  const client = { query };
  const record = jest.fn();
  const db = { withTransaction: jest.fn(async callback => callback(client)) } as unknown as DatabaseService;
  const audit = { record } as unknown as AuditService;
  return { client, query, record, closure: new JobClosingService(db, audit), inventory: new CutStockService(db, audit) };
}

describe('Job closing reconciliation', () => {
  it('locks the job, enforces reconciliation, and audits a successful close', async () => {
    const { closure, query, client, record } = setup();
    query.mockResolvedValueOnce({ rows: [job] }).mockResolvedValueOnce({ rows: [rollup] });
    await expect(closure.close(manager, 'job')).resolves.toEqual({ jobId: 'job', status: 'closed' });
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE OF j');
    expect(query.mock.calls[1][0]).toContain('shipping.packed <> shipping.dispatched');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'JOB_STATUS_CHANGED', newValues: { status: 'closed', orderQuantity: 100, rejectedQuantity: 2 },
    }), client);
  });

  it.each([{ ...rollup, unsettled: true }, { ...rollup, allowed_rejected: 1 }, { ...rollup, allocated: '99' }])(
    'does not close a job with an invalid rollup %j', async invalid => {
      const { closure, query, record } = setup();
      query.mockResolvedValueOnce({ rows: [job] }).mockResolvedValueOnce({ rows: [invalid] });
      await expect(closure.close(manager, 'job')).rejects.toThrow(ConflictException);
      expect(query).toHaveBeenCalledTimes(2);
      expect(record).not.toHaveBeenCalled();
    },
  );

  it('does not permit changing the rejection allowance after job activation', async () => {
    const { closure, query } = setup();
    query.mockResolvedValueOnce({ rows: [job] });
    await expect(closure.configure(manager, 'job', { maxRejectedQuantity: 10, reason: 'Customer approved' }))
      .rejects.toThrow(ConflictException);
  });
});

describe('Cut stock discrepancy returns', () => {
  const handover = { status: 'rejected', bundle_id: 'bundle', location_id: 'location', quantity: 10, sender_id: 'operator', direction: 'output-in' };
  it('requires the sender to verify the full physical return', async () => {
    const { inventory, query } = setup();
    query.mockResolvedValueOnce({ rows: [handover] }).mockResolvedValueOnce({ rows: [{ factory_id: 'factory' }] })
      .mockResolvedValueOnce({ rows: [handover] });
    await expect(inventory.verifyReturn({ ...manager, id: 'operator', role: 'operator' }, 'hand', {
      verifiedQuantity: 9, reason: 'One piece missing',
    })).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('requires a separate manager to approve a verified stock return', async () => {
    const { inventory, query } = setup();
    await expect(inventory.approveReturn({ ...manager, role: 'store-dispatch' }, 'hand')).rejects.toThrow(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Rework-aware queue estimates', () => {
  it('does not invent throughput for stalled work and ranks measured backlog by expected wait', () => {
    const queues = summarizeQueues([
      { key: 'rework', ordinal: 101, pending: '20', completed_7d: '0' },
      { key: 'quality', ordinal: 100, pending: '14', completed_7d: '7' },
      { key: 'packing', ordinal: 102, pending: '42', completed_7d: '42' },
      { key: 'sewing', ordinal: 1, pending: '0', completed_7d: '7' },
    ]);
    expect(queues.map(queue => [queue.stage, queue.estimatedQueueDays])).toEqual([
      ['rework', null], ['quality', 14], ['packing', 7], ['sewing', 0],
    ]);
  });
});
