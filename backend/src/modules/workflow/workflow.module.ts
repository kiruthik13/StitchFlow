import { JobsModule } from '../jobs/jobs.module';
import { InlineQcController, InlineQcService } from './inline-qc';
import { ProductionFloorController, ProductionFloorService } from './production-floor';
import { ProductionReplayController, ProductionReplayService } from './production-sync';
import { ShipmentsController, ShipmentsService } from './shipments';
import { QualityEvidenceController, QualityEvidenceService } from './quality-evidence';
import { RouteSetupController, RouteSetupService } from './route-setup';
import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { QualityDisposition, QualityReinspection, QuantityRequest, StageCompletion } from './workflow.dto';
import { FactoryQuery } from '../jobs/jobs.dto';
import { WorkflowService } from './workflow.service';

@ApiTags('Production workflow')
@ApiBearerAuth()
@Controller()
class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get('production/bundles/:id/route')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  route(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.stages(user, id);
  }

  @Post('production/stages/complete')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  complete(@CurrentUser() user: AuthenticatedUser, @Body() body: StageCompletion) {
    return this.workflow.completeStage(user, body);
  }

  @Get('quality/bundles/:id')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  balance(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.qualityStatus(user, id);
  }

  @Post('quality/inspections')
  @RequirePermissions('CAN_PERFORM_QC')
  inspect(@CurrentUser() user: AuthenticatedUser, @Body() body: QualityDisposition) {
    return this.workflow.inspect(user, body);
  }

  @Post('rework/complete')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  rework(@CurrentUser() user: AuthenticatedUser, @Body() body: QuantityRequest) {
    return this.workflow.rework(user, body);
  }

  @Post('quality/reinspections')
  @RequirePermissions('CAN_PERFORM_QC')
  reinspect(@CurrentUser() user: AuthenticatedUser, @Body() body: QualityReinspection) {
    return this.workflow.reinspect(user, body);
  }

  @Post('quality/releases')
  @RequirePermissions('CAN_RELEASE_QC')
  release(@CurrentUser() user: AuthenticatedUser, @Body() body: QuantityRequest) {
    return this.workflow.release(user, body);
  }

  @Get('packing/cartons')
  @RequirePermissions('CAN_CREATE_CARTON')
  packingCartons(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.workflow.cartons(user, query.factoryId, query.after);
  }

  @Post('packing/cartons')
  @RequirePermissions('CAN_CREATE_CARTON')
  packAlias(@CurrentUser() user: AuthenticatedUser, @Body() body: QuantityRequest) {
    return this.workflow.pack(user, body);
  }

  @Post('cartons')
  @RequirePermissions('CAN_CREATE_CARTON')
  pack(@CurrentUser() user: AuthenticatedUser, @Body() body: QuantityRequest) {
    return this.workflow.pack(user, body);
  }

  @Get('dispatch/cartons')
  @RequirePermissions('CAN_MONITOR_DISPATCH')
  cartons(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.workflow.cartons(user, query.factoryId, query.after);
  }

  @Post('dispatch/cartons/:id/receive')
  @RequirePermissions('CAN_MANAGE_INVENTORY')
  receive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.receiveCarton(user, id);
  }

  @Post('dispatch/cartons/:id/approve')
  @RequirePermissions('CAN_APPROVE_DISPATCH')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.dispatch(user, id, false);
  }

  @Post('dispatch/cartons/:id/execute')
  @RequirePermissions('CAN_EXECUTE_DISPATCH')
  dispatch(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.dispatch(user, id, true);
  }
}

@Module({ imports: [JobsModule], controllers: [InlineQcController, ProductionFloorController, ProductionReplayController, ShipmentsController, WorkflowController, RouteSetupController, QualityEvidenceController], providers: [InlineQcService, ProductionFloorService, ProductionReplayService, ShipmentsService, WorkflowService, RouteSetupService, QualityEvidenceService] })
export class WorkflowModule {}
