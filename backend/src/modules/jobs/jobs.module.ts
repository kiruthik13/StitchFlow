import { CuttingOutputController, CuttingOutputService } from './cutting-output';
import { Body, Controller, Get, Module, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { FactoryQuery, JobInput, JobListQuery, JobStatusInput, MasterInput, MasterKind, MasterUpdateInput } from './jobs.dto';
import { ClosePolicyInput, JobClosingService } from './job-closing.service';
import { JobsService } from './jobs.service';
import { JobWorkflowService } from './job-workflow.service';
import { BarcodesController, BundlesController, JobApprovalsController, JobBundleController } from './job-workflow.controller';
import { SpecializedMastersController, SpecializedMastersService } from './specialized-masters';

const kinds = { buyers: 'buyers', styles: 'styles' } as const;

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
class JobsController {
  constructor(private readonly jobs: JobsService, private readonly closing: JobClosingService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: JobListQuery) {
    return this.jobs.list(user, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.get(user, id);
  }

  @Post()
  @RequirePermissions('CAN_MANAGE_JOBS')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: JobInput) {
    return this.jobs.create(user, body);
  }

  @Post(':id/close')
  @RequirePermissions('CAN_CLOSE_JOB')
  close(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.closing.close(user, id);
  }

  @Patch(':id/close-policy')
  @RequirePermissions('CAN_CLOSE_JOB')
  configureClosing(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ClosePolicyInput) {
    return this.closing.configure(user, id, body);
  }

  @Patch(':id/status')
  @RequirePermissions('CAN_MANAGE_JOBS')
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string,
    @Body() body: JobStatusInput) {
    return this.jobs.changeStatus(user, id, body.status);
  }
}

@ApiTags('Masters')
@ApiBearerAuth()
@Controller('masters')
class JobMastersController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':kind')
  list(@CurrentUser() user: AuthenticatedUser, @Param('kind', new ParseEnumPipe(kinds)) kind: MasterKind,
    @Query() query: FactoryQuery) {
    return this.jobs.listMasters(user, kind, query);
  }

  @Post(':kind')
  @RequirePermissions('CAN_MANAGE_JOBS')
  create(@CurrentUser() user: AuthenticatedUser, @Param('kind', new ParseEnumPipe(kinds)) kind: MasterKind,
    @Body() body: MasterInput) {
    return this.jobs.createMaster(user, kind, body);
  }

  @Patch(':kind/:id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  update(@CurrentUser() user: AuthenticatedUser, @Param('kind', new ParseEnumPipe(kinds)) kind: MasterKind,
    @Param('id', ParseUUIDPipe) id: string, @Body() body: MasterUpdateInput) {
    return this.jobs.updateMaster(user, kind, id, body);
  }

}

@Module({
  controllers: [CuttingOutputController, JobsController, SpecializedMastersController, JobMastersController, BarcodesController, BundlesController, JobApprovalsController, JobBundleController],
  providers: [JobsService, JobClosingService, JobWorkflowService, CuttingOutputService, SpecializedMastersService],
  exports: [CuttingOutputService],
})
export class JobsModule {}
