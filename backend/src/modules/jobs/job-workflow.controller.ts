import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { FactoryQuery } from './jobs.dto';
import { BarcodeInput, DecisionInput, GenerateBundleInput, ReprintInput } from './job-workflow.dto';
import { JobWorkflowService } from './job-workflow.service';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
@RequirePermissions('CAN_MANAGE_JOBS')
export class JobApprovalsController {
  constructor(private readonly workflow: JobWorkflowService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.workflow.pending(user, query);
  }

  @Post(':id/decide')
  decide(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: DecisionInput) {
    return this.workflow.decide(user, id, body);
  }
}

@ApiTags('Bundles')
@ApiBearerAuth()
@Controller('bundles')
export class BundlesController {
  constructor(private readonly workflow: JobWorkflowService) {}

  @Get()
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.workflow.list(user, query);
  }

  @Get('print-queue')
  @RequirePermissions('CAN_MANAGE_JOBS')
  printQueue(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.workflow.printQueue(user, query);
  }

  @Get(':id/tag-payload')
  @RequirePermissions('CAN_MANAGE_JOBS')
  tagPayload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format?: string,
  ) {
    return this.workflow.tagPayload(user, id, format === 'tspl' ? 'tspl' : 'zpl');
  }

  @Get(':id')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.find(user, id, 'id');
  }

  @Post(':id/reprint')
  @RequirePermissions('CAN_MANAGE_JOBS')
  reprint(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ReprintInput) {
    return this.workflow.reprint(user, id, body);
  }

  @Get(':id/print-logs')
  @RequirePermissions('CAN_MANAGE_JOBS')
  printLogs(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.printLogs(user, id);
  }
}

@ApiTags('Barcodes')
@ApiBearerAuth()
@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly workflow: JobWorkflowService) {}

  @Post('resolve')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  resolve(@CurrentUser() user: AuthenticatedUser, @Body() body: BarcodeInput) {
    return this.workflow.find(user, 'BND-' + body.barcode.slice(4).toLowerCase(), 'barcode');
  }
}

@ApiTags('Bundles')
@ApiBearerAuth()
@Controller('jobs')
export class JobBundleController {
  constructor(private readonly workflow: JobWorkflowService) {}

  @Get(':id/bundle-allocation')
  @RequirePermissions('CAN_MANAGE_JOBS')
  allocation(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.allocation(user, id);
  }

  @Post(':id/bundles')
  @RequirePermissions('CAN_MANAGE_JOBS')
  generate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: GenerateBundleInput) {
    return this.workflow.generate(user, id, body);
  }
}
