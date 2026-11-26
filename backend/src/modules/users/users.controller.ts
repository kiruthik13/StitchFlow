import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ApproveEmployeeDto, ProvisionRosterDto, UpdateAccountStatusDto, UpdateRosterStatusDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('CAN_MANAGE_USERS')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listUsers(user);
  }

  @Get('roster')
  @RequirePermissions('CAN_MANAGE_USERS')
  listRoster(@CurrentUser() user: AuthenticatedUser, @Query('factoryId') factoryId?: string) {
    return this.usersService.listRoster(user, factoryId);
  }

  @Post('roster')
  @RequirePermissions('CAN_MANAGE_USERS')
  provisionRoster(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProvisionRosterDto) {
    return this.usersService.provisionRoster(user, dto);
  }

  @Patch('roster/:employeeId')
  @RequirePermissions('CAN_MANAGE_USERS')
  updateRosterStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateRosterStatusDto,
  ) {
    return this.usersService.updateRosterStatus(user, employeeId, dto);
  }

  @Patch(':id/approval')
  @RequirePermissions('CAN_MANAGE_USERS')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveEmployeeDto,
  ) {
    return this.usersService.approveEmployee(user, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('CAN_MANAGE_USERS')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.usersService.updateStatus(user, id, dto);
  }
}
