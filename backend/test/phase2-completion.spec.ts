import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { JobWorkflowService } from '../src/modules/jobs/job-workflow.service';
import { SpecializedMastersService } from '../src/modules/jobs/specialized-masters';
import { RedisService } from '../src/modules/redis/redis.service';
import { UsersService } from '../src/modules/users/users.service';

const actor: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000010',
  primaryFactoryId: '00000000-0000-4000-8000-000000000020',
  assignedFactoryIds: ['00000000-0000-4000-8000-000000000020'],
  employeeId: 'EMP-0001',
  name: 'Factory Manager',
  email: 'fm@stitchflow.test',
  role: 'factory-manager',
  accountStatus: 'active',
  permissions: ['CAN_MANAGE_JOBS', 'CAN_MANAGE_USERS', 'CAN_LOOKUP_BARCODE'],
};

describe('Phase 2 completion: specialized masters, thermal tags, and employee roster', () => {
  it('creates cutting master, config, and tailor mapping with audit entries', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'cm-1', factoryId: actor.primaryFactoryId, code: 'CM-01', name: 'Raju', phone: null, specialization: 'Denim', isActive: true }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'cfg-1', factoryId: actor.primaryFactoryId, configKey: 'shift_hours', configValue: '8', description: null, updatedAt: '2026-11-26' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'tm-1', factoryId: actor.primaryFactoryId, lineId: 'line-1', operatorName: 'Kavitha', employeeId: 'EMP-205', operationName: 'Collar', machineCode: 'M-01', targetPace: 45, actualPace: 48, status: 'optimal', isActive: true }],
        }),
    };
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] }),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const service = new SpecializedMastersService(db, audit);
    const cm = await service.createCuttingMaster(actor, {
      factoryId: actor.primaryFactoryId!,
      code: 'CM-01',
      name: 'Raju',
      specialization: 'Denim',
    });
    expect(cm.code).toBe('CM-01');

    const cfg = await service.upsertConfig(actor, {
      factoryId: actor.primaryFactoryId!,
      configKey: 'shift_hours',
      configValue: '8',
    });
    expect(cfg.configKey).toBe('shift_hours');

    const tm = await service.createTailorMapping(actor, {
      factoryId: actor.primaryFactoryId!,
      lineId: 'line-1',
      operatorName: 'Kavitha',
      employeeId: 'EMP-205',
      operationName: 'Collar',
      machineCode: 'M-01',
      targetPace: 45,
      actualPace: 48,
    });
    expect(tm.machineCode).toBe('M-01');
    expect(audit.record).toHaveBeenCalledTimes(3);
  });

  it('rejects specialized master creation outside factory scope', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    } as unknown as DatabaseService;
    const service = new SpecializedMastersService(db, audit);

    await expect(
      service.createRank(actor, { factoryId: 'other-factory', code: 'R1', name: 'Grade A' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('generates ZPL and TSPL thermal tag payloads and includes them on reprint', async () => {
    const bundle = {
      id: 'bnd-1',
      bundleCode: 'BND-00521',
      jobId: 'job-1',
      jobCode: 'JOB-1001',
      factoryId: actor.primaryFactoryId!,
      lineId: 'line-1',
      size: 'M',
      color: 'Navy',
      quantity: 50,
      createdAt: '2026-11-26',
      requestId: 'req-1',
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [bundle] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'log-12345678' }] }),
    };
    const db = {
      query: jest.fn().mockResolvedValue({ rows: [bundle] }),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const workflow = new JobWorkflowService(db, audit);
    const zpl = await workflow.tagPayload(actor, 'bnd-1', 'zpl');
    expect(zpl.payload).toContain('^XA');
    expect(zpl.payload).toContain('BND-00521');
    expect(zpl.payload).toContain('^XZ');

    const tspl = await workflow.tagPayload(actor, 'bnd-1', 'tspl');
    expect(tspl.payload).toContain('SIZE 50 mm, 30 mm');
    expect(tspl.payload).toContain('BARCODE');
    expect(tspl.payload).toContain('BND-00521');

    const reprint = await workflow.reprint(actor, 'bnd-1', {
      requestId: 'req-1',
      reason: 'Torn tag',
    });
    expect(reprint.zplPayload).toContain('REPRINT: log-1234');
    expect(reprint.tsplPayload).toContain('REPRINT log-1234');
  });

  it('provisions and toggles employee roster entries with duplicate protection', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const redis = { invalidateUserAuthCache: jest.fn() } as unknown as RedisService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{ employeeId: 'EMP-0999', email: 'tailor@stitchflow.test', factoryId: actor.primaryFactoryId, isActive: true }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockRejectedValueOnce({ code: '23505' }),
    };
    const db = {
      query: jest.fn(),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const users = new UsersService(db, redis, audit);
    const created = await users.provisionRoster(actor, {
      employeeId: 'EMP-0999',
      email: 'Tailor@StitchFlow.test',
      factoryId: actor.primaryFactoryId!,
    });
    expect(created.email).toBe('tailor@stitchflow.test');

    await expect(
      users.provisionRoster(actor, {
        employeeId: 'EMP-0999',
        email: 'tailor@stitchflow.test',
        factoryId: actor.primaryFactoryId!,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
