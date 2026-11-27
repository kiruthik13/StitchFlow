import { Body, Controller, ForbiddenException, HttpException, Injectable, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsDateString, IsIn, IsInt, IsUUID, Max, Min, ValidateIf, ValidateNested, Matches } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { CuttingOutputService } from '../jobs/cutting-output';
import { WorkflowService } from './workflow.service';

class ProductionReplayEvent {
  @IsIn(['cutting', 'stage'])
  kind!: 'cutting' | 'stage';

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  bundleId!: string;

  @ValidateIf((value: ProductionReplayEvent) => value.kind === 'stage')
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  stepId?: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;

  @IsDateString({ strict: true })
  occurredAt!: string;
}

class ProductionReplayInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  actorId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(25)
  @ArrayUnique((value: ProductionReplayEvent) => value?.requestId)
  @Type(() => ProductionReplayEvent)
  @ValidateNested({ each: true })
  events!: ProductionReplayEvent[];
}

type Outcome =
  | { requestId: string; status: 'confirmed'; result: unknown }
  | { requestId: string; status: 'conflict' | 'rejected' | 'retry'; code: string };

@Injectable()
export class ProductionReplayService {
  constructor(private readonly cutting: CuttingOutputService, private readonly workflow: WorkflowService) {}

  async submit(user: AuthenticatedUser, input: ProductionReplayInput): Promise<Outcome[]> {
    if (input.actorId !== user.id) throw new ForbiddenException('Queued events must be submitted by the employee who recorded them');
    const outcomes: Outcome[] = [];
    // Process in client order. Each business operation repeats authorization and quantity checks and owns its transaction.
    for (const item of input.events) {
      try {
        const event = { bundleId: item.bundleId, requestId: item.requestId, quantity: item.quantity, clientOccurredAt: item.occurredAt };
        const result = item.kind === 'cutting'
          ? await this.cutting.record(user, event)
          : await this.workflow.completeStage(user, { ...event, stepId: item.stepId! });
        outcomes.push({ requestId: item.requestId, status: 'confirmed', result });
      } catch (error) {
        const code = error instanceof HttpException ? error.getStatus() : 500;
        outcomes.push({
          requestId: item.requestId,
          status: code === 409 ? 'conflict' : code === 429 || code >= 500 ? 'retry' : 'rejected',
          code: code === 409 ? 'ERR_SYNC_CONFLICT' : code === 429 || code >= 500 ? 'ERR_SYNC_RETRY' : 'ERR_SYNC_REJECTED',
        });
      }
    }
    return outcomes;
  }
}

@ApiTags('Production synchronization')
@ApiBearerAuth()
@Controller('sync')
export class ProductionReplayController {
  constructor(private readonly replay: ProductionReplayService) {}

  @Post('production')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  submit(@CurrentUser() user: AuthenticatedUser, @Body() body: ProductionReplayInput) {
    return this.replay.submit(user, body);
  }
}
