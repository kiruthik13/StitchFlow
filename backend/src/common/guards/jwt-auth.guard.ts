import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { loadEnv } from '../../config/env.config';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { DatabaseService } from '../../database/database.service';
import { AuthenticatedUser, RoleCode, AccountStatus } from '../types/auth-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        errorCode: 'ERR_MISSING_TOKEN',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.slice(7).trim();
    const supabase = this.db.getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user || !this.matchesProjectClaims(token, data.user.id)) {
      throw new UnauthorizedException({
        errorCode: 'ERR_INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      });
    }

    if (!data.user.email_confirmed_at) {
      throw new ForbiddenException({ errorCode: 'ERR_EMAIL_UNVERIFIED', message: 'Verify your email before continuing' });
    }
    const authUser = await this.loadUserFromDb(data.user.id, data.user.email || '');

    if (authUser.accountStatus !== 'active') {
      throw new ForbiddenException({
        errorCode: 'ERR_ACCOUNT_INACTIVE',
        message: `Account is currently ${authUser.accountStatus}`,
      });
    }

    request.user = authUser;
    return true;
  }

  private matchesProjectClaims(token: string, userId: string): boolean {
    // Supabase has authenticated this exact token before we check its application claims.
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      const issuer = new URL('/auth/v1', loadEnv().supabaseUrl).href;
      return payload.iss === issuer && payload.sub === userId && payload.aud === 'authenticated'
        && Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }

  private async loadUserFromDb(userId: string, email: string): Promise<AuthenticatedUser> {
    const profileRes = await this.db.query<{
      id: string;
      email: string;
      employee_id: string;
      name: string;
      role_code: RoleCode;
      account_status: AccountStatus;
      organization_id: string;
    }>(
      `SELECT id, email, employee_id, name, role_code, account_status, organization_id
       FROM public.profiles
       WHERE id = $1`,
      [userId],
    );

    if (profileRes.rows.length === 0) {
      throw new UnauthorizedException({
        errorCode: 'ERR_PROFILE_NOT_FOUND',
        message: 'Employee profile not found',
      });
    }

    const profile = profileRes.rows[0];

    const permRes = await this.db.query<{ permission_code: string }>(
      `SELECT permission_code FROM public.role_permissions WHERE role_code = $1`,
      [profile.role_code],
    );

    const assignRes = await this.db.query<{
      factory_id: string;
      line_id: string | null;
      is_primary: boolean;
    }>(
      `SELECT a.factory_id, a.line_id, a.is_primary
       FROM public.user_assignments a
       JOIN public.factories f ON f.id = a.factory_id AND f.is_active AND f.organization_id = $2
       WHERE a.profile_id = $1 AND a.is_active`,
      [userId, profile.organization_id],
    );

    const primary = assignRes.rows.find((r) => r.is_primary) || assignRes.rows[0];

    return {
      id: profile.id,
      email: profile.email || email,
      employeeId: profile.employee_id,
      name: profile.name,
      role: profile.role_code,
      accountStatus: profile.account_status,
      organizationId: profile.organization_id,
      assignedFactoryIds: [...new Set(assignRes.rows.map((r) => r.factory_id))],
      primaryFactoryId: primary?.factory_id,
      primaryLineId: primary?.line_id ?? undefined,
      permissions: permRes.rows.map((r) => r.permission_code),
    };
  }
}
