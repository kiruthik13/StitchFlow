import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ProductionFloorService } from '../src/modules/workflow/production-floor';

const actor: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000002',
  organizationId: '00000000-0000-4000-8000-000000000010',
  primaryFactoryId: '00000000-0000-4000-8000-000000000020',
  assignedFactoryIds: ['00000000-0000-4000-8000-000000000020'],
  employeeId: 'EMP-0205',
  name: 'Line Operator',
  email: 'op@stitchflow.test',
  role: 'operator',
  accountStatus: 'active',
  permissions: ['CAN_ENTER_PRODUCTION', 'CAN_LOOKUP_BARCODE'],
};

describe('Phase 3 completion: production issues and work assignments', () => {
  it('records production issue and work assignment with audit entries', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'iss-1',
            factoryId: actor.primaryFactoryId,
            category: 'machine',
            machineCode: 'M-L1-08',
            stoppageMinutes: 15,
            description: 'Needle bar oil leak',
            status: 'open',
            createdAt: '2026-11-26',
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'wa-1',
            factoryId: actor.primaryFactoryId,
            bundleId: 'bnd-1',
            operatorName: 'Kavitha Selvam',
            operatorEmployeeId: 'EMP-0205',
            stageName: 'Sewing',
            status: 'assigned',
            createdAt: '2026-11-26',
          }],
        }),
    };
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] }),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const service = new ProductionFloorService(db, audit);
    const issue = await service.reportIssue(actor, {
      factoryId: actor.primaryFactoryId!,
      category: 'machine',
      machineCode: 'M-L1-08',
      stoppageMinutes: 15,
      description: 'Needle bar oil leak',
    });
    expect(issue.status).toBe('open');

    const assignment = await service.createAssignment(actor, {
      factoryId: actor.primaryFactoryId!,
      bundleId: 'bnd-1',
      operatorName: 'Kavitha Selvam',
      operatorEmployeeId: 'EMP-0205',
      stageName: 'Sewing',
    });
    expect(assignment.stageName).toBe('Sewing');
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it('rejects work assignment when bundle is outside the factory', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }),
    };
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] }),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const service = new ProductionFloorService(db, audit);
    await expect(
      service.createAssignment(actor, {
        factoryId: actor.primaryFactoryId!,
        bundleId: 'foreign-bundle',
        operatorName: 'Kavitha',
        stageName: 'Sewing',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects issue reporting outside authorized factory scope', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    } as unknown as DatabaseService;

    const service = new ProductionFloorService(db, audit);
    await expect(
      service.reportIssue(actor, {
        factoryId: 'other-factory',
        category: 'needle',
        machineCode: 'M-01',
        stoppageMinutes: 5,
        description: 'Broken needle',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
