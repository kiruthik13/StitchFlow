BEGIN;
CREATE TABLE public.job_route_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 32),
  stage_code text NOT NULL CHECK (stage_code ~ '^[a-z][a-z0-9-]{0,31}$'),
  line_id uuid NOT NULL REFERENCES public.production_lines(id),
  role_code text NOT NULL REFERENCES public.roles(code) CHECK (role_code IN ('operator', 'supervisor')),
  UNIQUE (job_id, ordinal),
  UNIQUE (job_id, id)
);

CREATE TABLE public.job_step_assignments (
  step_id uuid NOT NULL REFERENCES public.job_route_steps(id),
  assignment_id uuid NOT NULL REFERENCES public.user_assignments(id),
  PRIMARY KEY (step_id, assignment_id)
);

CREATE TABLE public.job_quality_assignments (
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  assignment_id uuid NOT NULL REFERENCES public.user_assignments(id),
  duty text NOT NULL CHECK (duty IN ('qc', 'rework', 'packing')),
  PRIMARY KEY (job_id, assignment_id, duty)
);

CREATE TABLE public.bundle_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  step_id uuid NOT NULL REFERENCES public.job_route_steps(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, step_id),
  UNIQUE (actor_id, request_id)
);

CREATE TABLE public.bundle_quality_balances (
  bundle_id uuid PRIMARY KEY REFERENCES public.bundles(id),
  inspected integer NOT NULL DEFAULT 0 CHECK (inspected >= 0),
  passed integer NOT NULL DEFAULT 0 CHECK (passed >= 0),
  rejected integer NOT NULL DEFAULT 0 CHECK (rejected >= 0),
  rework integer NOT NULL DEFAULT 0 CHECK (rework >= 0),
  held integer NOT NULL DEFAULT 0 CHECK (held >= 0),
  reworked integer NOT NULL DEFAULT 0 CHECK (reworked BETWEEN 0 AND rework),
  released integer NOT NULL DEFAULT 0 CHECK (released BETWEEN 0 AND passed),
  CHECK (inspected = passed + rejected + rework + held)
);

CREATE TABLE public.bundle_quality_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('inspection','rework','reinspection','release')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id)
);

CREATE TABLE public.bundle_cartons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text UNIQUE NOT NULL DEFAULT ('CTN-' || replace(gen_random_uuid()::text, '-', '')),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id)
);
CREATE INDEX bundle_cartons_bundle ON public.bundle_cartons(bundle_id);

CREATE TABLE public.carton_store_receipts (
  carton_id uuid PRIMARY KEY REFERENCES public.bundle_cartons(id),
  received_by uuid NOT NULL REFERENCES public.profiles(id),
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.carton_dispatch (
  carton_id uuid PRIMARY KEY REFERENCES public.bundle_cartons(id),
  approved_by uuid NOT NULL REFERENCES public.profiles(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  dispatched_by uuid REFERENCES public.profiles(id),
  dispatched_at timestamptz,
  gate_pass uuid UNIQUE,
  CHECK ((dispatched_at IS NULL AND dispatched_by IS NULL AND gate_pass IS NULL)
    OR (dispatched_at IS NOT NULL AND dispatched_by IS NOT NULL AND gate_pass IS NOT NULL AND dispatched_by <> approved_by))
);

ALTER TABLE public.job_route_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_step_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_quality_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_quality_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_quality_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_cartons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carton_store_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carton_dispatch ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_route_steps, public.job_step_assignments, public.job_quality_assignments, public.bundle_stage_events,
  public.bundle_quality_balances, public.bundle_quality_events, public.bundle_cartons, public.carton_store_receipts, public.carton_dispatch
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bundle_stage_events_history BEFORE UPDATE OR DELETE ON public.bundle_stage_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE TRIGGER bundle_quality_events_history BEFORE UPDATE OR DELETE ON public.bundle_quality_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE TRIGGER bundle_cartons_history BEFORE UPDATE OR DELETE ON public.bundle_cartons
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE TRIGGER carton_store_receipts_history BEFORE UPDATE OR DELETE ON public.carton_store_receipts
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
COMMIT;
