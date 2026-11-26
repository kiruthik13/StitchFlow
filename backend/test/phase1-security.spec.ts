import { ConflictException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FactoryScopeGuard } from '../src/common/guards/factory-scope.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { RedisService } from '../src/modules/redis/redis.service';

function mockContext(user: AuthenticatedUser, reqOverrides: Record<string, any> = {}): ExecutionContext {
  const req = {
    user,
    params: {},
    query: {},
    body: {},
    baseUrl: '/api/v1/factories',
    ...reqOverrides,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (() => {}),
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('Phase 1.5 Security, FM Permissions, Duplicate Prevention & Redis Fallback', () => {
  const fmUser: AuthenticatedUser = {
    id: 'user-fm-1',
    email: 'fm@stitchflow.com',
    employeeId: 'EMP-100',
    name: 'Priya',
    role: 'factory-manager',
    accountStatus: 'active',
    organizationId: 'org-1',
    assignedFactoryIds: ['fac-1'],
    primaryFactoryId: 'fac-1',
    permissions: [
      'CAN_LOOKUP_BARCODE',
      'CAN_MANAGE_JOBS',
      'CAN_MONITOR_DISPATCH',
      'CAN_APPROVE_DISPATCH',
      'CAN_MANAGE_USERS',
    ],
  };

  const mdUser: AuthenticatedUser = {
    id: 'user-md-1',
    email: 'md@stitchflow.com',
    employeeId: 'EMP-001',
    name: 'Arvind',
    role: 'md',
    accountStatus: 'active',
    organizationId: 'org-1',
    assignedFactoryIds: [],
    permissions: ['CAN_VIEW_ALL_FACTORIES', 'CAN_VIEW_EXECUTIVE_REPORTS'],
  };

  it('enforces Factory Manager separation of duties (lookup/approve yes, scan/execute dispatch/QC no)', () => {
    const canLookup = new PermissionsGuard({ getAllAndOverride: () => ['CAN_LOOKUP_BARCODE'] } as unknown as Reflector);
    const canApprove = new PermissionsGuard({ getAllAndOverride: () => ['CAN_APPROVE_DISPATCH'] } as unknown as Reflector);
    const canScanProd = new PermissionsGuard({ getAllAndOverride: () => ['CAN_SCAN_PRODUCTION'] } as unknown as Reflector);
    const canExecDispatch = new PermissionsGuard({ getAllAndOverride: () => ['CAN_EXECUTE_DISPATCH'] } as unknown as Reflector);
    const canReleaseQC = new PermissionsGuard({ getAllAndOverride: () => ['CAN_RELEASE_QC'] } as unknown as Reflector);

    expect(canLookup.canActivate(mockContext(fmUser))).toBe(true);
    expect(canApprove.canActivate(mockContext(fmUser))).toBe(true);
    expect(() => canScanProd.canActivate(mockContext(fmUser))).toThrow(ForbiddenException);
    expect(() => canExecDispatch.canActivate(mockContext(fmUser))).toThrow(ForbiddenException);
    expect(() => canReleaseQC.canActivate(mockContext(fmUser))).toThrow(ForbiddenException);
  });

  it('prevents cross-factory access for Factory Manager and allows MD in org', () => {
    const guard = new FactoryScopeGuard();
    expect(guard.canActivate(mockContext(fmUser, { params: { id: 'fac-1' } }))).toBe(true);
    expect(() => guard.canActivate(mockContext(fmUser, { params: { id: 'fac-2' } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(mockContext(mdUser, { params: { id: 'fac-2' } }))).toBe(true);
  });

  it('rejects duplicate employeeId registration within an organization', async () => {
    const mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'existing-id' }] }),
    } as any;
    const redis = new RedisService();
    const audit = new AuditService({ isDatabaseConfigured: () => false } as any);
    const authService = new AuthService(mockDb, redis, audit);

    await expect(
      authService.register({
        employeeId: 'EMP-100',
        name: 'Duplicate User',
        email: 'dup@stitchflow.com',
        password: 'Password123!',
        organizationId: '11111111-1111-1111-1111-111111111111',
        factoryId: '22222222-2222-2222-2222-222222222201',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('redacts sensitive secrets/passwords in AuditService', () => {
    const audit = new AuditService({ isDatabaseConfigured: () => false } as any);
    const clean = audit.redact({
      employeeId: 'EMP-1042',
      password: 'plain-password',
      nested: { token: 'jwt-secret', role: 'operator' },
    });
    expect(clean).toEqual({
      employeeId: 'EMP-1042',
      password: '[REDACTED]',
      nested: { token: '[REDACTED]', role: 'operator' },
    });
  });

  it('still enforces rate limiting via in-memory fallback when Redis is unavailable', async () => {
    const redis = new RedisService();
    expect(redis.isAvailable()).toBe(false);
    expect(await redis.checkRateLimit('sf:rl:login:test', 2, 60)).toBe(true);
    expect(await redis.checkRateLimit('sf:rl:login:test', 2, 60)).toBe(true);
    expect(await redis.checkRateLimit('sf:rl:login:test', 2, 60)).toBe(false);
  });
});
