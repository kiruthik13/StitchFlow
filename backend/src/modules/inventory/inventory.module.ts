import { RawMaterialsController, RawMaterialsService } from './raw-materials';
import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { FactoryQuery, MasterInput } from '../jobs/jobs.dto';
import { DiscrepancyReturnInput, HandoverDecisionInput, OutputInInput, OutputOutInput } from './cut-stock.dto';
import { CutStockService } from './cut-stock.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('masters/locations')
class StorageLocationsController {
  constructor(private readonly inventory: CutStockService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.inventory.locations(user, query);
  }

  @Post()
  @RequirePermissions('CAN_MANAGE_JOBS')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: MasterInput) {
    return this.inventory.createLocation(user, body);
  }

  @Patch(':id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: MasterInput) {
    return this.inventory.updateLocation(user, id, body);
  }

}

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
class CutStockController {
  constructor(private readonly inventory: CutStockService) {}

  @Get('cut-stock/handovers')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.inventory.list(user, query);
  }

  @Post('output-in')
  @RequirePermissions('CAN_ENTER_PRODUCTION')
  outputIn(@CurrentUser() user: AuthenticatedUser, @Body() body: OutputInInput) {
    return this.inventory.propose(user, body, 'output-in');
  }

  @Post('output-out')
  @RequirePermissions('CAN_MANAGE_INVENTORY')
  outputOut(@CurrentUser() user: AuthenticatedUser, @Body() body: OutputOutInput) {
    return this.inventory.propose(user, body, 'output-out', body.destinationLineId);
  }

  @Post('cut-stock/handovers/:id/verify-return')
  verifyReturn(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: DiscrepancyReturnInput) {
    return this.inventory.verifyReturn(user, id, body);
  }

  @Post('cut-stock/handovers/:id/approve-return')
  @RequirePermissions('CAN_MANAGE_INVENTORY')
  approveReturn(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.approveReturn(user, id);
  }

  @Post('cut-stock/handovers/:id/decide')
  decide(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: HandoverDecisionInput) {
    return this.inventory.decide(user, id, body);
  }
}

@Module({ controllers: [StorageLocationsController, CutStockController, RawMaterialsController], providers: [CutStockService, RawMaterialsService] })
export class InventoryModule {}
