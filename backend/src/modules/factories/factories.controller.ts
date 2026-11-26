import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { FactoryScopeGuard } from '../../common/guards/factory-scope.guard';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';

@ApiTags('Factories')
@ApiBearerAuth()
@Controller('factories')
@UseGuards(FactoryScopeGuard)
export class FactoriesController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES')) {
      const res = await this.db.query(
        `SELECT id, organization_id, code, name, location, total_lines, active_lines, capacity
         FROM public.factories
         WHERE organization_id = $1 AND is_active = TRUE
         ORDER BY name ASC`,
        [user.organizationId],
      );
      return res.rows;
    }

    if (user.assignedFactoryIds.length === 0) return [];

    const res = await this.db.query(
      `SELECT id, organization_id, code, name, location, total_lines, active_lines, capacity
       FROM public.factories
       WHERE organization_id = $1 AND id = ANY($2::uuid[]) AND is_active = TRUE
       ORDER BY name ASC`,
      [user.organizationId, user.assignedFactoryIds],
    );
    return res.rows;
  }

  @Get(':id/hierarchy')
  async getHierarchy(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const factoryRes = await this.db.query(
      `SELECT id, code, name, location FROM public.factories WHERE id = $1 AND organization_id = $2 AND is_active AND ($3::boolean OR id = ANY($4::uuid[]))`,
      [id, user.organizationId, user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES'), user.assignedFactoryIds],
    );
    if (factoryRes.rows.length === 0) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Factory not found' });
    }

    const unitsRes = await this.db.query(
      `SELECT id, code, name FROM public.units WHERE factory_id = $1 AND is_active = TRUE ORDER BY name`,
      [id],
    );
    const linesRes = await this.db.query(
      `SELECT id, code, name, capacity, stages FROM public.production_lines WHERE factory_id = $1 AND is_active = TRUE ORDER BY name`,
      [id],
    );

    return {
      factory: factoryRes.rows[0],
      units: unitsRes.rows,
      lines: linesRes.rows,
    };
  }
}
