import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { RawMaterialsService } from '../src/modules/inventory/raw-materials';
import { csvCell } from '../src/modules/planning/dashboard-reports';
import { ShipmentsService } from '../src/modules/workflow/shipments';
import { WorkflowService } from '../src/modules/workflow/workflow.service';

const store: AuthenticatedUser = {
  id: 'store', role: 'store-dispatch', organizationId: 'org', accountStatus: 'active', employeeId: 'EMP-10',
  name: 'Store Receiver', email: 'employee@example.test', assignedFactoryIds: ['factory'],
  permissions: ['CAN_MANAGE_INVENTORY', 'CAN_EXECUTE_DISPATCH'],
};

function setup() {
  const query = jest.fn();
  const client = { query };
  const db = { withTransaction: jest.fn(async callback => callback(client)) } as unknown as DatabaseService;
  const record = jest.fn();
  const audit = { record } as unknown as AuditService;
  return {
    query, record,
    raw: new RawMaterialsService(db, audit), shipments: new ShipmentsService(db, audit),
    workflow: new WorkflowService(db, audit),
  };
}

describe('Raw-material transfer transactions', () => {
  it('prevents excess issues under the material lock', async () => {
    const { raw, query, record } = setup();
    query.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ factory_id: 'factory' }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ quantity: '9' }] });
    await expect(raw.move(store, {
      materialId: 'm', locationId: 'l', requestId: 'r', quantity: 10, reference: 'ISS-1',
    }, 'issue')).rejects.toThrow(ConflictException);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(record).not.toHaveBeenCalled();
  });

  it('issues from the assigned source location and credits the destination only on receipt', async () => {
    const { raw, query } = setup();
    query.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ factory_id: 'factory' }] })
      .mockResolvedValueOnce({ rows: [{ factory_id: 'destination' }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ quantity: '20' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'transfer-1' }] });
    await expect(raw.send(store, {
      materialId: 'm', locationId: 'l', destinationLocationId: 'd', requestId: 'r', quantity: 10,
    })).resolves.toMatchObject({ id: 'transfer-1' });
    expect(query.mock.calls[6][1]).toEqual(['m', 'l', store.id, 'transfer-1', 'transfer-out', 10]);
    expect(query.mock.calls.some(call => call[1]?.includes('transfer-in'))).toBe(false);
  });

  it('blocks a receiver from settling a transfer they sent', async () => {
    const { raw, query, record } = setup();
    const transfer = { id: 'transfer-1', material_id: 'm', destination_location_id: 'd', sender_id: store.id, quantity: 10 };
    query.mockResolvedValueOnce({ rows: [transfer] }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ factory_id: 'destination' }] }).mockResolvedValueOnce({ rows: [transfer] });
    await expect(raw.receive(store, 'transfer-1', 10)).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('Partial stage output and shipment manifests', () => {
  it('records a partial quantity rather than multiplying the whole bundle', async () => {
    const { workflow, query, record } = setup();
    query.mockResolvedValueOnce({ rows: [{ id: 'bundle', job_id: 'job', factory_id: 'factory', quantity: 100, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ eligible: true, stage_code: 'sewing-out' }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ available: 25 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event', quantity: 10 }] });
    await expect(workflow.completeStage({ ...store, role: 'operator' }, {
      bundleId: 'bundle', stepId: 'step', requestId: 'req', quantity: 10,
    })).resolves.toMatchObject({ quantity: 10 });
    expect(query.mock.calls[4][1]).toContain(10);
    expect(record).toHaveBeenCalled();
  });

  it('prevents shipment execution before separate approval', async () => {
    const { shipments, query, record } = setup();
    query.mockResolvedValueOnce({ rows: [{ id: 'manifest', approved_by: null }] });
    await expect(shipments.transition(store, 'manifest', true)).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });

  it('rejects a manifest containing a carton already claimed individually or by another shipment', async () => {
    const { shipments, query, record } = setup();
    query.mockResolvedValueOnce({ rows: [{ carton_id: 'carton', status: 'active' }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 1 });
    await expect(shipments.create(store, {
      factoryId: 'factory', requestId: 'req', cartonIds: ['carton'], carrier: 'Carrier',
      vehicle: 'Vehicle', seal: 'Seal', destination: 'Destination',
    })).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('Production export CSV values', () => {
  it('quotes CSV delimiters and neutralizes spreadsheet formulas', () => {
    expect(csvCell('Job, "A"')).toBe('"Job, ""A"""');
    expect(csvCell(' =3+2')).toBe('"\' =3+2"');
    expect(csvCell(28)).toBe('"28"');
  });
});

describe('Authenticated production replay', () => {
  const replayInput = {
    actorId: store.id,
    events: [
      { kind: 'cutting' as const, requestId: 'req-1', bundleId: 'bundle', quantity: 2, occurredAt: '2026-11-26T10:00:00Z' },
      { kind: 'stage' as const, requestId: 'req-2', bundleId: 'bundle', quantity: 2, stepId: 'step', occurredAt: '2026-11-26T10:30:00Z' },
    ],
  };

  it('blocks replay for another employee before invoking either production service', async () => {
    const { ProductionReplayService } = await import('../src/modules/workflow/production-sync');
    const { CuttingOutputService } = await import('../src/modules/jobs/cutting-output');
    const cutting = { record: jest.fn() };
    const workflow = { completeStage: jest.fn() };
    const service = new ProductionReplayService(cutting as unknown as InstanceType<typeof CuttingOutputService>,
      workflow as unknown as WorkflowService);
    await expect(service.submit({ ...store, id: 'other' }, replayInput)).rejects.toThrow(ForbiddenException);
    expect(cutting.record).not.toHaveBeenCalled();
    expect(workflow.completeStage).not.toHaveBeenCalled();
  });

  it('reports confirmed and conflicted events without treating both as accepted', async () => {
    const { ProductionReplayService } = await import('../src/modules/workflow/production-sync');
    const { CuttingOutputService } = await import('../src/modules/jobs/cutting-output');
    const cutting = { record: jest.fn().mockResolvedValue({ id: 'confirmed-event' }) };
    const workflow = { completeStage: jest.fn().mockRejectedValue(new ConflictException()) };
    const service = new ProductionReplayService(cutting as unknown as InstanceType<typeof CuttingOutputService>,
      workflow as unknown as WorkflowService);
    await expect(service.submit(store, replayInput)).resolves.toEqual([
      { requestId: 'req-1', status: 'confirmed', result: { id: 'confirmed-event' } },
      { requestId: 'req-2', status: 'conflict', code: 'ERR_SYNC_CONFLICT' },
    ]);
  });
});

describe('Physical stock count adjustment', () => {
  it('rejects a stale count instead of overwriting intervening stock movements', async () => {
    const { raw, query, record } = setup();
    const count = { id: 'count', material_id: 'material', location_id: 'location', actor_id: store.id,
      expected_quantity: '10', observed_quantity: 9 };
    query.mockResolvedValueOnce({ rows: [count] }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ factory_id: 'factory' }] })
      .mockResolvedValueOnce({ rows: [count] }).mockResolvedValueOnce({ rows: [{ quantity: '11' }] });
    await expect(raw.approveCount({ ...store, role: 'factory-manager', id: 'manager' }, 'count'))
      .rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(5);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('Disputed raw transfers', () => {
  it('does not credit the destination after a discrepancy was reported', async () => {
    const { raw, query, record } = setup();
    const transfer = { id: 'transfer-1', material_id: 'm', destination_location_id: 'd', sender_id: 'sender', quantity: 10 };
    query.mockResolvedValueOnce({ rows: [transfer] }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ factory_id: 'destination' }] }).mockResolvedValueOnce({ rows: [transfer] })
      .mockResolvedValueOnce({ rowCount: 1 });
    await expect(raw.receive(store, 'transfer-1', 10)).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(5);
  });
});
