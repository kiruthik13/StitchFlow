# StitchFlow — Phase 1 Supabase Migration Security Review

**Reviewed Files**:
- `supabase/migrations/202611260001_phase1_org_auth_audit.sql`
- `supabase/seed.sql`
- `supabase/config.toml`

## Findings & Hardening Applied

1. **SECURITY DEFINER Search-Path & Execution Grants**:
   - *Finding*: Initial helper functions (`current_user_org_id`, `current_user_role`, `has_factory_access`) lacked `SET search_path = public, pg_temp` and explicit `REVOKE ALL ... FROM PUBLIC`.
   - *Fix*: Added `SET search_path = public, pg_temp` to all three functions and restricted `EXECUTE` exclusively to `authenticated, service_role`.
2. **Complete RLS Coverage Across All Tables**:
   - *Finding*: `workstations`, `shifts`, `roles`, `permissions`, and `role_permissions` had RLS enabled or were exposed without explicit `SELECT` policies.
   - *Fix*: Enabled RLS on all 13 tables in `public` and added scoped `SELECT` policies (`workstation_read_scoped`, `shift_read_scoped`, `rbac_catalog_read`, etc.).
3. **No Recursive RLS Policies**:
   - `profile_read_own_or_org` calls `current_user_org_id()` and `current_user_role()`, which are `SECURITY DEFINER` reading `profiles` without re-triggering RLS recursion.
4. **Pending / Suspended / Rejected Account Enforcement**:
   - `current_user_org_id()`, `current_user_role()`, and `has_factory_access()` all filter `AND account_status = 'active'`, so `pending`, `suspended`, and `rejected` accounts receive zero organization or factory rows via RLS.
5. **No Client-Side Privilege Escalation or Audit Forgery**:
   - `profiles`, `user_assignments`, and `audit_logs` have **no `INSERT`, `UPDATE`, or `DELETE` policies for `authenticated`**, preventing direct PostgREST tampering with `role_code`, `account_status`, or `actor_id`.
   - `trg_audit_logs_immutable` blocks `UPDATE` and `DELETE` on `audit_logs` even for privileged database roles.
6. **Duplicate Employee Prevention**:
   - Enforced at the database level via `UNIQUE (organization_id, employee_id)` and `email TEXT NOT NULL UNIQUE`.
7. **Audit Unit Context**:
   - Added `unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT` to `audit_logs` alongside `organization_id` and `factory_id`.

## Execution Plan (Awaiting Approval)
1. Apply `supabase/migrations/202611260001_phase1_org_auth_audit.sql` to Supabase project `zmxwdzbapuiwhqtldrtm` (`ap-south-1`).
2. Seed `roles`, `permissions`, and `role_permissions` (keeping synthetic dev org/factories isolated from production).
3. Run live integration tests against `zmxwdzbapuiwhqtldrtm`.

> **Remote Migration Status**: NOT applied to remote Supabase yet. Awaiting explicit user approval.
