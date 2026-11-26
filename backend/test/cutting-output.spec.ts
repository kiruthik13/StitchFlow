import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../src/database/database.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { AuditService } from '../src/modules/audit/audit.service';
import { CuttingOutputService } from '../src/modules/jobs/cutting-output';

const actor: AuthenticatedUser = {
  id: 'operator-1', name: 'Line Recorder', email: 'example@example.test', role: 'operator',
  employeeId: 'EMP-10', accountStatus: 'active', organizationId: 'org-1',
  assignedFactoryIds: ['factory-1'], permissions: ['CAN_ENTER_PRODUCTION'],
};
const scope = {
  factory_id: 'factory-1', assignment_id: 'assignment-1', unit_id: 'unit-1',
  line_id: 'cutting-line-1', shift_type: 'morning', status: 'active', quantity: 100,
};
const input = { bundleId: 'bundle-1', requestId: 'request-1', quantity: 50 };

function setup() {
  const query = jest.fn();
  const client = { query };
  const db = { withTransaction: jest.fn(async callback => callback(client)) };
  const record = jest.fn();
  const service = new CuttingOutputService(db as unknown as DatabaseService, { record } as unknown as AuditService);
  return { client, query, service, record };
}

describe('Cutting line output', () => {
  it('blocks Factory Managers before accessing the database', async () => {
    const { query, service } = setup();
    await expect(service.record({ ...actor, role: 'factory-manager' }, input)).rejects.toThrow(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires an authorized assignment', async () => {
    const { query, service } = setup();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(service.record(actor, input)).rejects.toThrow(ForbiddenException);
    expect(query.mock.calls[0][1]).toEqual([actor.id, actor.organizationId, input.bundleId]);
  });

  it('rejects cumulative quantities above the bundle limit', async () => {
    const { query, service, record } = setup();
    query.mockResolvedValueOnce({ rows: [scope] }).mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '51' }] });
    await expect(service.record(actor, input)).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(3);
    expect(record).not.toHaveBeenCalled();
  });

  it('keeps line attribution separate and audits the write in the same transaction', async () => {
    const { query, service, client, record } = setup();
    query.mockResolvedValueOnce({ rows: [scope] }).mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '50' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event-1', bundleId: input.bundleId, quantity: 50 }] });
    await expect(service.record(actor, input)).resolves.toMatchObject({ id: 'event-1' });
    expect(query.mock.calls[3][1]).toEqual([
      input.bundleId, scope.assignment_id, actor.id, scope.line_id, scope.shift_type, input.requestId, input.quantity, null,
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: actor.id, action: 'CUTTING_OUTPUT_RECORDED',
      newValues: expect.objectContaining({ producingLineId: scope.line_id }),
    }), client);
  });

  it('returns the confirmed output on retry without writing another event', async () => {
    const { query, service, record } = setup();
    const prior = { id: 'event-1', bundleId: input.bundleId, quantity: input.quantity };
    query.mockResolvedValueOnce({ rows: [scope] }).mockResolvedValueOnce({ rows: [prior] });
    await expect(service.record(actor, input)).resolves.toEqual(prior);
    expect(query).toHaveBeenCalledTimes(2);
    expect(record).not.toHaveBeenCalled();
  });
});
