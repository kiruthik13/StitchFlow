import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  classifyWipAgeBand,
  computeTaskPriority,
  deduplicateExceptions,
  evaluateWipThreshold,
  WorkflowIntelligenceService,
} from '../src/modules/workflow/workflow-intelligence.service';
import {
  calculateReworkCost,
  computeDefectRates,
  computeLineBalance,
  Phase10IntelligenceService,
} from '../src/modules/planning/phase10-intelligence.service';
import {
  optimizeCartonPlan,
  Phase11OptimizationService,
} from '../src/modules/planning/phase11-optimization.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';

const orgId = '11111111-1111-1111-1111-111111111111';
const facId = '22222222-2222-2222-2222-222222222201';
const jobId = '33333333-3333-3333-3333-333333333301';
const bundleId = '44444444-4444-4444-4444-444444444401';

const userOf = (role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id: `user-${role}`,
  email: `${role}@stitchflow.dev`,
  employeeId: `EMP-${role.toUpperCase()}`,
  name: role,
  role,
  accountStatus: 'active',
  organizationId: orgId,
  assignedFactoryIds: [facId],
  primaryFactoryId: facId,
  permissions: ['CAN_LOOKUP_BARCODE', 'CAN_VIEW_EXECUTIVE_REPORTS', 'CAN_MANAGE_WORKFLOW'],
});

describe('Phases 9, 10 & 11 — 15 Enterprise Intelligence Enhancements', () => {
  it('1. Digital Garment Passport returns lifecycle & timeline without mutating state', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{
          id: bundleId,
          barcodeValue: 'BND-00521',
          jobId,
          jobCode: 'JOB-1001',
          originalQuantity: 100,
          rejected: 3,
          inspected: 100,
          passed: 97,
          rework: 0,
          released: 97,
          packed: 97,
          dispatched: 0,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'aud-1', operation: 'STAGE_COMPLETED', timestamp: '2026-11-28T10:00:00Z' }],
      });
    const db = { query } as unknown as DatabaseService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const svc = new WorkflowIntelligenceService(db, audit);

    const res = await svc.getGarmentPassport(userOf('supervisor'), bundleId, 30, 0);
    expect(res.passport.currentAvailableQuantity).toBe(97);
    expect(res.passport.qcStatus).toBe('released');
    expect(res.timeline).toHaveLength(1);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('2. Smart Task Inbox computes explainable priority and sorts tasks', async () => {
    const p = computeTaskPriority({
      isOverdue: true,
      daysToTarget: -1,
      waitingHours: 26,
      reworkPending: 5,
      hasBlockedDownstream: true,
    });
    expect(p.level).toBe('critical');
    expect(p.reasons).toEqual(expect.arrayContaining(['deadline_overdue', 'wip_aging_critical', 'rework_urgency']));
  });

  it('3 & 4. Production Exception Center deduplicates and Smart WIP Aging evaluates thresholds', () => {
    expect(classifyWipAgeBand(3.5)).toBe('<4h');
    expect(classifyWipAgeBand(15)).toBe('12-24h');
    expect(evaluateWipThreshold('cutting', 13).severity).toBe('critical');
    expect(evaluateWipThreshold('sewing-out', 10).severity).toBe('warning');

    const deduped = deduplicateExceptions([
      {
        id: '1', dedupKey: 'handover:h1', type: 'quantity_discrepancy', severity: 'warning',
        status: 'open', factoryId: facId, affectedQuantity: 2, detectedAt: '2026-11-28T00:00:00Z',
        rootCause: 'Mismatch 100 vs 98', recommendedAction: 'Verify return',
      },
      {
        id: '2', dedupKey: 'handover:h1', type: 'quantity_discrepancy', severity: 'critical',
        status: 'open', factoryId: facId, affectedQuantity: 2, detectedAt: '2026-11-28T00:00:00Z',
        rootCause: 'Mismatch 100 vs 98', recommendedAction: 'Verify return',
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].severity).toBe('critical');
  });

  it('5. Shift Handover Intelligence restricts acknowledgement to operational roles and logs audit', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const db = { withTransaction: jest.fn((fn) => fn({})) } as unknown as DatabaseService;
    const svc = new WorkflowIntelligenceService(db, audit);

    await expect(
      svc.acknowledgeShiftHandover(userOf('md'), facId, { shiftLabel: 'Night Shift' }),
    ).rejects.toThrow(ForbiddenException);

    const ack = await svc.acknowledgeShiftHandover(userOf('supervisor'), facId, { shiftLabel: 'Morning Shift' });
    expect(ack.acknowledged).toBe(true);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('6 & 7. Employee Skill Matrix & Intelligent Line Balancing respect capacity and division-by-zero', async () => {
    const bal = computeLineBalance({
      lineId: 'l1',
      lineName: 'Line 1',
      presentOperators: 10,
      shiftMinutes: 480,
      efficiencyPercent: 80,
      samPerGarment: 12,
      pendingPieces: 400,
      reworkPieces: 20,
      stoppedMachines: 2,
    });
    expect(bal.effectiveOperators).toBe(8);
    expect(bal.theoreticalCapacity).toBe(320);
    expect(bal.effectiveCapacity).toBe(256);
    expect(bal.status).toBe('overloaded');

    const zeroSam = computeLineBalance({
      lineId: 'l2', lineName: 'Line 2', presentOperators: 0, shiftMinutes: 480,
      efficiencyPercent: 80, samPerGarment: 0, pendingPieces: 0, reworkPieces: 0, stoppedMachines: 0,
    });
    expect(zeroSam.loadPercent).toBe(0);
  });

  it('8. Rework Cost Intelligence computes ₹600 for 25 pcs × 12 min × ₹120/hr, handles missing rate, and blocks operator', async () => {
    const cost = calculateReworkCost({
      reworkPieces: 25,
      reworkMinutesPerPiece: 12,
      hourlyLabourRate: 120,
    });
    expect(cost.labourHours).toBe(5);
    expect(cost.labourCost).toBe(600);
    expect(cost.totalCost).toBe(600);
    expect(cost.labourOnly).toBe(true);
    expect(cost.dataQuality).toBe('incomplete');

    const unavailable = calculateReworkCost({
      reworkPieces: 10,
      reworkMinutesPerPiece: null,
      hourlyLabourRate: null,
    });
    expect(unavailable.totalCost).toBeNull();
    expect(unavailable.dataQuality).toBe('unavailable');

    const p10 = new Phase10IntelligenceService({} as unknown as DatabaseService);
    await expect(p10.getReworkCost(userOf('operator'), facId)).rejects.toThrow(ForbiddenException);
  });

  it('9 & 10. Defect Heatmap computes FPY/DHU/Defective% and Production Replay is read-only', async () => {
    const rates = computeDefectRates({
      inspectedUnits: 100,
      firstPassAcceptedUnits: 90,
      uniqueDefectivePieces: 10,
      defectOccurrences: 14,
    });
    expect(rates.firstPassYieldPercent).toBe(90);
    expect(rates.dhu).toBe(14);
    expect(rates.defectivePiecePercent).toBe(10);

    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: jobId, jobCode: 'JOB-1001', status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ev1', action: 'JOB_CREATED', recordedAt: '2026-11-28T08:00:00Z' }] });
    const p10 = new Phase10IntelligenceService({ query } as unknown as DatabaseService);
    const replay = await p10.getProductionReplay(userOf('md'), jobId);
    expect(replay.readOnly).toBe(true);
    expect(replay.events).toHaveLength(1);
  });

  it('11. Smart Bundle Split & Merge enforces quantity conservation and compatibility', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{ id: bundleId, job_id: jobId, factory_id: facId, size: 'M', color: 'Navy', quantity: 100 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'child-a' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'child-b' }] }),
    };
    const db = { withTransaction: jest.fn((fn) => fn(client)) } as unknown as DatabaseService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const p11 = new Phase11OptimizationService(db, audit);

    const splitRes = await p11.splitBundle(userOf('supervisor'), bundleId, { quantities: [60, 40] });
    expect(splitRes.conservedQuantity).toBe(100);
    expect(splitRes.childBundleIds).toHaveLength(2);

    // Non-conserving split -> ConflictException
    client.query.mockResolvedValueOnce({
      rows: [{ id: bundleId, job_id: jobId, factory_id: facId, size: 'M', color: 'Navy', quantity: 100 }],
    });
    await expect(
      p11.splitBundle(userOf('supervisor'), bundleId, { quantities: [60, 50] }),
    ).rejects.toThrow(ConflictException);
  });

  it('12 & 13. Machine Maintenance derives Stopped status & Fabric Lot Traceability preserves units', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{ lineId: 'l1', lineName: 'Line 1', openIssues: '1', resolvedIssues: '2', totalDowntimeHours: '4.50', lastReportedAt: '2026-11-28T09:00:00Z' }],
      })
      .mockResolvedValueOnce({
        rows: [{ materialId: 'rm1', sku: 'FAB-01', name: 'Cotton Pique', baseUnit: 'metres', receivedQty: '500', issuedQty: '200', jobCode: null }],
      });
    const p11 = new Phase11OptimizationService({ query } as unknown as DatabaseService, {} as unknown as AuditService);

    const machines = await p11.getMachineMaintenance(userOf('supervisor'), facId);
    expect(machines.machines[0].status).toBe('Stopped');
    expect(machines.machines[0].mttrHours).toBe(2.25);

    const fabric = await p11.getFabricTraceability(userOf('store-dispatch'), facId);
    expect(fabric.lots[0].baseUnit).toBe('metres');
    expect(fabric.lots[0].lineageStatus).toBe('incomplete_lineage');
  });

  it('14 & 15. Smart Carton Optimization yields 25+25+25+22 for 97 pcs and Daily Digest enforces RBAC', async () => {
    const plan = optimizeCartonPlan(97, 25);
    expect(plan.cartonCount).toBe(4);
    expect(plan.cartons.map((c) => c.quantity)).toEqual([25, 25, 25, 22]);
    expect(plan.totalPieces).toBe(97);

    const p11 = new Phase11OptimizationService({} as unknown as DatabaseService, {} as unknown as AuditService);
    await expect(p11.getDailyDigest(userOf('operator'), facId)).rejects.toThrow(ForbiddenException);
  });
});
