import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PlanningIntelligenceService, predictDeliveryDate } from '../src/modules/planning/intelligence';

const manager: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000010',
  primaryFactoryId: '00000000-0000-4000-8000-000000000020',
  assignedFactoryIds: ['00000000-0000-4000-8000-000000000020'],
  employeeId: 'EMP-0001',
  name: 'Factory Manager',
  email: 'fm@stitchflow.test',
  role: 'factory-manager',
  accountStatus: 'active',
  permissions: ['CAN_MANAGE_JOBS', 'CAN_VIEW_REPORTS'],
};

describe('Phase 6 completion: SAM/workforce planning, bottlenecks, and calendar prediction', () => {
  it('predicts calendar delivery date skipping Sundays and factory holidays with rework load', () => {
    const result = predictDeliveryDate({
      remainingQty: 180,
      reworkQty: 20,
      dailyCapacity: 100,
      startDate: '2026-11-28', // Saturday
      targetDate: '2026-11-30', // Monday
      holidays: ['2026-11-30'], // Monday is a holiday
    });
    // 200 pcs / 100 per day = 2 working days: Sat (2026-11-28) + Tue (2026-12-01, skipping Sun Nov 29 & Holiday Nov 30)
    expect(result.workingDaysNeeded).toBe(2);
    expect(result.predictedDate).toBe('2026-12-01');
    expect(result.daysDelta).toBe(1);
    expect(result.riskLevel).toBe('at-risk');
  });

  it('persists SAM plan and workforce plan with audit entries', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'sam-1', factoryId: manager.primaryFactoryId, styleId: 'sty-1', operationBreakdown: { collar: 3 }, totalSam: 15, targetPcsPerHour: 4, updatedAt: '2026-11-26' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'wf-1', factoryId: manager.primaryFactoryId, lineId: 'line-1', plannedOperators: 24, presentOperators: 22, helpersCount: 3, shiftMinutes: 480, efficiencyPercent: 82, updatedAt: '2026-11-26' }],
        }),
    };
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] }),
      withTransaction: jest.fn(async (cb: (c: typeof client) => Promise<unknown>) => cb(client)),
    } as unknown as DatabaseService;

    const intel = new PlanningIntelligenceService(db, audit);
    const sam = await intel.upsertSamPlan(manager, {
      factoryId: manager.primaryFactoryId!,
      styleId: 'sty-1',
      operationBreakdown: { collar: 3 },
      totalSam: 15,
    });
    expect(sam.targetPcsPerHour).toBe(4);

    const wf = await intel.upsertWorkforcePlan(manager, {
      factoryId: manager.primaryFactoryId!,
      lineId: 'line-1',
      plannedOperators: 24,
      presentOperators: 22,
      helpersCount: 3,
    });
    expect(wf.presentOperators).toBe(22);
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it('detects rework-aware and slow-station bottlenecks', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{ jobCode: 'JOB-1001', lineName: 'Line 1', reworkQty: 18, wipQty: 120 }],
        })
        .mockResolvedValueOnce({
          rows: [{ operationName: 'Ironing', operatorName: 'Devi', lineName: 'Line 1', targetPace: 50, actualPace: 30 }],
        }),
    } as unknown as DatabaseService;

    const intel = new PlanningIntelligenceService(db, audit);
    const bottlenecks = await intel.detectBottlenecks(manager, { factoryId: manager.primaryFactoryId! });
    expect(bottlenecks).toHaveLength(2);
    expect(bottlenecks[0].stage).toBe('QC Rework Loop');
    expect(bottlenecks[0].severity).toBe('critical');
    expect(bottlenecks[1].stage).toBe('Ironing');
    expect(bottlenecks[1].severity).toBe('critical');
  });
});
