import { ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { RawMaterialsService } from '../src/modules/inventory/raw-materials';
import { ShipmentsService } from '../src/modules/workflow/shipments';

const storeUser: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000004',
  organizationId: '00000000-0000-4000-8000-000000000010',
  primaryFactoryId: '00000000-0000-4000-8000-000000000020',
  assignedFactoryIds: ['00000000-0000-4000-8000-000000000020'],
  employeeId: 'EMP-0410',
  name: 'Store Lead',
  email: 'store@stitchflow.test',
  role: 'store-dispatch',
  accountStatus: 'active',
  permissions: ['CAN_MANAGE_INVENTORY', 'CAN_EXECUTE_DISPATCH', 'CAN_MONITOR_DISPATCH'],
};

describe('Phase 5 completion: partial loss recovery and gate-pass output', () => {
  it('records partial loss recovery on disputed raw transfer return', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tr-1', material_id: 'mat-1', source_location_id: 'loc-1' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'mat-1' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ factory_id: storeUser.primaryFactoryId }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'tr-1',
            material_id: 'mat-1',
            source_location_id: 'loc-1',
            sender_id: storeUser.id,
            received_at: null,
            quantity: 100,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ transfer_id: 'tr-1', reported_by: 'other-user', returned_at: null }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ transfer_id: 'tr-1', recovered_quantity: 85, loss_quantity: 15, loss_reason: 'Damaged in transit' }],
        }),
    };
    const db = {
      query: jest.fn(),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const service = new RawMaterialsService(db, audit);
    const result = await service.returnTransfer(storeUser, 'tr-1', 85, 'Damaged in transit');
    expect(result.recovered_quantity).toBe(85);
    expect(result.loss_quantity).toBe(15);
    expect(audit.record).toHaveBeenCalled();
  });

  it('generates HTML and text gate-pass document for dispatched manifest', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'man-1',
            factoryName: 'Factory A',
            carrier: 'DHL',
            vehicle: 'TN-01-AB-1234',
            seal: 'SEAL-99',
            destination: 'Chennai Port',
            gatePass: 'gp-uuid-123',
            dispatchedAt: '2026-11-26T10:00:00Z',
            approvedAt: '2026-11-26T09:30:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ barcode: 'CTN-001', jobCode: 'JOB-1001', size: 'M', color: 'Navy', quantity: 50 }],
        }),
    } as unknown as DatabaseService;

    const shipments = new ShipmentsService(db, audit);
    const doc = await shipments.gatePassDocument(storeUser, 'man-1');
    expect(doc.totalQty).toBe(50);
    expect(doc.html).toContain('STITCHFLOW GATE PASS');
    expect(doc.html).toContain('CTN-001');
    expect(doc.text).toContain('gp-uuid-123');
  });

  it('rejects gate-pass document before dispatch execution', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{
          id: 'man-1',
          factoryName: 'Factory A',
          carrier: 'DHL',
          vehicle: 'TN-01',
          seal: 'SEAL-1',
          destination: 'Port',
          gatePass: null,
          dispatchedAt: null,
          approvedAt: null,
        }],
      }),
    } as unknown as DatabaseService;

    const shipments = new ShipmentsService(db, audit);
    await expect(shipments.gatePassDocument(storeUser, 'man-1')).rejects.toThrow(ConflictException);
  });
});
