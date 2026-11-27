# StitchFlow — Database Migration Review & Status

**Last Verified:** 2026-11-27  
**Source of Truth:** [supabase/migrations/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/supabase/migrations) and [backend/src/scripts/migrate-up.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/src/scripts/migrate-up.ts)

---

## 1. Historical Phase 1 Security Review (Preserved)

**Reviewed Files:** `supabase/migrations/202611260001_phase1_org_auth_audit.sql`, `supabase/seed.sql`, `supabase/config.toml`

1. **SECURITY DEFINER Search-Path & Execution Grants**: Added `SET search_path = public, pg_temp` to `current_user_org_id()`, `current_user_role()`, and `has_factory_access()`, restricting `EXECUTE` to `authenticated, service_role`.
2. **Complete RLS Coverage**: Enabled RLS on all Phase 1 tables with scoped `SELECT` policies.
3. **No Recursive RLS Policies**: Helper functions read `profiles` as `SECURITY DEFINER`.
4. **Account Status Enforcement**: Helper functions filter `AND account_status = 'active'`, blocking `pending`, `suspended`, and `rejected` accounts.
5. **No Client-Side Privilege Escalation or Audit Forgery**: `profiles`, `user_assignments`, and `audit_logs` deny direct `INSERT`/`UPDATE`/`DELETE` from `authenticated`; `trg_audit_logs_immutable` prevents `audit_logs` mutation.
6. **Duplicate Employee Prevention**: `UNIQUE (organization_id, employee_id)` and `email TEXT NOT NULL UNIQUE`.
7. **Audit Unit Context**: `unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT` added to `audit_logs`.

---

## 2. Complete Migration Inventory & Verification Status

| Range | Migration Files in Repo (`supabase/migrations/`) | Repo Status | Local Jest / SQL Check | Remote Supabase & Deployed App Status |
|---|---|---|---|---|
| **0001** | `202611260001_phase1_org_auth_audit.sql` | Present | Mocked in `phase1-security.spec.ts` | Applied to live Supabase; verified with live logins & FactoryScope checks |
| **0002–0004** | `0002_phase2_job_foundation.sql`, `0003_phase1_employee_enrollment_scope.sql`, `0004_phase2_approval_bundle_identity.sql` | Present | Mocked in `jobs.spec.ts`, `employee-enrollment.spec.ts`, `phase2-completion.spec.ts` | Applied to live Supabase; verified via live factory/job/user flows |
| **0005–0007** | `0005_phase3_cutting_output.sql`, `0006_phase5_cut_stock_handovers.sql`, `0007_routed_production_quality_packing.sql` | Present | Mocked in `cutting-output.spec.ts`, `cut-stock.spec.ts`, `routed-workflow.spec.ts` | Applied in production DB; physical-device scan/QC/packing E2E pending |
| **0008–0012** | `0008_private_factory_updates.sql` – `0012_quality_measurements_and_evidence.sql` | Present | Mocked in `job-closing-and-recovery.spec.ts`, `quality-evidence.spec.ts` | Present in repo; remote schema parity should be verified via `migrate:up` |
| **0013–0017** | `0013_raw_material_inventory.sql` – `0017_raw_transfer_discrepancies.sql` | Present | Mocked in `stock-shipment-report.spec.ts` | Present in repo; remote schema parity should be verified via `migrate:up` |
| **0018–0022** | `0018_phase2_specialized_masters.sql` – `0022_phase6_planning_intelligence.sql` | Present | Mocked in `phase2/3/4/5/6-completion.spec.ts` | Present in repo; remote schema parity should be verified via `migrate:up` |

> **Important**: Automated Jest suites mock database connections. Running `node --env-file=.env dist/scripts/migrate-up.js` and `verify-live-e2e.js` against the target environment is required to confirm all 22 migrations are applied in any new or staging database.
