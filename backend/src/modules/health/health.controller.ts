import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const dbHealth = await this.db.checkHealth();
    return {
      status: dbHealth.status === 'down' ? 'degraded' : 'ok',
      service: 'stitchflow-backend',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth.status,
        redis: this.redis.isAvailable() ? 'up' : 'degraded-fallback',
      },
    };
  }
}
