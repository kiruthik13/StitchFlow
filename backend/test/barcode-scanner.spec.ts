import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { extractLookupCandidates, parseGs1Payload } from '../src/modules/jobs/barcode-processor';
import { BarcodeInput } from '../src/modules/jobs/job-workflow.dto';
import { JobWorkflowService } from '../src/modules/jobs/job-workflow.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';

const operatorUser: AuthenticatedUser = {
  id: 'user-op-1',
  email: 'op@stitchflow.dev',
  employeeId: 'EMP-OP01',
  name: 'Operator',
  role: 'operator',
  accountStatus: 'active',
  organizationId: '11111111-1111-1111-1111-111111111111',
  assignedFactoryIds: ['22222222-2222-2222-2222-222222222201'],
  primaryFactoryId: '22222222-2222-2222-2222-222222222201',
  permissions: ['CAN_LOOKUP_BARCODE'],
};

describe('Universal Industrial Barcode & GS1 Processing', () => {
  it('parses GS1-128 / GS1 DataMatrix payloads with fixed and variable AIs', () => {
    const raw = ']C1010123456789012810LOT42\x1d21SER0099\x1d37150';
    const gs1 = parseGs1Payload(raw);
    expect(gs1).toBeDefined();
    expect(gs1?.gtin).toBe('01234567890128');
    expect(gs1?.batchLot).toBe('LOT42');
    expect(gs1?.serialNumber).toBe('SER0099');
    expect(gs1?.count).toBe('150');
  });

  it('parses parenthesized GS1 QR / DataMatrix payloads and preserves leading zeros', () => {
    const raw = '(00)001234567890123455(11)261127(17)271127(21)00042';
    const gs1 = parseGs1Payload(raw);
    expect(gs1?.sscc).toBe('001234567890123455');
    expect(gs1?.productionDate).toBe('261127');
    expect(gs1?.expirationDate).toBe('271127');
    expect(gs1?.serialNumber).toBe('00042');
  });

  it('extracts candidates while stripping AIM prefixes and preserving case/zeros', () => {
    const res = extractLookupCandidates(']C000012345');
    expect(res.cleaned).toBe('00012345');
    expect(res.candidates).toContain('00012345');
  });

  it('validates Full ASCII, short numeric, and GS1 payloads in BarcodeInput DTO while rejecting control/oversized strings', async () => {
    const validInputs = [
      { barcode: '00042', inputSource: 'hid' },
      { barcode: 'BND-00521', symbology: 'CODE_128', inputSource: 'camera' },
      { barcode: '010123456789012810LOT42\x1d21SER1', symbology: 'GS1_128', inputSource: 'usb_hid' },
    ];
    for (const item of validInputs) {
      const dto = plainToInstance(BarcodeInput, item);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }

    const oversized = plainToInstance(BarcodeInput, { barcode: 'A'.repeat(600) });
    expect((await validate(oversized)).length).toBeGreaterThan(0);

    const empty = plainToInstance(BarcodeInput, { barcode: '' });
    expect((await validate(empty)).length).toBeGreaterThan(0);
  });

  it('resolves registered bundle, carton, job, or location and rejects unregistered barcodes with 404', async () => {
    const query = jest.fn()
      // 1st call: bundle miss
      .mockResolvedValueOnce({ rows: [] })
      // 2nd call: carton hit
      .mockResolvedValueOnce({
        rows: [{ id: 'ctn-1', barcode: 'CTN-001', quantity: 50, bundleId: 'bnd-1', bundleCode: 'BND-001', jobCode: 'JOB-1001', factoryId: 'fac-1' }],
      });
    const db = { isDatabaseConfigured: () => true, query } as unknown as DatabaseService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new JobWorkflowService(db, audit);

    const res = await service.resolveUniversalBarcode(operatorUser, { barcode: 'CTN-001' });
    expect(res).toMatchObject({ entityType: 'carton', barcode: 'CTN-001' });

    // Unregistered barcode across all 4 entities -> NotFoundException
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(service.resolveUniversalBarcode(operatorUser, { barcode: 'UNREGISTERED-999' })).rejects.toThrow(NotFoundException);

    // Empty/whitespace -> BadRequestException
    await expect(service.resolveUniversalBarcode(operatorUser, { barcode: '   ' })).rejects.toThrow(BadRequestException);
  });
});
