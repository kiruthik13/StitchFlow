BEGIN;
CREATE TABLE public.cutting_assignments (
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  assignment_id uuid NOT NULL REFERENCES public.user_assignments(id),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (job_id, assignment_id)
);

CREATE TABLE public.cutting_output_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  assignment_id uuid NOT NULL REFERENCES public.user_assignments(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  producing_line_id uuid NOT NULL REFERENCES public.production_lines(id),
  shift_type text NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night')),
  request_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id)
);
CREATE INDEX cutting_output_bundle ON public.cutting_output_events(bundle_id);
ALTER TABLE public.cutting_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_output_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cutting_assignments, public.cutting_output_events FROM anon, authenticated;
CREATE TRIGGER cutting_output_immutable BEFORE UPDATE OR DELETE ON public.cutting_output_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
COMMIT;
