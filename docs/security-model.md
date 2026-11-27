# StitchFlow — Security Model

**Last Verified:** 2026-11-27  
**Source of Truth:** [backend/src/common/guards/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/src/common/guards), [backend/src/modules/auth/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/src/modules/auth), and [supabase/migrations/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/supabase/migrations).

1. **Supabase Auth JWT Verification**: Every protected endpoint verifies the Bearer JWT against Supabase Auth (`JwtAuthGuard`), checking signature, issuer, subject, audience, expiration, verified email, and active `profiles.account_status === 'active'`.
2. **Server-Side RBAC & Factory Isolation**: `PermissionsGuard` and `FactoryScopeGuard` verify role permissions and organization/factory/unit/line scope on the server. `FactoryScopeGuard` inspects `baseUrl || originalUrl || path` to enforce factory scoping on `/factories` routes (returning HTTP 403 on cross-factory access by non-MD users). Frontend route guards are UX-only.
3. **Controlled Employee Registration**: Self-registration (`POST /api/v1/auth/register`) requires a pre-enrolled roster entry in `employee_enrollment` (`UNIQUE(organization_id, employee_id)` and unique email). A caller-supplied role never grants access; registration creates a `pending` profile that must be approved by an authorized MD or Factory Manager.
4. **PostgreSQL Row Level Security (RLS)**: Tenant/factory tables enable RLS using `SECURITY DEFINER` helper functions (`current_user_org_id()`, `current_user_role()`, `has_factory_access()`) with `SET search_path = public, pg_temp`.
5. **Redis Caching & Rate Limiting**: Caches non-sensitive lookups with tenant-scoped keys and short TTLs, and rate-limits login/API requests. Protected requests read current account status, permissions, and factory assignments from PostgreSQL to prevent stale permissions. Redis outages degrade gracefully to PostgreSQL without bypassing authorization.
6. **Immutable Audit Logs**: `audit_logs` is append-only (`trg_audit_logs_immutable` blocks `UPDATE`/`DELETE`) and redacts passwords, tokens, and secrets.
7. **Private Quality Photo Storage**: QC defect photos are stored in the private `stitchflow-qc-evidence` Supabase Storage bucket. Direct authenticated/anonymous bucket access is blocked; authorized reads mint short-lived (60s) server-signed URLs.
8. **Credential Hygiene**: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `REDIS_URL` live strictly in backend environment variables and are never exposed to the Expo client.
