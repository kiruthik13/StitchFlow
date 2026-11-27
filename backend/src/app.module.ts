import { Module } from '@nestjs/common';
import { JobsModule } from './modules/jobs/jobs.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { CuttingScenarioModule } from './modules/planning/cutting-scenario.module';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FactoriesModule } from './modules/factories/factories.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FactoriesModule,
    NotificationsModule,
    InventoryModule,
    WorkflowModule,
    CuttingScenarioModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
