import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly db: DatabaseService) {}

  @Get('current')
  async getCurrent(@CurrentUser() user: AuthenticatedUser) {
    const res = await this.db.query(
      `SELECT id, code, name, is_active, created_at FROM public.organizations WHERE id = $1`,
      [user.organizationId],
    );
    return res.rows[0] || null;
  }
}
