import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('Employee enrollment and session gates', () => {
  const authUser = { id: 'employee-id', email_confirmed_at: '2026-01-01', email: 'worker@example.test' };
  const authResponse = { data: { user: authUser }, error: null };
  const project = 'https://example.test';
  const originalUrl = process.env.SUPABASE_URL;

  beforeEach(() => { process.env.SUPABASE_URL = project; });
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
  });

  function context(overrides: object = {}) {
    const payload = Buffer.from(JSON.stringify({
      iss: project + '/auth/v1', aud: 'authenticated', sub: authUser.id,
      exp: Math.floor(Date.now() / 1000) + 60, ...overrides,
    })).toString('base64url');
    return {
      getHandler: () => (() => {}),
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer stub.' + payload + '.stub' } }) }),
    } as unknown as ExecutionContext;
  }

  it.each([{ aud: 'anon' }, { exp: 1 }, { iss: 'https://wrong.example.test/auth/v1' }])(
    'rejects invalid application claims %j before accessing a profile', async invalid => {
      const query = jest.fn();
      const db = {
        query,
        getSupabaseAdmin: () => ({ auth: { getUser: jest.fn().mockResolvedValue(authResponse) } }),
      };
      const guard = new JwtAuthGuard(new Reflector(), db as unknown as DatabaseService);
      await expect(guard.canActivate(context(invalid))).rejects.toThrow(UnauthorizedException);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('checks current account status on every request', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: authUser.id, account_status: 'active', role_code: 'operator' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: authUser.id, account_status: 'suspended', role_code: 'operator' }] })
      .mockResolvedValue({ rows: [] });
    const db = {
      query,
      getSupabaseAdmin: () => ({ auth: { getUser: jest.fn().mockResolvedValue(authResponse) } }),
    };
    const guard = new JwtAuthGuard(new Reflector(), db as unknown as DatabaseService);
    await expect(guard.canActivate(context())).resolves.toBe(true);
    await expect(guard.canActivate(context())).rejects.toThrow(ForbiddenException);
  });

  it('rejects a registration without a matching roster entry before creating an Auth user', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }), getSupabaseAdmin: jest.fn() };
    const service = new AuthService(db as unknown as DatabaseService, new RedisService(), {} as AuditService);
    await expect(service.register({
      employeeId: 'EMP-11', name: 'Test Operator', email: 'worker@example.test', password: 'FixtureOnly99!',
      organizationId: 'b2fda7d8-85da-463a-8492-080ce09dc735', factoryId: '715dfddb-bc49-4e9d-81a5-4b04ca7bd430',
    })).rejects.toThrow(ForbiddenException);
    expect(db.getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
