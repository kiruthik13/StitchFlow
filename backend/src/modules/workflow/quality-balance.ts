import { BadRequestException, ConflictException } from '@nestjs/common';
import { QualityDisposition, QualityReinspection } from './workflow.dto';

export interface QualityBalance {
  inspected: number;
  passed: number;
  rejected: number;
  rework: number;
  held: number;
  reworked: number;
  released: number;
}

function dispositionTotal(input: QualityDisposition) {
  const total = input.passed + input.rejected + input.rework + input.held;
  if (!total) throw new BadRequestException('At least one piece must be inspected');
  return total;
}

export function applyInspection(balance: QualityBalance, available: number, input: QualityDisposition): QualityBalance {
  const count = dispositionTotal(input);
  if (balance.inspected + count > available) throw new ConflictException('Inspection exceeds completed bundle quantity');
  return {
    ...balance,
    inspected: balance.inspected + count,
    passed: balance.passed + input.passed,
    rejected: balance.rejected + input.rejected,
    rework: balance.rework + input.rework,
    held: balance.held + input.held,
  };
}

export function applyReinspection(balance: QualityBalance, input: QualityReinspection): QualityBalance {
  const count = dispositionTotal(input);
  if (count !== input.fromRework + input.fromHold) {
    throw new BadRequestException('Reinspection dispositions must match the selected input quantities');
  }
  if (input.fromRework > balance.reworked || input.fromHold > balance.held) {
    throw new ConflictException('Reinspection exceeds the ready quantity');
  }
  return {
    ...balance,
    passed: balance.passed + input.passed,
    rejected: balance.rejected + input.rejected,
    rework: balance.rework - input.fromRework + input.rework,
    held: balance.held - input.fromHold + input.held,
    reworked: balance.reworked - input.fromRework,
  };
}
