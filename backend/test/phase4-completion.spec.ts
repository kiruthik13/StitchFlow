import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { InlineQcService } from '../src/modules/workflow/inline-qc';

const inspector: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000003',
  organizationId: '00000000-0000-4000-8000-000000000010',
  primaryFactoryId: '00000000-0000-4000-8000-000000000020',
  assignedFactoryIds: ['00000000-0000-4000-8000-000000000020'],
  employeeId: 'EMP-0302',
  name: 'QC Inspector',
  email: 'qc@stitchflow.test',
  role: 'qc-inspector',
  accountStatus: 'active',
  permissions: ['CAN_PERFORM_QC', 'CAN_RELEASE_QC', 'CAN_LOOKUP_BARCODE'],
};

describe('Phase 4 completion: inline/intermediate QC audits', () => {
  it('records inline QC audit with alert status when defects > 0', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'inq-1',
            factoryId: inspector.primaryFactoryId,
            lineId: null,
            bundleId: null,
            stationName: 'Collar Runstitch',
            operatorName: 'Kavitha S.',
            sampleQty: 10,
            defectQty: 2,
            defectNotes: 'Skip stitch',
            status: 'alert',
            createdAt: '2026-11-26',
          }],
        }),
    };
    const db = {
      query: jest.fn(),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const service = new InlineQcService(db, audit);
    const created = await service.recordAudit(inspector, {
      factoryId: inspector.primaryFactoryId!,
      stationName: 'Collar Runstitch',
      operatorName: 'Kavitha S.',
      sampleQty: 10,
      defectQty: 2,
      defectNotes: 'Skip stitch',
    });
    expect(created.status).toBe('alert');
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('rejects inline QC audit when defects exceed sample size', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = { query: jest.fn() } as unknown as DatabaseService;
    const service = new InlineQcService(db, audit);

    await expect(
      service.recordAudit(inspector, {
        factoryId: inspector.primaryFactoryId!,
        stationName: 'Hemming',
        operatorName: 'Praveen',
        sampleQty: 5,
        defectQty: 6,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects inline QC audit outside authorized factory scope', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const client = { query: jest.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }) };
    const db = {
      query: jest.fn(),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;
    const service = new InlineQcService(db, audit);

    await expect(
      service.recordAudit(inspector, {
        factoryId: 'other-factory',
        stationName: 'Hemming',
        operatorName: 'Praveen',
        sampleQty: 10,
        defectQty: 0,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
