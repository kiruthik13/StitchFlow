import { DashboardController, DashboardService } from './dashboard-reports';
import { Phase10IntelligenceController, Phase10IntelligenceService } from './phase10-intelligence.service';
import { Phase11OptimizationController, Phase11OptimizationService } from './phase11-optimization.service';
import { PlanningIntelligenceController, PlanningIntelligenceService } from './intelligence';
import { WorkflowQueuesController, WorkflowQueuesService } from './workflow-queues';
import { BadRequestException, Body, Controller, Injectable, Module, NotFoundException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsNumber, IsUUID, Max, Min, ValidateNested, Matches } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { jobReadScope, jobScopeParams } from '../jobs/jobs.service';

export class CuttingCapacityInput {
  @IsInt()
  @Min(1)
  @Max(10000)
  workers!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  shiftMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  breakMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  downtimeMinutes!: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1440)
  samMinutes!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  efficiencyPercent!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  machineAvailabilityPercent!: number;
}

export class CuttingScenarioInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  jobId!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  availableShifts!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => CuttingCapacityInput)
  baseline!: CuttingCapacityInput;

  @IsDefined()
  @ValidateNested()
  @Type(() => CuttingCapacityInput)
  proposed!: CuttingCapacityInput;
}

export function projectCuttingCapacity(remaining: number, availableShifts: number, input: CuttingCapacityInput) {
  const netMinutes = input.shiftMinutes - input.breakMinutes;
  const operatingMinutes = netMinutes - input.downtimeMinutes;
  if (netMinutes <= 0 || operatingMinutes < 0) {
    throw new BadRequestException('Breaks and downtime exceed the shift duration');
  }

  const availableLabourMinutes = input.workers * netMinutes;
  // Use scaled integers so an exact piece boundary isn't rounded down by binary floating-point arithmetic.
  const samMilliseconds = BigInt(Math.round(input.samMinutes * 60_000));
  const theory = BigInt(availableLabourMinutes) * 60_000n / samMilliseconds;
  const efficiencyBasisPoints = BigInt(Math.round(input.efficiencyPercent * 100));
  const availabilityBasisPoints = BigInt(Math.round(input.machineAvailabilityPercent * 100));
  const effective = BigInt(input.workers * operatingMinutes) * 60_000n * efficiencyBasisPoints * availabilityBasisPoints
    / (samMilliseconds * 100_000_000n);
  const theoreticalPiecesPerShift = Number(theory);
  const effectivePiecesPerShift = Number(effective);
  const piecesWithinAvailableShifts = Math.min(remaining, effectivePiecesPerShift * availableShifts);
  return {
    availableLabourMinutes,
    theoreticalPiecesPerShift,
    effectivePiecesPerShift,
    piecesWithinAvailableShifts,
    shiftsRequired: remaining === 0 ? 0 : effectivePiecesPerShift === 0 ? null : Math.ceil(remaining / effectivePiecesPerShift),
    piecesShort: remaining - piecesWithinAvailableShifts,
  };
}

@Injectable()
export class CuttingScenarioService {
  constructor(private readonly db: DatabaseService) {}

  async compare(user: AuthenticatedUser, input: CuttingScenarioInput) {
    const { rows: [job] } = await this.db.query<{ order_quantity: number; cut: string; target_date: string }>(`
      SELECT j.order_quantity, j.target_date::text,
        (SELECT COALESCE(SUM(e.quantity), 0) FROM public.cutting_output_events e
         JOIN public.bundles b ON b.id = e.bundle_id WHERE b.job_id = j.id) AS cut
      FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
      WHERE ${jobReadScope} AND j.id = $4`, [...jobScopeParams(user), input.jobId]);
    if (!job) throw new NotFoundException('Job not found');

    const confirmedCutQuantity = Number(job.cut);
    const remaining = Math.max(0, job.order_quantity - confirmedCutQuantity);
    const baseline = projectCuttingCapacity(remaining, input.availableShifts, input.baseline);
    const proposed = projectCuttingCapacity(remaining, input.availableShifts, input.proposed);
    return {
      jobId: input.jobId,
      stage: 'cutting',
      targetDate: job.target_date,
      confirmedCutQuantity,
      remainingQuantity: remaining,
      availableShifts: input.availableShifts,
      baseline,
      proposed,
      additionalPiecesWithinAvailableShifts: proposed.piecesWithinAvailableShifts - baseline.piecesWithinAvailableShifts,
    };
  }
}

@ApiTags('Simulations')
@ApiBearerAuth()
@Controller('simulations')
class CuttingScenarioController {
  constructor(private readonly scenarios: CuttingScenarioService) {}

  @Post('what-if')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  compare(@CurrentUser() user: AuthenticatedUser, @Body() body: CuttingScenarioInput) {
    return this.scenarios.compare(user, body);
  }
}

@Module({
  controllers: [CuttingScenarioController, PlanningIntelligenceController, WorkflowQueuesController, DashboardController, Phase10IntelligenceController, Phase11OptimizationController],
  providers: [CuttingScenarioService, PlanningIntelligenceService, WorkflowQueuesService, DashboardService, Phase10IntelligenceService, Phase11OptimizationService],
})
export class CuttingScenarioModule {}
