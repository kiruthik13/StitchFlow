import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterEmployeeDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const allowed = await this.redis.checkRateLimit(`sf:rl:login:${dto.email.toLowerCase()}`, 10, 60);
    if (!allowed) {
      throw new HttpException(
        { errorCode: 'ERR_RATE_LIMITED', message: 'Too many login attempts. Please wait a minute.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const supabase = this.db.getSupabasePublic();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException({
        errorCode: 'ERR_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!data.user.email_confirmed_at) {
      throw new ForbiddenException({ errorCode: 'ERR_EMAIL_UNVERIFIED', message: 'Verify your email before continuing' });
    }

    const profileRes = await this.db.query<{
      id: string;
      organization_id: string;
      employee_id: string;
      name: string;
      role_code: string;
      account_status: string;
    }>(
      `SELECT id, organization_id, employee_id, name, role_code, account_status
       FROM public.profiles WHERE id = $1`,
      [data.user.id],
    );

    const profile = profileRes.rows[0];
    if (!profile) {
      throw new UnauthorizedException({
        errorCode: 'ERR_PROFILE_NOT_FOUND',
        message: 'Employee profile not found',
      });
    }

    if (profile.account_status !== 'active') {
      throw new ForbiddenException({
        errorCode: 'ERR_ACCOUNT_INACTIVE',
        message: `Account status is ${profile.account_status}. Approval required.`,
      });
    }

    await this.audit.record({
      organizationId: profile.organization_id,
      actorId: profile.id,
      actorEmployeeId: profile.employee_id,
      actorName: profile.name,
      actorRole: profile.role_code,
      action: 'AUTH_LOGIN',
      entityType: 'profile',
      entityId: profile.id,
      result: 'success',
    });

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: profile.id,
        employeeId: profile.employee_id,
        name: profile.name,
        role: profile.role_code,
        organizationId: profile.organization_id,
      },
    };
  }

  async register(dto: RegisterEmployeeDto) {
    const allowed = await this.redis.checkRateLimit(`sf:rl:reg:${dto.email.toLowerCase()}`, 5, 300);
    if (!allowed) {
      throw new HttpException(
        { errorCode: 'ERR_RATE_LIMITED', message: 'Too many registration attempts.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Prevent duplicate employeeId in the same organization before creating auth user
    const existing = await this.db.query(
      `SELECT id FROM public.profiles WHERE organization_id = $1 AND employee_id = $2`,
      [dto.organizationId, dto.employeeId],
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        errorCode: 'ERR_DUPLICATE_EMPLOYEE_ID',
        message: 'An employee with this ID already exists in the organization',
      });
    }

    const enrollment = await this.db.query(
      `SELECT 1 FROM public.employee_enrollment e
       JOIN public.factories f ON f.id = e.factory_id AND f.organization_id = e.organization_id AND f.is_active
       JOIN public.organizations o ON o.id = e.organization_id AND o.is_active
       WHERE e.organization_id = $1 AND e.employee_id = $2 AND e.factory_id = $3 AND e.email = $4 AND e.is_active`,
      [dto.organizationId, dto.employeeId, dto.factoryId, dto.email.toLowerCase()],
    );
    if (!enrollment.rows.length) {
      throw new ForbiddenException({ errorCode: 'ERR_ENROLLMENT_REQUIRED', message: 'Employee enrollment could not be verified' });
    }

    const admin = this.db.getSupabaseAdmin();
    const email = dto.email.toLowerCase();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: dto.password,
      email_confirm: false,
    });
    if (error || !created.user) {
      throw new BadRequestException({ errorCode: 'ERR_REGISTRATION_FAILED', message: 'Unable to register employee' });
    }
    const userId = created.user.id;
    const roleCode = 'operator';

    try {
      await this.db.withTransaction(async client => {
        const profile = await client.query(
          `INSERT INTO public.profiles (
             id, organization_id, employee_id, name, email, phone, designation, role_code, account_status
           )
           SELECT $1, e.organization_id, e.employee_id, $5, e.email, $6, $7, 'operator', 'pending'
           FROM public.employee_enrollment e
           JOIN public.factories f ON f.id = e.factory_id AND f.organization_id = e.organization_id AND f.is_active
           JOIN public.organizations o ON o.id = e.organization_id AND o.is_active
           WHERE e.organization_id = $2 AND e.employee_id = $3 AND e.factory_id = $4 AND e.email = $8 AND e.is_active
           FOR SHARE OF e, f, o RETURNING id`,
          [userId, dto.organizationId, dto.employeeId, dto.factoryId, dto.name, dto.phone ?? null, dto.designation ?? null, email],
        );
        if (!profile.rowCount) {
          throw new ForbiddenException({ errorCode: 'ERR_ENROLLMENT_REQUIRED', message: 'Employee enrollment could not be verified' });
        }
        await client.query(
          `INSERT INTO public.user_assignments (profile_id, factory_id, is_primary, is_active)
           VALUES ($1, $2, TRUE, TRUE)`,
          [userId, dto.factoryId],
        );
        await client.query(
          `INSERT INTO public.audit_logs (organization_id, factory_id, actor_id, actor_employee_id,
             actor_name, actor_role, action, entity_type, entity_id, new_values)
           VALUES ($1, $2, $3, $4, $5, $6, 'AUTH_REGISTER_PENDING', 'profile', $3::uuid::text, $7)`,
          [dto.organizationId, dto.factoryId, userId, dto.employeeId, dto.name, roleCode,
            JSON.stringify({ accountStatus: 'pending' })],
        );
      });
    } catch (error) {
      // Auth and PostgreSQL are separate operations. Never delete an identity that has a committed profile.
      try {
        const committed = await this.db.query('SELECT 1 FROM public.profiles WHERE id = $1', [userId]);
        if (committed.rows.length === 0) {
          const cleanup = await admin.auth.admin.deleteUser(userId);
          if (cleanup.error) this.logger.error('Could not roll back an unlinked employee authentication identity');
        } else {
          throw error;
        }
      } catch {
        this.logger.error('Employee registration outcome requires reconciliation');
      }
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException({ errorCode: 'ERR_DUPLICATE_EMPLOYEE_ID', message: 'Employee enrollment is already registered' });
      }
      throw error;
    }

    try {
      const confirmation = await this.db.getSupabasePublic().auth.resend({ type: 'signup', email });
      if (confirmation.error) this.logger.warn('Employee verification email delivery requires attention');
    } catch {
      this.logger.warn('Employee verification email request failed');
    }

    return {
      id: created.user.id,
      employeeId: dto.employeeId,
      accountStatus: 'pending',
      message: 'Registration submitted for management approval.',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const supabase = this.db.getSupabasePublic();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });
    if (error || !data.session || !data.user?.email_confirmed_at) {
      throw new UnauthorizedException({
        errorCode: 'ERR_INVALID_REFRESH_TOKEN',
        message: 'Session refresh failed',
      });
    }
    const profile = await this.db.query(
      `SELECT 1 FROM public.profiles WHERE id = $1 AND account_status = 'active'`, [data.user.id],
    );
    if (profile.rows.length === 0) {
      throw new ForbiddenException({ errorCode: 'ERR_ACCOUNT_INACTIVE', message: 'Account approval is required' });
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const supabase = this.db.getSupabasePublic();
    await supabase.auth.resetPasswordForEmail(dto.email);
    return { message: 'If an account exists for this email, a password reset link has been sent.' };
  }

  async logout(userId: string, accessToken: string) {
    const { error } = await this.db.getSupabaseAdmin().auth.admin.signOut(accessToken, 'local');
    if (error) {
      throw new HttpException({ errorCode: 'ERR_LOGOUT_FAILED', message: 'Unable to revoke the session' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    await this.redis.invalidateUserAuthCache(userId);
    return { message: 'Logged out successfully' };
  }
}
