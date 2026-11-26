BEGIN;

CREATE TABLE public.production_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  category text NOT NULL CHECK (category IN ('machine', 'needle', 'fabric', 'power', 'trims', 'other')),
  machine_code text NOT NULL CHECK (length(btrim(machine_code)) BETWEEN 1 AND 80),
  stoppage_minutes integer NOT NULL DEFAULT 0 CHECK (stoppage_minutes BETWEEN 0 AND 10080),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE public.work_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  operator_name text NOT NULL CHECK (length(btrim(operator_name)) BETWEEN 1 AND 160),
  operator_employee_id text CHECK (operator_employee_id IS NULL OR length(btrim(operator_employee_id)) <= 64),
  stage_name text NOT NULL CHECK (length(btrim(stage_name)) BETWEEN 1 AND 80),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX production_issues_factory_idx ON public.production_issues (factory_id, status, created_at DESC);
CREATE INDEX work_assignments_factory_idx ON public.work_assignments (factory_id, created_at DESC);

ALTER TABLE public.production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.production_issues, public.work_assignments FROM PUBLIC, anon, authenticated;

COMMIT;
