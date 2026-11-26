import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { FactoryScopeGuard } from '../../common/guards/factory-scope.guard';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(FactoryScopeGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  async listAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('factoryId') factoryId?: string,
    @Query('limit') limit?: string,
  ) {
    const scopedFactoryId =
      user.role === 'md' ? factoryId : factoryId || user.primaryFactoryId;
    if (user.role !== 'md' && !scopedFactoryId) {
      throw new ForbiddenException('A factory assignment is required to view audit logs');
    }
    return this.auditService.list(
      user.organizationId,
      scopedFactoryId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
