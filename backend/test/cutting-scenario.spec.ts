import { BadRequestException } from '@nestjs/common';
import { projectCuttingCapacity } from '../src/modules/planning/cutting-scenario.module';

const shift = {
  workers: 10, shiftMinutes: 480, breakMinutes: 30, downtimeMinutes: 30,
  samMinutes: 5, efficiencyPercent: 80, machineAvailabilityPercent: 75,
};

describe('Cutting what-if calculation', () => {
  it('deducts breaks and downtime and applies practical efficiency and availability', () => {
    expect(projectCuttingCapacity(1100, 2, shift)).toEqual({
      availableLabourMinutes: 4500,
      theoreticalPiecesPerShift: 900,
      effectivePiecesPerShift: 504,
      piecesWithinAvailableShifts: 1008,
      shiftsRequired: 3,
      piecesShort: 92,
    });
  });

  it('marks a zero-throughput run as unable to clear nonzero backlog', () => {
    expect(projectCuttingCapacity(100, 4, { ...shift, efficiencyPercent: 0 })).toMatchObject({
      effectivePiecesPerShift: 0, shiftsRequired: null, piecesShort: 100,
    });
  });

  it('rejects invalid productive time and handles exact decimal piece boundaries', () => {
    expect(() => projectCuttingCapacity(100, 2, { ...shift, downtimeMinutes: 451 })).toThrow(BadRequestException);
    expect(projectCuttingCapacity(10, 1, {
      ...shift, workers: 1, shiftMinutes: 1, breakMinutes: 0, downtimeMinutes: 0,
      samMinutes: 0.1, efficiencyPercent: 100, machineAvailabilityPercent: 100,
    }).effectivePiecesPerShift).toBe(10);
  });
});
