# StitchFlow — Security Model

1. **Supabase Auth JWT Verification**: Every protected endpoint verifies the Bearer JWT against Supabase Auth / JWKS (`JwtAuthGuard`), checking signature, expiration, and active `profiles.account_status === 'active'`.
2. **Server-Side RBAC & Factory Isolation**: `PermissionsGuard` and `FactoryScopeGuard` verify role permissions and organization/factory/unit/line scope on the server. Frontend route guards are UX-only.
3. **Controlled Employee Registration**: Self-registration creates a `pending` profile with no active operational access until approved by an authorized Factory Manager or MD. Duplicate detection uses `UNIQUE(organization_id, employee_id)` and unique `auth.users.email`.
4. **PostgreSQL Row Level Security (RLS)**: Every tenant/factory table enables RLS using `auth.uid()` helper functions (`current_org_id()`, `has_factory_access()`, `has_permission()`).
5. **Redis Caching & Rate Limiting**: Caches non-sensitive master/profile lookups with tenant-scoped keys and short TTLs. Role or status updates immediately purge cached permissions. Redis outages degrade gracefully to PostgreSQL without bypassing authorization.
6. **Immutable Audit Logs**: `audit_logs` is append-only (UPDATE/DELETE blocked by database trigger/policy) and redacts passwords, tokens, and secrets.
7. **Credential Hygiene**: `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` live strictly in `backend/.env` and are never exposed to the Expo client.

## Employee enrollment and permission freshness

The reviewed employee enrollment migration adds a roster keyed by organization and employee ID. An authorized administrator must provision the employee ID, normalized email and eligible factory before public registration. A caller-supplied role never grants access. Activation remains a separate management action, and unverified accounts cannot log in, refresh sessions or use protected routes. Registration writes the pending profile, assignment and audit event in one PostgreSQL transaction, and attempts cleanup of the new Auth identity if registration fails.

Supabase verifies the access token before the API checks project issuer, subject, audience and expiration. Protected requests read current account status, permissions and active organization-scoped factory assignments from PostgreSQL, avoiding stale permissions after a failed Redis invalidation. Redis still supports rate limiting. Logout requests revoke the current Supabase refresh session. JWTs already issued may remain valid until expiration.

Roster provisioning UI, expanded department and designation verification, and live confirmation-email delivery are still pending. The existing staff seed does not populate the real employee roster.
