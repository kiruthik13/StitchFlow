-- StitchFlow Phase 1 Migration: Organization Hierarchy, Auth Profiles, RBAC, Assignments & Immutable Audit Logs
-- Prepared for review; do NOT run against production without explicit authorization.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organization Hierarchy
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_lines INTEGER NOT NULL DEFAULT 0 CHECK (total_lines >= 0),
  active_lines INTEGER NOT NULL DEFAULT 0 CHECK (active_lines >= 0 AND active_lines <= total_lines),
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, code)
);

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, code)
);

CREATE TABLE IF NOT EXISTS public.production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity > 0),
  stages TEXT[] NOT NULL DEFAULT ARRAY['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, code)
);

CREATE TABLE IF NOT EXISTS public.workstations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  machine_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (line_id, code)
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE RESTRICT,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 30 CHECK (break_minutes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (factory_id, shift_type)
);

-- 2. RBAC Catalog
CREATE TABLE IF NOT EXISTS public.roles (
  code TEXT PRIMARY KEY CHECK (code IN (
    'md', 'factory-manager', 'supervisor', 'operator', 'qc-inspector', 'store-dispatch', 'packing-staff'
  )),
  display_name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_code TEXT NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- 3. Employee Profiles & Assignments
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  designation TEXT,
  role_code TEXT NOT NULL REFERENCES public.roles(code) ON DELETE RESTRICT,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
  line_id UUID REFERENCES public.production_lines(id) ON DELETE RESTRICT,
  workstation_id UUID REFERENCES public.workstations(id) ON DELETE RESTRICT,
  shift_type TEXT NOT NULL DEFAULT 'morning' CHECK (shift_type IN ('morning', 'afternoon', 'night')),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_assignments_profile ON public.user_assignments(profile_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_assignments_factory ON public.user_assignments(factory_id) WHERE is_active = TRUE;

-- 4. Append-Only Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_employee_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_values JSONB,
  new_values JSONB,
  reason TEXT,
  result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'denied', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_factory_created ON public.audit_logs(factory_id, created_at DESC);

-- Prevent UPDATE or DELETE on audit_logs (immutable append-only)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 5. Helper Security Functions for RLS (hardened search_path & explicit execute grants)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND account_status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role_code FROM public.profiles WHERE id = auth.uid() AND account_status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.has_factory_access(target_factory_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_status = 'active'
      AND (
        p.role_code = 'md'
        OR EXISTS (
          SELECT 1 FROM public.user_assignments ua
          WHERE ua.profile_id = p.id
            AND ua.factory_id = target_factory_id
            AND ua.is_active = TRUE
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_factory_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_factory_access(UUID) TO authenticated, service_role;

-- 6. Enable Row Level Security on ALL exposed tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Read-only for authenticated users within active org/factory scope; mutations strictly via backend service_role)
CREATE POLICY org_read_own ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_user_org_id());

CREATE POLICY factory_read_scoped ON public.factories
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.has_factory_access(id)
  );

CREATE POLICY unit_read_scoped ON public.units
  FOR SELECT TO authenticated
  USING (public.has_factory_access(factory_id));

CREATE POLICY dept_read_scoped ON public.departments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id AND public.has_factory_access(u.factory_id)
    )
  );

CREATE POLICY line_read_scoped ON public.production_lines
  FOR SELECT TO authenticated
  USING (public.has_factory_access(factory_id));

CREATE POLICY workstation_read_scoped ON public.workstations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.production_lines pl
      WHERE pl.id = line_id AND public.has_factory_access(pl.factory_id)
    )
  );

CREATE POLICY shift_read_scoped ON public.shifts
  FOR SELECT TO authenticated
  USING (public.has_factory_access(factory_id));

CREATE POLICY rbac_catalog_read ON public.roles
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY permissions_catalog_read ON public.permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY role_permissions_catalog_read ON public.role_permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY profile_read_own_or_org ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      organization_id = public.current_user_org_id()
      AND public.current_user_role() IN ('md', 'factory-manager', 'supervisor')
    )
  );

CREATE POLICY assignment_read_own_or_scoped ON public.user_assignments
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.has_factory_access(factory_id)
  );

CREATE POLICY audit_read_management ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('md', 'factory-manager', 'supervisor')
    AND (factory_id IS NULL OR public.has_factory_access(factory_id))
  );
