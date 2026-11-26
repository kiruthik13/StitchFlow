import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CutStockService } from '../src/modules/inventory/cut-stock.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';

const sender: AuthenticatedUser = {
  id: 'operator', organizationId: 'org', employeeId: 'EMP-01', name: 'Operator', email: 'worker@example.test',
  role: 'operator', accountStatus: 'active', assignedFactoryIds: ['factory'], permissions: ['CAN_ENTER_PRODUCTION'],
};
const store: AuthenticatedUser = { ...sender, id: 'store', role: 'store-dispatch', permissions: ['CAN_MANAGE_INVENTORY'] };
const bundle = { bundleId: 'bundle', locationId: 'location', requestId: 'request', quantity: 10 };
const scope = {
  job_id: 'job', factory_id: 'factory', status: 'active', line_id: 'line', unit_id: 'unit', department_id: 'department',
};
const pending = { id: 'handover', direction: 'output-in', sender_id: sender.id, status: 'pending', quantity: 10 };

function setup() {
  const query = jest.fn();
  const client = { query };
  const record = jest.fn();
  const db = { withTransaction: jest.fn(async callback => callback(client)) };
  return {
    query, client, record,
    service: new CutStockService(db as unknown as DatabaseService, { record } as unknown as AuditService),
  };
}

describe('Cut stock handovers', () => {
  it('blocks an unassigned operator from sending cutting output', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ eligible: false, cut: '30', reserved: '0' }] });
    await expect(service.propose(sender, bundle, 'output-in')).rejects.toThrow(ForbiddenException);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('rejects an issue above the stock balance after pending reservations', async () => {
    const { service, query, record } = setup();
    query.mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ balance: '9' }] });
    await expect(service.propose(store, bundle, 'output-out', 'line')).rejects.toThrow(ConflictException);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE OF b, j');
    expect(query.mock.calls[2][0]).toContain('d.approved_at IS NULL');
    expect(record).not.toHaveBeenCalled();
  });

  it('does not settle stock when received quantity differs', async () => {
    const { service, query, record } = setup();
    query.mockResolvedValueOnce({ rows: [{ bundle_id: 'bundle', location_id: 'location' }] })
      .mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rows: [pending] });
    await expect(service.decide(store, 'handover', { status: 'received', actualQuantity: 9 })).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(3);
    expect(record).not.toHaveBeenCalled();
  });

  it('prevents the sender from confirming their own handover', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce({ rows: [{ bundle_id: 'bundle', location_id: 'location' }] })
      .mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rows: [pending] });
    await expect(service.decide(sender, 'handover', { status: 'received', actualQuantity: 10 })).rejects.toThrow(ForbiddenException);
  });

  it('audits an accepted receipt in the transaction and preserves the matched quantity', async () => {
    const { service, query, record, client } = setup();
    const accepted = { ...pending, receiver_id: store.id, status: 'received', received_quantity: 10 };
    query.mockResolvedValueOnce({ rows: [{ bundle_id: 'bundle', location_id: 'location' }] })
      .mockResolvedValueOnce({ rows: [scope] })
      .mockResolvedValueOnce({ rows: [pending] })
      .mockResolvedValueOnce({ rows: [accepted] });
    await expect(service.decide(store, 'handover', { status: 'received', actualQuantity: 10 })).resolves.toEqual(accepted);
    expect(query.mock.calls[3][1]).toEqual(['handover', 'received', store.id, 10, null]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CUT_STOCK_HANDOVER_DECIDED' }), client);
  });
});
