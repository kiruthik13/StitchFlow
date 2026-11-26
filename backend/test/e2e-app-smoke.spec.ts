import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('Phase 8 E2E AppModule & OpenAPI route smoke test', () => {
  it('boots full AppModule and exposes all Phase 1-7 endpoints in OpenAPI spec', async () => {
    const mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      withTransaction: jest.fn(),
      getSupabaseAdmin: jest.fn(),
      onModuleDestroy: jest.fn(),
    };
    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      invalidateUserAuthCache: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDb)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    const config = new DocumentBuilder().setTitle('StitchFlow API').setVersion('1.0.0').build();
    const doc = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(doc.paths);

    const expectedPaths = [
      '/api/v1/health',
      '/api/v1/masters/cutting-masters',
      '/api/v1/masters/contacts',
      '/api/v1/masters/ranks',
      '/api/v1/masters/tailor-mappings',
      '/api/v1/masters/configs',
      '/api/v1/users/roster',
      '/api/v1/bundles/print-queue',
      '/api/v1/bundles/{id}/tag-payload',
      '/api/v1/production/issues',
      '/api/v1/production/work-assignments',
      '/api/v1/sync/production',
      '/api/v1/quality/inline-audits',
      '/api/v1/dispatch/manifests/{id}/gate-pass',
      '/api/v1/dispatch/manifests/{id}/gate-pass.pdf',
      '/api/v1/reports/jobs.pdf',
      '/api/v1/reports/jobs.xls',
      '/api/v1/planning/sam',
      '/api/v1/planning/workforce',
      '/api/v1/planning/bottlenecks',
      '/api/v1/planning/delivery-predictions',
    ];

    for (const p of expectedPaths) {
      expect(paths).toContain(p);
    }

    await app.close();
  });
});
