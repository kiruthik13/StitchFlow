BEGIN;

CREATE TABLE public.employee_enrollment (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  employee_id text NOT NULL CHECK (length(btrim(employee_id)) BETWEEN 2 AND 64),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  email text NOT NULL CHECK (email = lower(btrim(email))),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (organization_id, employee_id),
  UNIQUE (organization_id, email)
);

ALTER TABLE public.employee_enrollment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_enrollment FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_factory_access(target_factory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.factories f ON f.id = target_factory_id
      AND f.organization_id = p.organization_id AND f.is_active
    WHERE p.id = auth.uid() AND p.account_status = 'active'
      AND (p.role_code = 'md' OR EXISTS (
        SELECT 1 FROM public.user_assignments a
        WHERE a.profile_id = p.id AND a.factory_id = f.id AND a.is_active
      ))
  );
$$;

DROP POLICY profile_read_own_or_org ON public.profiles;
CREATE POLICY profile_read_own_or_org ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() OR (
    organization_id = public.current_user_org_id() AND (
      public.current_user_role() = 'md' OR (
        public.current_user_role() IN ('factory-manager', 'supervisor')
        AND EXISTS (
          SELECT 1 FROM public.user_assignments a
          WHERE a.profile_id = profiles.id AND a.is_active
          AND public.has_factory_access(a.factory_id)
        )
      )
    )
  )
);

DROP POLICY audit_read_management ON public.audit_logs;
CREATE POLICY audit_read_management ON public.audit_logs FOR SELECT TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND (public.current_user_role() = 'md' OR (
    public.current_user_role() IN ('factory-manager', 'supervisor')
    AND public.has_factory_access(factory_id)
  ))
);

COMMIT;
